import { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw, X } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase/storage";
import { useAuth } from "@/contexts/auth-context";

interface DropzoneProps {
  onUploadSuccess: (fileUrl: string, originalName: string, mimeType: string) => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
];

export function Dropzone({ onUploadSuccess }: DropzoneProps) {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<any>(null);

  const validateFile = (selectedFile: File): boolean => {
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setErrorMessage("Unsupported file type. Please upload a PDF, PNG, JPG, or DOCX.");
      setUploadState("error");
      return false;
    }
    // Limit to 5MB
    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage("File exceeds 5MB size limit.");
      setUploadState("error");
      return false;
    }
    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        uploadFile(droppedFile);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        uploadFile(selectedFile);
      }
    }
  };

  const uploadFile = (fileToUpload: File) => {
    if (!user?.id) {
      setErrorMessage("Authentication required to upload evidence.");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setProgress(0);
    setErrorMessage("");

    try {
      const storage = getFirebaseStorage();
      const fileId = `${Date.now()}_${fileToUpload.name.replace(/\s+/g, "_")}`;
      const storageRef = ref(storage, `checkins/${user.id}/${fileId}`);
      
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
      uploadTaskRef.current = uploadTask;

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(pct);
        },
        (error) => {
          console.error("Storage upload error:", error);
          setErrorMessage(error.message || "Failed to upload file to storage.");
          setUploadState("error");
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadState("success");
            onUploadSuccess(downloadUrl, fileToUpload.name, fileToUpload.type);
          } catch (err: any) {
            setErrorMessage("Failed to generate secure URL download link.");
            setUploadState("error");
          }
        }
      );
    } catch (err: any) {
      setErrorMessage(err.message || "File upload storage context lost.");
      setUploadState("error");
    }
  };

  const handleRetry = () => {
    if (file) {
      uploadFile(file);
    }
  };

  const handleReset = () => {
    setFile(null);
    setProgress(0);
    setUploadState("idle");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {uploadState === "idle" && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
            dragActive
              ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.1)] animate-pulse"
              : "border-white/10 hover:border-indigo-500/50 hover:bg-white/1"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            onChange={handleChange}
          />
          <UploadCloud className="h-8 w-8 text-indigo-400 mb-2.5" />
          <div className="text-xs font-semibold text-white/90">
            Drag & drop check-in evidence here, or click to upload
          </div>
          <div className="text-[10px] text-muted-foreground font-mono-metric mt-1">
            Supports PDF, PNG, JPG, DOCX (Max 5MB)
          </div>
        </div>
      )}

      {uploadState === "uploading" && (
        <div className="border border-white/5 bg-slate-950 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-indigo-400 shrink-0 animate-bounce" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{file?.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono-metric mt-0.5">
                Uploading to secure storage node...
              </div>
            </div>
            <span className="text-xs font-mono-metric text-indigo-300 font-bold shrink-0">
              {progress}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {uploadState === "success" && (
        <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-emerald-300 truncate">{file?.name}</div>
            <div className="text-[9px] uppercase tracking-wider text-emerald-400 font-mono-metric mt-0.5">
              Evidence secured successfully
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1 hover:bg-emerald-500/10 rounded text-emerald-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {uploadState === "error" && (
        <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-red-300">File upload failed</div>
              <p className="text-[10px] text-red-400 mt-1 leading-relaxed font-mono-metric">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="p-1 hover:bg-red-500/10 rounded text-red-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleRetry}
              className="btn-ghost border-red-500/20 text-red-400 hover:bg-red-500/10 text-[10px] py-1 px-2 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Retry Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
