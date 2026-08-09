import { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileSpreadsheet, X, CheckCircle, Loader2,
  Download, AlertTriangle, Info, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

// ── Country-specific upload templates ────────────────────────────────────────
export const UPLOAD_COUNTRIES = [
  { code: "IN", label: "🇮🇳 India", regLabel: "CIN" },
  { code: "AU", label: "🇦🇺 Australia", regLabel: "ACN" },
  { code: "GB", label: "🇬🇧 United Kingdom", regLabel: "Company Number" },
  { code: "SG", label: "🇸🇬 Singapore", regLabel: "UEN" },
  { code: "US", label: "🇺🇸 United States", regLabel: "Registration Number" },
] as const;

const TEMPLATE_BY_COUNTRY: Record<string, { headers: string[]; rows: string[][] }> = {
  IN: {
    headers: ["CIN","Name","Status","Class","Category","Sub Category","Authorized Capital","Paid Up Capital","State","City","Pincode","Email","Phone","Address","ROC","Country","Incorporation Date","Last AGM Date","Last Balance Sheet Date"],
    rows: [
      ["U12345MH2010PTC123456","Acme Technologies Private Limited","Active","Private","Company limited by shares","Non-govt company","1000000","500000","Maharashtra","Mumbai","400001","info@acme.com","9876543210","123 Business Park, Andheri East","RoC-Mumbai","India","2010-05-15","2023-09-30","2023-03-31"],
      ["U67890DL2015PLC654321","Global Exports Limited","Active","Public","Company limited by shares","Non-govt company","5000000","2000000","Delhi","New Delhi","110001","contact@globalexports.com","9123456789","456 Trade Tower, Connaught Place","RoC-Delhi","India","2015-01-20","2023-09-30","2023-03-31"],
    ],
  },
  AU: {
    headers: ["ACN","Name","Status","Class","Category","State","City","Pincode","Email","Phone","Address","Country","Incorporation Date"],
    rows: [["123456789","Koala Digital Pty Ltd","Active","Private","Proprietary company","New South Wales","Sydney","2000","hello@koala.com.au","+61 2 9000 0000","1 Market St, Sydney","Australia","2015-03-10"]],
  },
  GB: {
    headers: ["Company Number","Name","Status","Class","Category","State","City","Pincode","Email","Phone","Address","Country","Incorporation Date"],
    rows: [["09876543","Thames Analytics Ltd","Active","Private","Private limited company","Greater London","London","EC1A 1BB","info@thames.co.uk","+44 20 7000 0000","10 Fleet St, London","United Kingdom","2012-07-01"]],
  },
  SG: {
    headers: ["UEN","Name","Status","Class","Category","State","City","Pincode","Email","Phone","Address","Country","Incorporation Date"],
    rows: [["201512345K","Merlion Tech Pte Ltd","Active","Private","Exempt private company","Singapore","Singapore","049315","contact@merlion.sg","+65 6000 0000","1 Raffles Pl","Singapore","2015-06-15"]],
  },
  US: {
    headers: ["Registration Number","Name","Status","Class","Category","State","City","Pincode","Email","Phone","Address","Country","Incorporation Date"],
    rows: [["7654321","Liberty Software Inc","Active","Private","C Corporation","Delaware","Wilmington","19801","info@liberty.io","+1 302 000 0000","1209 Orange St","United States","2018-01-05"]],
  },
};

function downloadSampleTemplate(countryCode: string) {
  const t = TEMPLATE_BY_COUNTRY[countryCode] || TEMPLATE_BY_COUNTRY.IN;
  const csv = [t.headers, ...t.rows].map(r => r.join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: `company_upload_template_${countryCode.toLowerCase()}.csv`,
  });
  a.click();
}

// ── Types ─────────────────────────────────────────────────────────────────────

type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

interface ImportJob {
  id: number;
  status: JobStatus;
  filename: string | null;
  fileSize: number | null;
  processedRecords: number | null;
  insertedRecords: number | null;
  skippedRecords: number | null;
  errorRecords: number | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

type Stage = "idle" | "uploading" | "queued" | "processing" | "done" | "failed";

// ── Helper ────────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString();
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FileUpload() {
  const [file, setFile]       = useState<File | null>(null);
  const [countryCode, setCountryCode] = useState("IN");
  const [stage, setStage]     = useState<Stage>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [jobId, setJobId]     = useState<number | null>(null);
  const [job, setJob]         = useState<ImportJob | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const xhrRef     = useRef<XMLHttpRequest | null>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/import-jobs/${jobId}`, { credentials: "include" });
        if (!res.ok) return;
        const data: ImportJob = await res.json();
        setJob(data);

        if (data.status === "COMPLETED") {
          setStage("done");
          clearInterval(pollRef.current!);
          queryClient.invalidateQueries({ queryKey: [api.companies.list.path] });
        } else if (data.status === "FAILED" || data.status === "CANCELLED") {
          setStage("failed");
          setError(data.errorMessage || "Import failed.");
          clearInterval(pollRef.current!);
        } else if (data.status === "PROCESSING") {
          setStage("processing");
        }
      } catch {/* network hiccup — keep polling */}
    };

    pollRef.current = setInterval(poll, 2_000);
    poll(); // immediate first check
    return () => clearInterval(pollRef.current!);
  }, [jobId]);

  // ── Dropzone ───────────────────────────────────────────────────────────────

  const onDrop = useCallback((accepted: File[]) => {
    if (!accepted.length) return;
    setFile(accepted[0]);
    setStage("idle");
    setError(null);
    setUploadPct(0);
    setJobId(null);
    setJob(null);
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
    disabled: stage !== "idle",
  });

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleUpload = () => {
    if (!file) return;
    setStage("uploading");
    setError(null);
    setUploadPct(0);

    const formData = new FormData();
    formData.append("countryCode", countryCode); // must precede file so multer parses it before the stream
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.jobId) {
            setJobId(data.jobId);
            setStage("queued");
          } else {
            setError("Server did not return a job ID.");
            setStage("failed");
          }
        } catch {
          setError("Unexpected server response.");
          setStage("failed");
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          setError(err.message || "Upload failed.");
        } catch {
          setError(`Server error (${xhr.status}).`);
        }
        setStage("failed");
      }
    });

    xhr.addEventListener("error", () => {
      setError("Network error — upload failed. Check your connection.");
      setStage("failed");
    });

    xhr.addEventListener("timeout", () => {
      setError("Upload timed out. Check your network and try again.");
      setStage("failed");
    });

    xhr.open("POST", api.companies.upload.path);
    xhr.timeout = 1_800_000; // 30 min for upload transfer only
    xhr.withCredentials = true;
    xhr.send(formData);
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
    clearInterval(pollRef.current!);
    setStage("idle");
    setUploadPct(0);
  };

  const reset = () => {
    clearInterval(pollRef.current!);
    setFile(null);
    setStage("idle");
    setUploadPct(0);
    setJobId(null);
    setJob(null);
    setError(null);
  };

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : "0";
  const isLarge = parseFloat(fileSizeMB) > 50;

  // ── Completed screen ───────────────────────────────────────────────────────

  if (stage === "done" && job) {
    return (
      <div className="space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="mx-auto bg-green-100 w-14 h-14 rounded-full flex items-center justify-center mb-3">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-900 mb-1">Import Complete!</h3>
          <p className="text-green-700 text-sm mb-4">{job.filename} processed successfully.</p>

          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-4">
            <div className="bg-white border border-green-200 rounded-lg p-3">
              <p className="text-2xl font-bold text-slate-800">{fmt(job.processedRecords)}</p>
              <p className="text-xs text-muted-foreground">Processed</p>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-700">{fmt(job.insertedRecords)}</p>
              <p className="text-xs text-muted-foreground">Inserted</p>
            </div>
            <div className="bg-white border border-amber-200 rounded-lg p-3">
              <p className="text-2xl font-bold text-amber-600">{fmt(job.skippedRecords)}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Job #{job.id}</p>
        </div>
        <div className="flex justify-center">
          <Button onClick={reset} variant="outline">Upload Another File</Button>
        </div>
      </div>
    );
  }

  // ── Upload form ────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Country selector */}
      <div className="bg-muted/40 border rounded-xl p-4 space-y-1.5">
        <label className="text-sm font-semibold">Import Country</label>
        <p className="text-xs text-muted-foreground">Data fields and the template are specific to the selected country ({UPLOAD_COUNTRIES.find(c => c.code === countryCode)?.regLabel} is used as the registration ID).</p>
        <select
          className="w-full sm:w-64 border rounded-lg px-3 py-2 text-sm bg-background"
          value={countryCode}
          onChange={e => setCountryCode(e.target.value)}
          disabled={stage !== "idle"}
          data-testid="select-upload-country"
        >
          {UPLOAD_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" /> Supports .xlsx, .xls, .csv, .xml up to 2 GB
        </p>
        <Button variant="ghost" size="sm" onClick={() => downloadSampleTemplate(countryCode)}
          className="text-primary hover:text-primary/80 text-xs gap-1.5">
          <Download className="h-3.5 w-3.5" /> Download {countryCode} Template
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Dropzone */}
      {!file ? (
        <div {...getRootProps()} data-testid="dropzone-upload"
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
            ${isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50"}`}>
          <input {...getInputProps()} data-testid="input-file-upload" />
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Drag & drop your file here</h3>
          <p className="text-sm text-muted-foreground mb-1">Excel (.xlsx, .xls), CSV, or XML</p>
          <p className="text-xs text-muted-foreground mb-4">Up to 2 GB — import runs in background, safe to close browser</p>
          <Button variant="secondary" size="sm">Select File</Button>
        </div>
      ) : (
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          {/* File info */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fileSizeMB} MB &middot;{" "}
                  <Badge variant="secondary" className="text-[10px] py-0">
                    .{file.name.split(".").pop()?.toUpperCase()}
                  </Badge>
                </p>
                {isLarge && stage === "idle" && (
                  <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Large file — import will run in background
                  </p>
                )}
              </div>
            </div>
            {stage === "idle" && (
              <Button variant="ghost" size="icon" onClick={reset}
                className="text-muted-foreground hover:text-destructive" data-testid="button-remove-file">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Upload progress bar */}
          {stage === "uploading" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Uploading file…
                </span>
                <span className="font-medium">{uploadPct}%</span>
              </div>
              <Progress value={uploadPct} className="h-2" />
            </div>
          )}

          {/* Job status panel */}
          {(stage === "queued" || stage === "processing") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                {stage === "queued" ? (
                  <><Clock className="h-4 w-4 text-amber-500" /> Queued — waiting to start…</>
                ) : (
                  <><Loader2 className="h-4 w-4 animate-spin text-primary" /> Processing in background…</>
                )}
              </div>

              {job && stage === "processing" && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-base font-bold">{fmt(job.processedRecords)}</p>
                    <p className="text-[10px] text-muted-foreground">Processed</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-base font-bold text-green-700">{fmt(job.insertedRecords)}</p>
                    <p className="text-[10px] text-muted-foreground">Inserted</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2">
                    <p className="text-base font-bold text-amber-600">{fmt(job.skippedRecords)}</p>
                    <p className="text-[10px] text-muted-foreground">Skipped</p>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                You can safely close this tab — the import will continue on the server.
              </p>

              {jobId && (
                <p className="text-[11px] text-muted-foreground">Job ID: #{jobId}</p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            {stage === "uploading" ? (
              <Button variant="outline" onClick={cancelUpload} className="text-red-600 border-red-200 hover:bg-red-50">
                Cancel Upload
              </Button>
            ) : stage === "idle" ? (
              <>
                <Button variant="outline" onClick={reset} data-testid="button-cancel-upload">Cancel</Button>
                <Button onClick={handleUpload} className="min-w-[160px]" data-testid="button-start-upload">
                  <Upload className="mr-2 h-4 w-4" /> Upload & Import
                </Button>
              </>
            ) : (stage === "queued" || stage === "processing") ? (
              <Button variant="outline" onClick={reset} className="text-muted-foreground">
                Upload Another File
              </Button>
            ) : stage === "failed" ? (
              <Button variant="outline" onClick={reset}>Try Again</Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
