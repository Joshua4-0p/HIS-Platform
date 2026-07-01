import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useDropzone } from "react-dropzone"
import {
  Download,
  FileText,
  Info,
  Loader2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function BulkUploadPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading]     = useState(false)
  const navigate = useNavigate()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code
      if (code === "file-too-large") {
        toast.error("File too large", { description: "Maximum file size is 10 MB." })
      } else {
        toast.error("Invalid file", { description: "Only .csv files are accepted." })
      }
    },
  })

  async function handleDownloadTemplate() {
    setDownloading(true)
    try {
      const token = localStorage.getItem("his_access_token")
      const res = await fetch(`${API_BASE}/bulk-upload/template`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const json = await res.json() as { templateUrl: string }

      // Redirect browser to the pre-signed S3 GET URL — triggers download
      const a = document.createElement("a")
      a.href = json.templateUrl
      a.download = "his-patient-template.csv"
      a.click()
    } catch {
      toast.error("Download failed", { description: "Could not fetch the CSV template. Try again." })
    } finally {
      setDownloading(false)
    }
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    try {
      const token = localStorage.getItem("his_access_token")

      // 1. Get a pre-signed PUT URL + job ID from the API
      const initRes = await fetch(`${API_BASE}/bulk-upload/presigned-url`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${token}`,
        },
      })
      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({})) as { error?: string }
        toast.error("Upload failed", { description: err.error ?? `Server error ${initRes.status}` })
        return
      }
      const { jobId, uploadUrl } = await initRes.json() as { jobId: string; uploadUrl: string }

      // 2. PUT the file directly to S3 using the pre-signed URL (bypasses 6 MB Lambda limit)
      const s3Res = await fetch(uploadUrl, {
        method:  "PUT",
        body:    file,
        headers: { "Content-Type": "text/csv" },
      })
      if (!s3Res.ok) {
        toast.error("S3 upload failed", { description: `Upload returned status ${s3Res.status}.` })
        return
      }

      // 3. Navigate to the status page — ingestion Lambda will have been triggered by S3
      navigate(`/bulk-upload/status/${jobId}`)
    } catch {
      toast.error("Upload error", { description: "An unexpected error occurred. Please try again." })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Bulk Patient Data Upload</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a completed CSV file to register multiple patients at once.
        </p>
      </div>

      {/* Step 1 — Download Template */}
      <div className="flex flex-col items-center rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <Download size={48} className="mb-4 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Step 1: Download the CSV Template</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Download the official HIS template and fill in your patient records. Do not modify the
          column headers — the upload will fail if headers are changed.
        </p>
        <Button
          variant="outline"
          onClick={handleDownloadTemplate}
          disabled={downloading}
          className="mt-6 gap-2 border-primary text-primary hover:bg-primary/5"
        >
          {downloading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {downloading ? "Fetching template…" : "Download CSV Template"}
        </Button>
      </div>

      {/* Step 2 — Upload */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Step 2: Upload Your Completed CSV
        </h2>

        {/* Drop zone or file-selected state */}
        {file ? (
          <div className="flex items-center justify-between rounded-lg border border-[#10B981] bg-[#10B981]/5 p-4">
            <div className="flex items-center gap-3">
              <FileText size={20} className="shrink-0 text-[#10B981]" />
              <div>
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              disabled={uploading}
              className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
            >
              <X size={12} /> Remove
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/60",
            )}
          >
            <input {...getInputProps()} />
            <div
              className={cn(
                "mb-4 flex size-16 items-center justify-center rounded-full transition-colors",
                isDragActive ? "bg-primary/10" : "bg-muted",
              )}
            >
              <Upload
                size={28}
                className={cn(isDragActive ? "text-primary" : "text-muted-foreground opacity-50")}
              />
            </div>
            <p className="text-sm font-medium text-foreground">Drag and drop your CSV file here</p>
            <p className="mt-1 text-sm text-muted-foreground">or click to browse files</p>
            <div className="mt-6 flex items-center gap-1.5 border-t border-border pt-5 text-xs text-muted-foreground">
              <Info size={14} />
              <span>Accepted format: .csv only · Maximum file size: 10 MB</span>
            </div>
          </div>
        )}

        {/* Upload button */}
        <Button
          className="mt-6 w-full gap-2"
          disabled={!file || uploading}
          onClick={handleUpload}
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? "Uploading…" : "Upload & Process"}
        </Button>
      </div>
    </div>
  )
}
