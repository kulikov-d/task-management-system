import { FastifyRequest, FastifyReply } from "fastify";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { auditLog } from "../../common/middleware/audit.middleware";

const ALLOWED_MIMES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "text/plain", "text/markdown",
  "application/zip",
  "application/json",
];

export async function listAttachments(request: FastifyRequest, reply: FastifyReply) {
  const { taskId } = request.params as { taskId: string };
  const attachments = await prisma.attachment.findMany({
    where: { taskId },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return reply.send(attachments);
}

export async function uploadAttachment(request: FastifyRequest, reply: FastifyReply) {
  const { taskId } = request.params as { taskId: string };
  const userId = request.userId!;

  const file = await request.file();
  if (!file) throw new AppError("No file uploaded", 400);

  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    throw new AppError("File type not allowed", 400);
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError("Task not found", 404);

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(file.filename);
  const savedFilename = `${uniqueSuffix}${ext}`;
  const filePath = path.join(process.cwd(), "uploads", savedFilename);

  let fileSize = 0;
  const fileStream = fs.createWriteStream(filePath);
  for await (const chunk of file.file) {
    fileSize += chunk.length;
    fileStream.write(chunk);
  }
  fileStream.end();
  await new Promise<void>((resolve) => fileStream.on("finish", resolve));

  const attachment = await prisma.attachment.create({
    data: {
      filename: file.filename,
      url: `/uploads/${savedFilename}`,
      mimeType: file.mimetype,
      size: fileSize,
      taskId,
      uploadedById: userId,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  await prisma.event.create({
    data: {
      type: "ATTACHMENT",
      payload: { filename: file.filename, size: fileSize },
      taskId,
      userId,
    },
  });

  await auditLog("attachment", "Task", taskId, { filename: file.filename, size: fileSize });

  return reply.code(201).send(attachment);
}

export async function downloadAttachment(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) throw new AppError("Attachment not found", 404);

  const filePath = path.join(process.cwd(), attachment.url);
  return reply
    .type("application/octet-stream")
    .header("Content-Disposition", `attachment; filename="${attachment.filename}"`)
    .send(fs.createReadStream(filePath));
}

export async function deleteAttachment(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) throw new AppError("Attachment not found", 404);

  const filePath = path.join(process.cwd(), attachment.url);
  await prisma.attachment.delete({ where: { id } });

  fs.unlink(filePath, (err) => {
    if (err) console.error("Failed to delete file from disk:", filePath, err);
  });

  await auditLog("delete", "Attachment", id);
  return reply.code(204).send();
}
