import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/layout/Navbar";
import { FileUpload } from "@/components/companies/FileUpload";
import { FileSpreadsheet, CheckCircle2, AlertCircle, Download, ArrowRight, Shield } from "lucide-react";

const COLUMNS = [
  { name: "Name", note: "Required", color: "bg-green-100 text-green-800 border-green-200" },
  { name: "CIN", note: "Unique ID", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { name: "Status", note: "Active / Strike Off", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { name: "Class", note: "Public / Private", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { name: "Category", note: "", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { name: "Sub Category", note: "", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { name: "Authorized Capital", note: "Number", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { name: "Paid Up Capital", note: "Number", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { name: "State", note: "", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { name: "City", note: "", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { name: "Pincode", note: "", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { name: "Address", note: "", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { name: "Email", note: "", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { name: "Phone", note: "", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { name: "ROC", note: "Registrar", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { name: "Country", note: "Default: India", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { name: "Incorporation Date", note: "YYYY-MM-DD", color: "bg-rose-100 text-rose-800 border-rose-200" },
  { name: "Last AGM Date", note: "YYYY-MM-DD", color: "bg-rose-100 text-rose-800 border-rose-200" },
  { name: "Last Balance Sheet Date", note: "YYYY-MM-DD", color: "bg-rose-100 text-rose-800 border-rose-200" },
];

function downloadTemplate() {
  const headers = COLUMNS.map(c => c.name);
  const sample = [
    "Acme Technologies Private Limited",
    "U12345MH2010PTC123456",
    "Active", "Private",
    "Company limited by shares", "Non-govt company",
    "1000000", "500000",
    "Maharashtra", "Mumbai", "400001",
    "123 Business Park, Andheri East",
    "info@acme.com", "9876543210",
    "RoC-Mumbai", "India",
    "2010-05-15", "2023-09-30", "2023-03-31"
  ];
  const csv = [headers, sample].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "company_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportData() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 py-12">
        <div className="container-width">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Import Company Data</h1>
              <p className="text-slate-400 text-sm">Upload Excel or CSV files to bulk-import company records into the database</p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex flex-wrap gap-4 mt-8">
            {[
              { step: "1", label: "Download the template", icon: Download },
              { step: "2", label: "Fill in your company data", icon: FileSpreadsheet },
              { step: "3", label: "Upload the file below", icon: ArrowRight },
            ].map(({ step, label, icon: Icon }) => (
              <div key={step} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{step}</span>
                <Icon className="h-4 w-4 text-slate-400" />
                <span className="text-slate-200 text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container-width py-12">
        <div className="grid lg:grid-cols-5 gap-8">

          {/* Upload zone — wider */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
              <div className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">Upload File</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Supports .xlsx, .xls, and .csv — up to 50 MB</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  data-testid="button-download-template-import"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow shadow-blue-500/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Get Template
                </button>
              </div>
              <div className="p-8">
                <FileUpload />
              </div>
            </div>

            {/* Auth note */}
            <div className="flex items-start gap-3 bg-blue-950/40 border border-blue-800/50 rounded-xl p-4">
              <Shield className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-blue-300 text-xs leading-relaxed">
                Only logged-in administrators can import data. Your upload is processed securely and duplicate CINs are automatically skipped.
              </p>
            </div>
          </div>

          {/* Column reference */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-xl sticky top-20">
              <div className="border-b border-slate-700 px-5 py-4">
                <h2 className="text-white font-bold">Supported Columns</h2>
                <p className="text-slate-400 text-xs mt-0.5">Column names are auto-detected — both exact and common variations work</p>
              </div>
              <div className="p-5 max-h-[70vh] overflow-y-auto space-y-2">
                {COLUMNS.map((col) => (
                  <div key={col.name} className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${col.color}`}>
                      {col.name}
                    </span>
                    {col.note && (
                      <span className="text-slate-500 text-xs text-right">{col.note}</span>
                    )}
                  </div>
                ))}

                <div className="mt-4 bg-amber-950/40 border border-amber-800/50 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-amber-300 text-xs leading-relaxed">
                      <strong>Tip:</strong> Only "Name" is required. All other columns are optional. Dates must be in YYYY-MM-DD format.
                    </p>
                  </div>
                </div>

                <div className="bg-green-950/40 border border-green-800/50 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-green-300 text-xs leading-relaxed">
                      Records with the same CIN are automatically skipped to prevent duplicates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
