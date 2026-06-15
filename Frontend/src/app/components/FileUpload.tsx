import { useState, useEffect, useRef } from "react";
import { Upload, File, Trash2, Download, Loader2 } from "lucide-react";
import { attachmentsApi } from "../api/client";
import { formatFileSize } from "../utils/helpers";

interface FileUploadProps {
  taskId: string;
  onUploaded: () => void;
}

export function FileUpload({ taskId, onUploaded }: FileUploadProps) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = async () => {
    try {
      const list = await attachmentsApi.list(taskId);
      setAttachments(list);
    } catch (err) {
      console.error("Failed to load attachments:", err);
    }
  };

  useEffect(() => { loadAttachments(); }, [taskId]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await attachmentsApi.upload(taskId, file);
      await loadAttachments();
      onUploaded();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDelete = async (id: string) => {
    try {
      await attachmentsApi.delete(id);
      await loadAttachments();
    } catch (err) {
      console.error("Failed to delete attachment:", err);
    }
  };

  return (
    <div className="space-y-3">
      <div onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="flex items-center justify-center gap-2 p-4 rounded-lg cursor-pointer transition-all"
        style={{ border: `2px dashed ${dragOver ? "var(--primary)" : "var(--border)"}`, background: dragOver ? "var(--primary)" + "08" : "var(--background)" }}>
        {uploading ? (
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
        ) : (
          <Upload size={16} style={{ color: "var(--muted-foreground)" }} />
        )}
        <span style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
          {uploading ? "Загрузка..." : "Нажмите или перетащите файл"}
        </span>
        <input ref={inputRef} type="file" onChange={handleInputChange} className="hidden" />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((a: any) => (
            <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--muted)" }}>
              <File size={14} style={{ color: "var(--muted-foreground)" }} />
              <span style={{ flex: 1, color: "var(--foreground)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.filename}</span>
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.68rem", flexShrink: 0 }}>{formatFileSize(a.size)}</span>
              <a href={attachmentsApi.download(a.id)} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:opacity-70 transition-opacity" style={{ color: "var(--primary)" }}>
                <Download size={12} />
              </a>
              <button onClick={() => handleDelete(a.id)} className="p-1 rounded hover:opacity-70 transition-opacity" style={{ color: "#ef4444" }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
