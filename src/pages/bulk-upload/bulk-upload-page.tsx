import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useDropzone } from "react-dropzone"
import {
  Download,
  FileText,
  Info,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function downloadTemplate() {
  const header =
    "full_name,date_of_birth,sex,phone,address,region,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship\n"
  const blob = new Blob([header], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "his_patient_upload_template.csv"
  a.click()
  URL.revokeObjectURL(url)
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null)
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

  function handleUpload() {
    if (!file) return
    navigate("/bulk-upload/status/job-001?state=processing")
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
          onClick={downloadTemplate}
          className="mt-6 gap-2 border-primary text-primary hover:bg-primary/5"
        >
          <Download size={16} /> Download CSV Template
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
              className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
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
        <Button className="mt-6 w-full gap-2" disabled={!file} onClick={handleUpload}>
          <Upload size={16} /> Upload &amp; Process
        </Button>
      </div>
    </div>
  )
}
