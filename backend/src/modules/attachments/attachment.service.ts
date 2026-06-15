import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { auditLog } from "../../common/middleware/audit.middleware";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "text/plain", "text/markdown",
    "application/zip",
    "application/json",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("File type not allowed", 400));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export async function listAttachments(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = req.params.taskId as string;
    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(attachments);
  } catch (error) {
    next(error);
  }
}

export async function uploadAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = req.params.taskId as string;
    const userId = req.userId!;
    const file = req.file;

    if (!file) throw new AppError("No file uploaded", 400);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new AppError("Task not found", 404);

    const attachment = await prisma.attachment.create({
      data: {
        filename: file.originalname,
        url: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
        taskId,
        uploadedById: userId,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    await prisma.event.create({
      data: {
        type: "ATTACHMENT",
        payload: { filename: file.originalname, size: file.size },
        taskId,
        userId,
      },
    });

    await auditLog("attachment", "Task", taskId, { filename: file.originalname, size: file.size });

    res.status(201).json(attachment);
  } catch (error) {
    next(error);
  }
}

export async function downloadAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new AppError("Attachment not found", 404);

    const filePath = path.join(process.cwd(), attachment.url);
    res.download(filePath, attachment.filename);
  } catch (error) {
    next(error);
  }
}

export async function deleteAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;

    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new AppError("Attachment not found", 404);

    const filePath = path.join(process.cwd(), attachment.url);
    await prisma.attachment.delete({ where: { id } });

    fs.unlink(filePath, (err) => {
      if (err) console.error("Failed to delete file from disk:", filePath, err);
    });

    await auditLog("delete", "Attachment", id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
