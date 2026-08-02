import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, X, CheckCircle, Loader2, Download, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

function downloadSampleTemplate() {
  const headers = [
    "CIN", "Name", "Status", "Class", "Category", "Sub Category",
    "Authorized Capital", "Paid Up Capital", "State", "City", "Pincode",
    "Email", "Phone", "Address", "ROC", "Country",
    "Incorporation Date", "Last AGM Date", "Last Balance Sheet Date"
  ];
  const sampleRows = [
    ["U12345MH2010PTC123456", "Acme Technologies Private Limited", "Active", "Private", "Company limited by shares", "Non-govt company", "1000000", "500000", "Maharashtra", "Mumbai", "400001", "info@acme.com", "9876543210", "123 Business Park, Andheri East", "RoC-Mumbai", "India", "2010-05-15", "2023-09-30", "2023-03-31"],
    ["U67890DL2015PLC654321", "Global Exports Limited", "Active", "Public", "Company limited by shares", "Non-govt company", "5000000", "2000000", "Delhi", "New Delhi", "110001", "contact@globalexports.com", "9123456789", "456 Trade Tower, Connaught Place", "RoC-Delhi", "India", "2015-01-20", "2023-09-30", "2023-03-31"]
  ];
  const csvContent = [headers, ...sampleRows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "company_upload_template.csv"; a.click();
  URL.revokeObjectURL(url);
}

interface UploadResult {
  totalRows: number;
  inserted: number;
  skipped: number;
  skippedDetails: { row: number; reason: string }[];
}

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "uploading" | "processing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
      setError(null);
      setProgress(0);
      setStage("idle");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/xml": [".xml"],
      "application/xml": [".xml"],
    },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024 * 1024, // 2 GB
    disabled: uploading,
  });

  const handleUpload = () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setStage("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    // Real upload progress (0 → 80%)
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 80);
        setProgress(pct);
        if (pct >= 80) setStage("processing");
      }
    });

    xhr.upload.addEventListener("load", () => {
      setProgress(85);
      setStage("processing");
    });

    xhr.addEventListener("load", () => {
      setUploading(false);
      setProgress(100);
      setStage("done");
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data: UploadResult = JSON.parse(xhr.responseText);
          setResult(data);
          queryClient.invalidateQueries({ queryKey: [api.companies.list.path] });
        } catch {
          setError("Unexpected server response. File may have been processed — check the directory.");
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          setError(err.message || "Upload failed. Please try again.");
        } catch {
          setError(`Server error (${xhr.status}). Please try again.`);
        }
      }
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      setStage("idle");
      setError("Network error — upload failed. Check your connection and try again.");
    });

    xhr.addEventListener("timeout", () => {
      setUploading(false);
      setStage("idle");
      setError("Upload timed out. Try splitting the file into smaller chunks (50,000 rows each).");
    });

    xhr.open("POST", api.companies.upload.path);
    xhr.timeout = 1_800_000; // 30 min
    xhr.withCredentials = true;
    xhr.send(formData);
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
    setUploading(false);
    setProgress(0);
    setStage("idle");
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setStage("idle");
  };

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : "0";

  // ── Success screen ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="mx-auto bg-green-100 w-14 h-14 rounded-full flex items-center justify-center mb-3">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-900 mb-1">Import Complete!</h3>
          <p className="text-green-700 text-sm mb-4">Your file has been processed successfully.</p>

          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-4">
            <div className="bg-white border border-green-200 rounded-lg p-3">
              <p className="text-2xl font-bold text-slate-800">{result.totalRows.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Rows</p>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-700">{result.inserted.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Imported</p>
            </div>
            <div className="bg-white border border-amber-200 rounded-lg p-3">
              <p className="text-2xl font-bold text-amber-600">{result.skipped.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </div>
          </div>

          {result.skippedDetails?.length > 0 && (
            <div className="text-left bg-amber-50 border border-amber-200 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Skipped Rows (first 20 shown)
              </p>
              {result.skippedDetails.map((s, i) => (
                <p key={i} className="text-xs text-amber-700">Row {s.row}: {s.reason}</p>
              ))}
              {result.skipped > result.skippedDetails.length && (
                <p className="text-xs text-amber-500 mt-1">…and {result.skipped - result.skippedDetails.length} more skipped rows</p>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-center gap-3">
          <Button onClick={clearFile} variant="outline">Upload Another File</Button>
        </div>
      </div>
    );
  }

  // ── Upload form ────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" /> Supports .xlsx, .xls, .csv, .xml up to 2 GB
        </p>
        <Button variant="ghost" size="sm" onClick={downloadSampleTemplate} className="text-primary hover:text-primary/80 text-xs gap-1.5" data-testid="button-download-template">
          <Download className="h-3.5 w-3.5" /> Download Sample Template
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!file ? (
        <div
          {...getRootProps()}
          data-testid="dropzone-upload"
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"}`}
        >
          <input {...getInputProps()} data-testid="input-file-upload" />
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Drag & drop your file here</h3>
          <p className="text-sm text-muted-foreground mb-1">or click to select an Excel (.xlsx, .xls), CSV, or XML file</p>
          <p className="text-xs text-muted-foreground mb-4">Supports files up to 2 GB — for 20L+ records</p>
          <Button variant="secondary" size="sm">Select File</Button>
        </div>
      ) : (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fileSizeMB} MB &middot; <Badge variant="secondary" className="text-[10px] py-0">.{file.name.split(".").pop()?.toUpperCase()}</Badge>
                </p>
                {parseFloat(fileSizeMB) > 50 && (
                  <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Large file — may take several minutes
                  </p>
                )}
              </div>
            </div>
            {!uploading && (
              <Button variant="ghost" size="icon" onClick={clearFile} className="text-muted-foreground hover:text-destructive" data-testid="button-remove-file">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {uploading && (
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {stage === "uploading" && `Uploading… ${progress}%`}
                  {stage === "processing" && "Processing records — please wait…"}
                  {stage === "done" && "Finalising…"}
                </span>
                <span className="font-medium text-slate-700">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5 w-full" />
              <p className="text-[11px] text-muted-foreground">Do not close this tab while the upload is in progress.</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            {uploading ? (
              <Button variant="outline" onClick={cancelUpload} className="text-red-600 border-red-200 hover:bg-red-50">
                Cancel Upload
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={clearFile} data-testid="button-cancel-upload">Cancel</Button>
                <Button onClick={handleUpload} className="min-w-[160px]" data-testid="button-start-upload">
                  <Upload className="mr-2 h-4 w-4" /> Upload & Import
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
