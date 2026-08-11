/**
 * Admin managers for the Indian LLP directory and Bank IFSC directory.
 * List + search + add + edit + delete, following the ServicesTab pattern.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Llp, IfscCode } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Landmark, Loader2, Pencil, Trash2, Upload, X } from "lucide-react";
import { useRef } from "react";

async function apiJson(method: string, path: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message || "Request failed"); }
  return res.status === 204 ? null : res.json();
}

// ─── Bulk import card (shared by LLP + IFSC) ─────────────────────────────────
function BulkImportCard({ endpoint, invalidateKey, label, columnsHint, testId }: {
  endpoint: string;
  invalidateKey: string;
  label: string;
  columnsHint: string;
  testId: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; totalRows: number; errors: string[] } | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as any).message || "Import failed");
      setResult(body);
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      toast({ title: `Imported ${body.imported} ${label} record${body.imported === 1 ? "" : "s"}`, description: body.skipped ? `${body.skipped} row(s) skipped.` : undefined });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 border-b">
        <CardTitle className="flex items-center gap-2 text-sky-800">
          <Upload className="h-5 w-5" /> Bulk Import ({label})
        </CardTitle>
        <CardDescription>
          Upload a CSV or Excel file (.csv, .xlsx, .xls). Recognized columns: {columnsHint}.
          Existing records with the same {label === "LLP" ? "LLPIN" : "IFSC code"} are updated instead of duplicated.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          data-testid={`input-file-${testId}`}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={uploading} data-testid={`button-import-${testId}`}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          {uploading ? "Importing…" : "Choose CSV / Excel file"}
        </Button>
        {result && (
          <div className="text-sm space-y-1" data-testid={`text-import-result-${testId}`}>
            <p className="text-emerald-700 font-medium">
              Imported {result.imported} of {result.totalRows} rows{result.skipped ? ` (${result.skipped} skipped)` : ""}.
            </p>
            {result.errors?.length > 0 && (
              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer">Skipped row details ({result.errors.length}{result.errors.length >= 20 ? "+" : ""})</summary>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── LLP Manager ──────────────────────────────────────────────────────────────
const EMPTY_LLP = { llpin: "", name: "", registrationDate: "", roc: "", state: "", district: "", status: "", industry: "", address: "" };

export function LlpTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_LLP);
  const [editingId, setEditingId] = useState<number | null>(null);
  const limit = 20;

  const { data, isLoading } = useQuery<{ data: Llp[]; total: number }>({
    queryKey: ["/api/llps", { page, limit, search }],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) p.set("search", search);
      const res = await fetch(`/api/llps?${p}`);
      return res.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/llps"] });
  const payload = () => {
    const body: Record<string, unknown> = {};
    Object.entries(form).forEach(([k, v]) => { body[k] = v.trim() === "" ? null : v.trim(); });
    if (!body.name) throw new Error("LLP name is required");
    return body;
  };

  const saveMutation = useMutation({
    mutationFn: () => editingId
      ? apiJson("PUT", `/api/admin/llps/${editingId}`, payload())
      : apiJson("POST", "/api/admin/llps", payload()),
    onSuccess: () => { invalidate(); setForm(EMPTY_LLP); setEditingId(null); toast({ title: editingId ? "LLP updated" : "LLP added" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiJson("DELETE", `/api/admin/llps/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "LLP deleted" }); },
  });

  const startEdit = (l: Llp) => {
    setEditingId(l.id);
    setForm({
      llpin: l.llpin ?? "", name: l.name ?? "", registrationDate: l.registrationDate ?? "",
      roc: l.roc ?? "", state: l.state ?? "", district: l.district ?? "",
      status: l.status ?? "", industry: l.industry ?? "", address: l.address ?? "",
    });
  };

  const FIELDS: { key: string; label: string; placeholder: string; type?: string }[] = [
    { key: "llpin", label: "LLPIN", placeholder: "AAA-1234" },
    { key: "name", label: "LLP Name *", placeholder: "Example Ventures LLP" },
    { key: "registrationDate", label: "Registration Date", placeholder: "", type: "date" },
    { key: "roc", label: "ROC", placeholder: "ROC Mumbai" },
    { key: "state", label: "State", placeholder: "Maharashtra" },
    { key: "district", label: "District", placeholder: "Mumbai" },
    { key: "status", label: "Status", placeholder: "Active" },
    { key: "industry", label: "Industry", placeholder: "Business Services" },
    { key: "address", label: "Address", placeholder: "Registered office address" },
  ];

  return (
    <div className="space-y-6">
      <BulkImportCard
        endpoint="/api/admin/llps/import"
        invalidateKey="/api/llps"
        label="LLP"
        columnsHint="LLPIN, LLP Name, Registration Date, ROC, State, District, Status, Industry, Address, Email, Total Obligation"
        testId="llp"
      />
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2 text-indigo-800">
            <Briefcase className="h-5 w-5" /> {editingId ? "Edit LLP" : "Add LLP"}
          </CardTitle>
          <CardDescription>Indian Limited Liability Partnership records shown in the public LLP directory.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FIELDS.map(f => (
              <div key={f.key} className={`space-y-1.5 ${f.key === "address" ? "sm:col-span-3" : ""}`}>
                <label className="text-sm font-semibold text-slate-700">{f.label}</label>
                <Input type={f.type} placeholder={f.placeholder} value={form[f.key] ?? ""}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  data-testid={`input-llp-${f.key}`} />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim()} data-testid="button-save-llp">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Update LLP" : "Add LLP"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={() => { setEditingId(null); setForm(EMPTY_LLP); }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">LLP Records {data ? `(${data.total})` : ""}</CardTitle>
          <Input className="max-w-xs" placeholder="Search name or LLPIN…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} data-testid="input-llp-search" />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !data?.data.length ? (
            <p className="text-sm text-muted-foreground text-center py-10">No LLP records yet. Add the first one above.</p>
          ) : (
            <div className="divide-y">
              {data.data.map(l => (
                <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3" data-testid={`row-llp-${l.id}`}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{l.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[l.llpin, l.state, l.status].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(l)} data-testid={`button-edit-llp-${l.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(l.id)} data-testid={`button-delete-llp-${l.id}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data && data.total > limit && (
            <div className="flex items-center justify-between px-5 py-3 border-t text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-muted-foreground">Page {page} of {Math.ceil(data.total / limit)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / limit)} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── IFSC Manager ─────────────────────────────────────────────────────────────
const EMPTY_IFSC = { bank: "", ifsc: "", branch: "", district: "", state: "", address: "", city: "" };

export function IfscTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_IFSC);
  const [editingId, setEditingId] = useState<number | null>(null);
  const limit = 20;

  const { data, isLoading } = useQuery<{ data: IfscCode[]; total: number }>({
    queryKey: ["/api/ifsc", { page, limit, search }],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) p.set("search", search);
      const res = await fetch(`/api/ifsc?${p}`);
      return res.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/ifsc"] });
  const payload = () => {
    const body: Record<string, unknown> = {};
    Object.entries(form).forEach(([k, v]) => { body[k] = v.trim() === "" ? null : v.trim(); });
    if (!body.bank || !body.ifsc) throw new Error("Bank and IFSC are required");
    return body;
  };

  const saveMutation = useMutation({
    mutationFn: () => editingId
      ? apiJson("PUT", `/api/admin/ifsc/${editingId}`, payload())
      : apiJson("POST", "/api/admin/ifsc", payload()),
    onSuccess: () => { invalidate(); setForm(EMPTY_IFSC); setEditingId(null); toast({ title: editingId ? "IFSC updated" : "IFSC added" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiJson("DELETE", `/api/admin/ifsc/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "IFSC record deleted" }); },
  });

  const startEdit = (r: IfscCode) => {
    setEditingId(r.id);
    setForm({
      bank: r.bank ?? "", ifsc: r.ifsc ?? "", branch: r.branch ?? "", district: r.district ?? "",
      state: r.state ?? "", address: r.address ?? "", city: r.city ?? "",
    });
  };

  const FIELDS: { key: string; label: string; placeholder: string }[] = [
    { key: "bank", label: "Bank *", placeholder: "State Bank of India" },
    { key: "ifsc", label: "IFSC *", placeholder: "SBIN0000300" },
    { key: "branch", label: "Branch", placeholder: "Fort Mumbai" },
    { key: "city", label: "City", placeholder: "Mumbai" },
    { key: "district", label: "District", placeholder: "Mumbai" },
    { key: "state", label: "State", placeholder: "Maharashtra" },
    { key: "address", label: "Address", placeholder: "Branch address" },
  ];

  return (
    <div className="space-y-6">
      <BulkImportCard
        endpoint="/api/admin/ifsc/import"
        invalidateKey="/api/ifsc"
        label="IFSC"
        columnsHint="BANK, IFSC, BRANCH, CITY, DISTRICT, STATE, ADDRESS"
        testId="ifsc"
      />
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
          <CardTitle className="flex items-center gap-2 text-emerald-800">
            <Landmark className="h-5 w-5" /> {editingId ? "Edit IFSC Record" : "Add IFSC Record"}
          </CardTitle>
          <CardDescription>Indian bank branch IFSC codes shown in the public IFSC finder.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FIELDS.map(f => (
              <div key={f.key} className={`space-y-1.5 ${f.key === "address" ? "sm:col-span-3" : ""}`}>
                <label className="text-sm font-semibold text-slate-700">{f.label}</label>
                <Input placeholder={f.placeholder} value={form[f.key] ?? ""}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  data-testid={`input-ifsc-${f.key}`} />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.bank.trim() || !form.ifsc.trim()} data-testid="button-save-ifsc">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Update Record" : "Add Record"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={() => { setEditingId(null); setForm(EMPTY_IFSC); }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">IFSC Records {data ? `(${data.total})` : ""}</CardTitle>
          <Input className="max-w-xs" placeholder="Search IFSC, bank, branch…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} data-testid="input-ifsc-search" />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !data?.data.length ? (
            <p className="text-sm text-muted-foreground text-center py-10">No IFSC records yet. Add the first one above.</p>
          ) : (
            <div className="divide-y">
              {data.data.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3" data-testid={`row-ifsc-${r.id}`}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.bank} — <span className="font-mono">{r.ifsc}</span></p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[r.branch, r.city, r.state].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(r)} data-testid={`button-edit-ifsc-${r.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)} data-testid={`button-delete-ifsc-${r.id}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data && data.total > limit && (
            <div className="flex items-center justify-between px-5 py-3 border-t text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-muted-foreground">Page {page} of {Math.ceil(data.total / limit)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / limit)} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
