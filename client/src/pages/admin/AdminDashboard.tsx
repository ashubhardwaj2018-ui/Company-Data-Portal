import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { Navbar } from "@/components/layout/Navbar";
import { FileUpload } from "@/components/companies/FileUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Service, Article, Post } from "@shared/schema";
import {
  Upload, Users, ShieldAlert, BookOpen, CheckCircle2,
  Link2, Plus, Trash2, ExternalLink, Globe, Loader2,
  Settings, Sparkles, FileText, Search, Eye, EyeOff,
  Info, AlertCircle, ClipboardList, XCircle, Clock,
  Star, Mail, BarChart2, Pencil,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function apiPost(path: string, body: unknown) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message || "Request failed"); }
  return res.json();
}
async function apiDel(path: string) {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}
async function apiPut(path: string, body: unknown) {
  const res = await fetch(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message || "Request failed"); }
  return res.json();
}

// ─── Badges Admin Tab (Phase 26) ──────────────────────────────────────────────
const BADGE_OPTIONS = ["verified", "featured", "claimed", "premium"] as const;

function BadgesAdminTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [activeBadges, setActiveBadges] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<{ data: any[]; total: number }>({
    queryKey: ["/api/companies", { search, limit: 50 }],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: "50" });
      if (search) p.set("search", search);
      const res = await fetch(`/api/companies?${p}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const selectCompany = (c: any) => {
    setSelected(c.id);
    try { setActiveBadges(JSON.parse(c.badges || "[]")); }
    catch { setActiveBadges([]); }
  };

  const saveBadges = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/${selected}/badges`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ badges: activeBadges }),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Badges updated" });
    } catch { toast({ title: "Error saving badges", variant: "destructive" }); }
    setSaving(false);
  };

  const toggleBadge = (b: string) => setActiveBadges(prev =>
    prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
  );

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-blue-600" /> Company Badges</CardTitle>
          <CardDescription>Assign verification and feature badges to companies. They appear as colored pills on cards and profiles.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Search company</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm mb-3" placeholder="Company name…" value={search} onChange={e => setSearch(e.target.value)} />
              <div className="border rounded-xl overflow-hidden max-h-64 overflow-y-auto divide-y">
                {isLoading ? <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
                : (data?.data || []).map((c: any) => (
                  <button key={c.id} onClick={() => selectCompany(c)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-muted/30 transition-colors flex items-center justify-between gap-2 ${selected === c.id ? "bg-blue-50 font-semibold text-blue-800" : ""}`}>
                    <span className="truncate">{c.name}</span>
                    {c.badges && JSON.parse(c.badges || "[]").length > 0 && (
                      <span className="text-[10px] text-blue-600 font-bold">★</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                {selected ? "Badges to assign" : "Select a company first"}
              </label>
              <div className="space-y-2">
                {BADGE_OPTIONS.map(b => (
                  <label key={b} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${activeBadges.includes(b) ? "border-blue-400 bg-blue-50" : "border-muted hover:border-blue-200"} ${!selected ? "opacity-40 pointer-events-none" : ""}`}>
                    <input type="checkbox" checked={activeBadges.includes(b)} onChange={() => toggleBadge(b)} className="rounded" />
                    <div>
                      <p className="font-semibold text-sm capitalize">{b}</p>
                      <p className="text-xs text-muted-foreground">
                        {b === "verified" ? "Official government-verified data" :
                         b === "featured" ? "Highlighted in directory listings" :
                         b === "claimed" ? "Business owner has claimed this listing" :
                         "Premium enhanced profile"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <Button className="w-full mt-4 gap-2" onClick={saveBadges} disabled={!selected || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save Badges
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Users Admin Tab (Phase 29) ───────────────────────────────────────────────
function UsersAdminTab() {
  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="border-b flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Registered Users</CardTitle>
            <CardDescription>{users.length} total registered users</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No users yet.</p>
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {users.map((u: any) => (
                <div key={u.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {u.profileImageUrl
                      ? <img src={u.profileImageUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                      : (u.firstName?.[0] || u.email?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email || u.id}</p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Import Jobs Tab ──────────────────────────────────────────────────────────
const JOB_STATUS_STYLE: Record<string, string> = {
  QUEUED:     "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED:  "bg-green-100 text-green-800",
  FAILED:     "bg-red-100 text-red-800",
  CANCELLED:  "bg-gray-100 text-gray-700",
};

function ImportJobsTab() {
  const { data: jobs = [], isLoading, refetch, isFetching } = useQuery<any[]>({
    queryKey: ["/api/admin/import-jobs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/import-jobs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch import jobs");
      return res.json();
    },
    refetchInterval: (data) => {
      // Auto-refresh while any job is still running
      const active = (data as any)?.state?.data?.some?.((j: any) => j.status === "QUEUED" || j.status === "PROCESSING");
      return active ? 3000 : false;
    },
  });

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-white border-b flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-slate-600" /> Import Job History
            </CardTitle>
            <CardDescription className="mt-1">Background file import jobs. Auto-refreshes while jobs are running.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No import jobs yet. Upload a file to get started.</p>
            </div>
          ) : (
            <div className="divide-y">
              {jobs.map((job: any) => (
                <div key={job.id} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate max-w-xs">{job.filename}</span>
                        <Badge className={`text-[10px] border-0 ${JOB_STATUS_STYLE[job.status] || "bg-gray-100"}`}>
                          {job.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{(job.countryCode || "IN").toUpperCase()}</Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">{job.datasetType}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {job.processedRecords != null && (
                          <span>Processed: <strong className="text-foreground">{job.processedRecords.toLocaleString()}</strong></span>
                        )}
                        {job.insertedRecords != null && (
                          <span>Inserted: <strong className="text-green-700">{job.insertedRecords.toLocaleString()}</strong></span>
                        )}
                        {job.skippedRecords != null && job.skippedRecords > 0 && (
                          <span>Skipped: <strong className="text-yellow-700">{job.skippedRecords.toLocaleString()}</strong></span>
                        )}
                        {job.errorRecords != null && job.errorRecords > 0 && (
                          <span>Errors: <strong className="text-red-700">{job.errorRecords.toLocaleString()}</strong></span>
                        )}
                      </div>
                      {job.errorMessage && (
                        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5 shrink-0" /> {job.errorMessage}
                        </p>
                      )}
                      {(job.status === "QUEUED" || job.status === "PROCESSING") && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Processing in background — you can safely close this tab.
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {job.createdAt ? new Date(job.createdAt).toLocaleString() : "—"}
                      </div>
                      {job.createdBy && <div className="opacity-60">{job.createdBy}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Suggestions Tab (Phase 14) ───────────────────────────────────────────────
const SUGGESTION_STATUS_STYLE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  applied:   "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
};

function SuggestionsTab() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: suggestions = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/suggestions", statusFilter],
    queryFn: async () => {
      const p = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/suggestions${p}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/admin/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: (_d: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: vars.status === "applied" ? "Correction applied" : "Suggestion dismissed",
        description: vars.status === "applied" ? "The company record was updated automatically." : undefined,
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-white border-b flex-row items-center justify-between space-y-0 gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-orange-500" /> Data Correction Suggestions
            </CardTitle>
            <CardDescription className="mt-1">User-flagged corrections to company data. Clicking <strong>Apply</strong> updates the company record automatically.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {["", "pending", "applied", "dismissed"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  statusFilter === s ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600 hover:border-slate-500"
                }`}>{s || "All"}</button>
            ))}
            <Button size="sm" variant="outline" onClick={() => refetch()}>Refresh</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : suggestions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No suggestions{statusFilter ? ` with status "${statusFilter}"` : ""} yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {suggestions.map((s: any) => (
                <div key={s.id} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{s.companyName || `Company #${s.companyId}`}</span>
                        <Badge className={`text-[10px] border-0 ${SUGGESTION_STATUS_STYLE[s.status] || "bg-gray-100"}`}>{s.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">field: {s.fieldName}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {s.currentValue && <p><strong>Current:</strong> {s.currentValue}</p>}
                        <p><strong>Suggested:</strong> <span className="text-green-700 font-medium">{s.suggestedValue}</span></p>
                        {s.reason && <p><strong>Reason:</strong> {s.reason}</p>}
                        <p><strong>From:</strong> {s.userEmail}</p>
                        <p className="text-[10px] opacity-60">{new Date(s.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {s.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          onClick={() => reviewMutation.mutate({ id: s.id, status: "applied" })}
                          disabled={reviewMutation.isPending}>Apply</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                          onClick={() => reviewMutation.mutate({ id: s.id, status: "dismissed" })}
                          disabled={reviewMutation.isPending}>Dismiss</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Analytics Tab (Phase 20) ─────────────────────────────────────────────────
const PIE_COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];

function AnalyticsTab() {
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/directory/stats"],
    queryFn: async () => {
      const res = await fetch("/api/directory/stats");
      if (!res.ok) return {};
      return res.json();
    },
  });

  const byState = (stats?.byState || []).slice(0, 10).map((s: any) => ({ name: s.state || "Unknown", value: s.count }));
  const byStatus = (stats?.byStatus || []).map((s: any) => ({ name: s.status || "Unknown", value: s.count }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Companies", value: stats?.total ?? "—" },
          { label: "Active Companies", value: (stats?.byStatus || []).find((s: any) => s.status === "Active")?.count ?? "—" },
          { label: "States Covered", value: (stats?.byState || []).filter((s: any) => s.state).length || "—" },
        ].map(m => (
          <Card key={m.label} className="border-0 shadow-md">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary">{typeof m.value === "number" ? m.value.toLocaleString() : m.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4" /> Top 10 States by Company Count</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {byState.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No state data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byState} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: any) => v.toLocaleString()} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4" /> Companies by Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {byStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No status data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {byStatus.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => v.toLocaleString()} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Reviews Tab (Phase 19) ───────────────────────────────────────────────────
const REVIEW_STATUS_STYLE: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-sm ${i <= rating ? "text-yellow-400" : "text-gray-300"}`}>★</span>
      ))}
    </span>
  );
}

function ReviewsAdminTab() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("");

  const { data: reviews = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/reviews", statusFilter],
    queryFn: async () => {
      const p = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/reviews${p}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] }); toast({ title: "Review updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-white border-b flex-row items-center justify-between space-y-0 gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><Star className="h-5 w-5 text-yellow-500" /> Company Reviews</CardTitle>
            <CardDescription className="mt-1">Moderate user-submitted reviews before they appear publicly.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {["", "pending", "approved", "rejected"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${statusFilter === s ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600 hover:border-slate-500"}`}>
                {s || "All"}
              </button>
            ))}
            <Button size="sm" variant="outline" onClick={() => refetch()}>Refresh</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          : reviews.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground"><Star className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No reviews{statusFilter ? ` with status "${statusFilter}"` : ""} yet.</p></div>
          ) : (
            <div className="divide-y">
              {reviews.map((r: any) => (
                <div key={r.id} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{r.companyName || `Company #${r.companyId}`}</span>
                        <Badge className={`text-[10px] border-0 ${REVIEW_STATUS_STYLE[r.status] || "bg-gray-100"}`}>{r.status}</Badge>
                        <ReviewStars rating={r.rating} />
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {r.userName && <p><strong>By:</strong> {r.userName}</p>}
                        {r.comment && <p className="italic">"{r.comment}"</p>}
                        <p><strong>Email:</strong> {r.userEmail} · {new Date(r.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          onClick={() => reviewMutation.mutate({ id: r.id, status: "approved" })}
                          disabled={reviewMutation.isPending}>Approve</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                          onClick={() => reviewMutation.mutate({ id: r.id, status: "rejected" })}
                          disabled={reviewMutation.isPending}>Reject</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Newsletter Tab (Phase 16) ─────────────────────────────────────────────────
function NewsletterAdminTab() {
  const { data: subscribers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/newsletter"],
    queryFn: async () => {
      const res = await fetch("/api/admin/newsletter", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const active = subscribers.filter(s => s.active).length;
  const exportCsv = () => window.open("/api/admin/newsletter/export", "_blank");

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-white border-b flex-row items-center justify-between space-y-0 gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><Mail className="h-5 w-5 text-teal-600" /> Newsletter Subscribers</CardTitle>
            <CardDescription>{subscribers.length} total · {active} active</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv} className="gap-2"><ExternalLink className="h-4 w-4" /> Export CSV</Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          : subscribers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground"><Mail className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No subscribers yet.</p></div>
          ) : (
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {subscribers.map((s: any) => (
                <div key={s.id} className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{s.email}</p>
                    {s.name && <p className="text-xs text-muted-foreground">{s.name}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-[10px] border-0 ${s.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{s.active ? "active" : "unsubscribed"}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(s.subscribedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Bulk Edit Tab (Phase 24) ──────────────────────────────────────────────────
const BULK_EDIT_FIELDS: { key: string; label: string; type?: "select"; options?: string[] }[] = [
  { key: "status", label: "Status", type: "select", options: ["Active", "Strike-off", "Dissolved", "Under liquidation", "Converted to LLP"] },
  { key: "industry", label: "Industry" },
  { key: "source", label: "Source" },
  { key: "class", label: "Class", type: "select", options: ["Private", "Public", "One Person Company"] },
  { key: "category", label: "Category" },
  { key: "subCategory", label: "Sub Category" },
  { key: "state", label: "State" },
  { key: "city", label: "City" },
  { key: "district", label: "District" },
  { key: "pincode", label: "Pincode" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "roc", label: "ROC" },
  { key: "country", label: "Country" },
  { key: "incorporationDate", label: "Incorporation Date (YYYY-MM-DD)" },
  { key: "lastAgmDate", label: "Last AGM Date (YYYY-MM-DD)" },
  { key: "lastBalanceSheetDate", label: "Last Balance Sheet Date (YYYY-MM-DD)" },
];

function BulkEditTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [activeFields, setActiveFields] = useState<string[]>(["status"]);

  const { data: pendingSuggestions = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/suggestions", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/admin/suggestions?status=pending", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data, isLoading } = useQuery<{ data: any[]; total: number }>({
    queryKey: ["/api/companies", { search, limit: 50 }],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: "50" });
      if (search) p.set("search", search);
      const res = await fetch(`/api/companies?${p}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const filledOverrides = Object.fromEntries(Object.entries(overrides).filter(([k, v]) => activeFields.includes(k) && v.trim() !== ""));

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/companies/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: selected, fields: filledOverrides }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (r: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setSelected([]); setOverrides({}); setActiveFields(["status"]);
      toast({ title: `Updated ${r.updated} companies` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggle = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => {
    const ids = (data?.data || []).map((c: any) => c.id);
    setSelected(s => s.length === ids.length ? [] : ids);
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-lg"><Pencil className="h-5 w-5" /> Bulk Company Edit</CardTitle>
          <CardDescription>Select companies below, choose any fields to override, and apply to all selected records at once.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {pendingSuggestions.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span><strong>{pendingSuggestions.length}</strong> pending data correction suggestion{pendingSuggestions.length > 1 ? "s" : ""} — approve them in the <strong>Corrections</strong> tab and the company data updates automatically.</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Search companies</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Company name…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Field picker */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Fields to edit</label>
            <div className="flex flex-wrap gap-1.5">
              {BULK_EDIT_FIELDS.map(f => (
                <button key={f.key} type="button"
                  onClick={() => setActiveFields(a => a.includes(f.key) ? a.filter(x => x !== f.key) : [...a, f.key])}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    activeFields.includes(f.key) ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600 hover:border-slate-500"
                  }`}>{f.label.replace(/ \(YYYY.*\)/, "")}</button>
              ))}
            </div>
          </div>

          {/* Value inputs for active fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BULK_EDIT_FIELDS.filter(f => activeFields.includes(f.key)).map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{f.label}</label>
                {f.type === "select" ? (
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={overrides[f.key] || ""}
                    onChange={e => setOverrides(o => ({ ...o, [f.key]: e.target.value }))}>
                    <option value="">No change</option>
                    {f.options!.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="New value…"
                    value={overrides[f.key] || ""} onChange={e => setOverrides(o => ({ ...o, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b text-xs font-semibold text-muted-foreground">
              <input type="checkbox" checked={selected.length === (data?.data || []).length && selected.length > 0}
                onChange={toggleAll} className="rounded" />
              <span>Select All ({selected.length} selected)</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y">
              {isLoading ? <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : (data?.data || []).map((c: any) => (
                <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} className="rounded" />
                  <span className="text-sm font-medium truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">{c.status}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            disabled={!selected.length || !Object.keys(filledOverrides).length || bulkMutation.isPending}
            onClick={() => bulkMutation.mutate()}
            className="gap-2"
          >
            {bulkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Apply {Object.keys(filledOverrides).length} field{Object.keys(filledOverrides).length !== 1 ? "s" : ""} to {selected.length} selected
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Claims Tab (Phase 7) ─────────────────────────────────────────────────────
const CLAIM_STATUS_STYLE: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

function ClaimsTab() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: claims = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/claims", statusFilter],
    queryFn: async () => {
      const p = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/claims${p}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch claims");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/admin/claims/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Review failed");
    },
    onSuccess: (_d: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: vars.status === "approved" ? "Claim approved" : "Claim rejected",
        description: vars.status === "approved" ? "Company automatically marked with the 'claimed' badge." : undefined,
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-white border-b flex-row items-center justify-between space-y-0 gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-blue-600" /> Business Claim Requests
            </CardTitle>
            <CardDescription className="mt-1">Review ownership claims. Approving automatically marks the company as <strong>claimed</strong>.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {["", "pending", "approved", "rejected"].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  statusFilter === s ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600 hover:border-slate-500"
                }`}
              >
                {s || "All"}
              </button>
            ))}
            <Button size="sm" variant="outline" onClick={() => refetch()}>Refresh</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : claims.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No claims{statusFilter ? ` with status "${statusFilter}"` : ""} yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {claims.map((claim: any) => (
                <div key={claim.id} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{claim.companyName || `Company #${claim.companyId}`}</span>
                        <Badge className={`text-[10px] border-0 ${CLAIM_STATUS_STYLE[claim.status] || "bg-gray-100"}`}>
                          {claim.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p><strong>Claimant:</strong> {claim.userName || "—"} · {claim.userEmail}</p>
                        {claim.phone && <p><strong>Phone:</strong> {claim.phone}</p>}
                        {claim.message && <p><strong>Message:</strong> {claim.message}</p>}
                        <p className="text-[10px] opacity-60">Submitted: {new Date(claim.createdAt).toLocaleString()}</p>
                        {claim.reviewedBy && (
                          <p className="text-[10px] opacity-60">Reviewed by {claim.reviewedBy} · {new Date(claim.reviewedAt).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                    {claim.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          onClick={() => reviewMutation.mutate({ id: claim.id, status: "approved" })}
                          disabled={reviewMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                          onClick={() => reviewMutation.mutate({ id: claim.id, status: "rejected" })}
                          disabled={reviewMutation.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Services Tab ─────────────────────────────────────────────────────────────
function ServicesTab() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("🔗");
  const [imageUrl, setImageUrl] = useState("");
  const [linkMode, setLinkMode] = useState<"url" | "upload">("url");
  const [position, setPosition] = useState<"auto" | "left" | "right">("auto");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File, target: "url" | "image") => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/services/upload", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message || "Upload failed"); }
      const { url: served } = await res.json();
      if (target === "url") setUrl(served); else setImageUrl(served);
      toast({ title: "File uploaded", description: served });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const { data: services = [], isLoading } = useQuery<Service[]>({ queryKey: ["/api/services"] });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/admin/services", { ...data, isActive: true, order: services.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setTitle(""); setDescription(""); setUrl(""); setIcon("🔗"); setImageUrl(""); setPosition("auto");
      toast({ title: "Service added!" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDel(`/api/admin/services/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/services"] }),
  });

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
          <CardTitle className="flex items-center gap-2 text-orange-800"><Link2 className="h-5 w-5" /> Add Service Link</CardTitle>
          <CardDescription>
            Add service links from any partner website (e.g. legalfilingindia.com). They appear in the left/right sidebars on company and article pages, and in the services section site-wide — grouped automatically by website.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Title *</label>
              <Input placeholder="GST Registration" value={title} onChange={e => setTitle(e.target.value)} data-testid="input-service-title" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Icon (emoji)</label>
              <Input placeholder="📋" value={icon} onChange={e => setIcon(e.target.value)} data-testid="input-service-icon" className="w-24" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Service Link *</label>
              <div className="flex gap-1">
                {(["url", "upload"] as const).map(m => (
                  <button key={m} type="button" onClick={() => setLinkMode(m)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                      linkMode === m ? "bg-orange-600 text-white border-orange-600" : "border-slate-300 text-slate-600 hover:border-orange-400"
                    }`}>{m === "url" ? "External URL" : "Upload File"}</button>
                ))}
              </div>
            </div>
            {linkMode === "url" ? (
              <Input placeholder="https://legalfilingindia.com/gst-registration" value={url} onChange={e => setUrl(e.target.value)} data-testid="input-service-url" />
            ) : (
              <div className="flex items-center gap-3">
                <Input type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip" className="text-sm"
                  onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], "url")} disabled={uploading} data-testid="input-service-file" />
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
              </div>
            )}
            {linkMode === "upload" && url && <p className="text-xs text-green-700">Uploaded: {url}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Service Image <span className="text-xs text-muted-foreground">(shown in sidebar — paste a URL or upload)</span></label>
            <div className="flex items-center gap-3">
              <Input placeholder="https://example.com/image.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} data-testid="input-service-imageurl" />
              <label className="shrink-0">
                <input type="file" accept=".png,.jpg,.jpeg,.webp,.gif" className="hidden"
                  onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], "image")} disabled={uploading} />
                <span className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium cursor-pointer hover:bg-muted transition-colors">
                  <Upload className="h-3.5 w-3.5" /> Upload
                </span>
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Short Description</label>
            <Input placeholder="Expert GST registration for your business" value={description} onChange={e => setDescription(e.target.value)} data-testid="input-service-description" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Page Position</label>
            <div className="flex gap-1.5">
              {([["auto", "Auto (balanced)"], ["left", "Left sidebar"], ["right", "Right sidebar"]] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => setPosition(val)} data-testid={`button-position-${val}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    position === val ? "bg-orange-600 text-white border-orange-600" : "border-slate-300 text-slate-600 hover:border-orange-400"
                  }`}>{label}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Choose which side of company/article pages this service appears on. Auto balances services across both sides.</p>
          </div>
          <Button onClick={() => addMutation.mutate({ title, description, url, icon, imageUrl, position })} disabled={!title.trim() || !url.trim() || addMutation.isPending} className="bg-orange-600 hover:bg-orange-500 text-white gap-2" data-testid="button-add-service">
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Service
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Globe className="h-5 w-5 text-slate-500" /> Live Service Links</span>
            <Badge variant="secondary">{services.length} total</Badge>
          </CardTitle>
          <CardDescription>These links appear in the sidebars on company, blog, and article pages.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            : services.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Link2 className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No services yet.</p></div>
            ) : (
              <div className="divide-y">
                {services.map(svc => (
                  <div key={svc.id} data-testid={`service-row-${svc.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50">
                    {(svc as any).imageUrl ? (
                      <img src={(svc as any).imageUrl} alt={svc.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-xl flex-shrink-0">{svc.icon || "🔗"}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{svc.title}</p>
                      {svc.description && <p className="text-xs text-muted-foreground truncate">{svc.description}</p>}
                      <a href={svc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 mt-0.5">{svc.url.length > 50 ? svc.url.slice(0, 50) + "…" : svc.url}<ExternalLink className="h-3 w-3" /></a>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{(svc as any).position === "left" ? "◀ Left" : (svc as any).position === "right" ? "Right ▶" : "Auto"}</Badge>
                    <Badge variant={svc.isActive ? "default" : "secondary"} className={svc.isActive ? "bg-green-100 text-green-700 border-green-200" : ""}>{svc.isActive ? "Active" : "Hidden"}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(svc.id)} disabled={deleteMutation.isPending} className="text-red-400 hover:text-red-600 hover:bg-red-50" data-testid={`button-delete-service-${svc.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Articles Tab ──────────────────────────────────────────────────────────────
function ArticlesTab() {
  const [form, setForm] = useState({ title: "", slug: "", content: "", excerpt: "", category: "", coverImage: "", metaTitle: "", metaDescription: "", metaKeywords: "", published: false });
  const { toast } = useToast();

  const { data: articles = [], isLoading } = useQuery<Article[]>({ queryKey: ["/api/articles"] });

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/admin/articles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      setForm({ title: "", slug: "", content: "", excerpt: "", category: "", coverImage: "", metaTitle: "", metaDescription: "", metaKeywords: "", published: false });
      toast({ title: "Article created!" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, published }: { id: number; published: boolean }) => apiPut(`/api/admin/articles/${id}`, { published }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/articles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDel(`/api/admin/articles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/articles"] }),
  });

  const handleSlug = (title: string) => {
    set("slug", title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    set("title", title);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2 text-blue-900"><FileText className="h-5 w-5" /> Create New Article</CardTitle>
          <CardDescription>Articles appear in the Articles section with SEO-friendly URLs.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Title *</label>
              <Input placeholder="Understanding GST for Startups" value={form.title} onChange={e => handleSlug(e.target.value)} data-testid="input-article-title" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Slug (URL)</label>
              <Input placeholder="understanding-gst-for-startups" value={form.slug} onChange={e => set("slug", e.target.value)} data-testid="input-article-slug" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Category</label>
              <Input placeholder="Tax & Compliance" value={form.category} onChange={e => set("category", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Cover Image URL</label>
              <Input placeholder="https://..." value={form.coverImage} onChange={e => set("coverImage", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Excerpt</label>
            <Input placeholder="Brief summary shown in article list..." value={form.excerpt} onChange={e => set("excerpt", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Content *</label>
            <Textarea placeholder="Write your article content here..." value={form.content} onChange={e => set("content", e.target.value)} rows={8} data-testid="input-article-content" />
          </div>
          <details className="rounded-lg border border-blue-100 bg-blue-50/50">
            <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-blue-800 flex items-center gap-2"><Search className="h-4 w-4" /> SEO Fields</summary>
            <div className="px-4 pb-4 pt-2 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Meta Title</label>
                <Input placeholder="SEO page title (50-60 chars)" value={form.metaTitle} onChange={e => set("metaTitle", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Meta Description</label>
                <Textarea placeholder="SEO description (120-160 chars)" value={form.metaDescription} onChange={e => set("metaDescription", e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Keywords (comma separated)</label>
                <Input placeholder="gst, startup, company registration" value={form.metaKeywords} onChange={e => set("metaKeywords", e.target.value)} />
              </div>
            </div>
          </details>
          <div className="flex items-center gap-4">
            <Button onClick={() => createMutation.mutate({ ...form, published: false })} disabled={!form.title || !form.content || !form.slug || createMutation.isPending} variant="outline" className="gap-2">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Save Draft
            </Button>
            <Button onClick={() => createMutation.mutate({ ...form, published: true })} disabled={!form.title || !form.content || !form.slug || createMutation.isPending} className="gap-2 bg-blue-600 hover:bg-blue-500 text-white">
              <Globe className="h-4 w-4" /> Publish Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><FileText className="h-5 w-5 text-slate-500" /> All Articles</span>
            <Badge variant="secondary">{articles.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            : articles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No articles yet.</p></div>
            ) : (
              <div className="divide-y">
                {articles.map((a: Article) => (
                  <div key={a.id} data-testid={`article-row-${a.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground">/articles/{a.slug}</p>
                      {a.category && <Badge variant="secondary" className="text-[10px] mt-1">{a.category}</Badge>}
                    </div>
                    <Badge className={a.published ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}>
                      {a.published ? "Published" : "Draft"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => togglePublish.mutate({ id: a.id, published: !a.published })} className="gap-1">
                      {a.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(a.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50" data-testid={`button-delete-article-${a.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Blog Posts Tab ────────────────────────────────────────────────────────────
function BlogTab() {
  const [form, setForm] = useState({ title: "", slug: "", content: "", excerpt: "", coverImage: "", metaTitle: "", metaDescription: "", metaKeywords: "", published: false });
  const { toast } = useToast();

  const { data: posts = [], isLoading } = useQuery<Post[]>({ queryKey: ["/api/posts"] });
  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const handleSlug = (title: string) => { set("slug", title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); set("title", title); };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/admin/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setForm({ title: "", slug: "", content: "", excerpt: "", coverImage: "", metaTitle: "", metaDescription: "", metaKeywords: "", published: false });
      toast({ title: "Post created!" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, published }: { id: number; published: boolean }) => apiPut(`/api/admin/posts/${id}`, { published }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/posts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDel(`/api/admin/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/posts"] }),
  });

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Create New Blog Post</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Title *</label>
              <Input placeholder="Post title" value={form.title} onChange={e => handleSlug(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Slug</label>
              <Input value={form.slug} onChange={e => set("slug", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Excerpt</label>
            <Input placeholder="Brief summary" value={form.excerpt} onChange={e => set("excerpt", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Content *</label>
            <Textarea placeholder="Write your blog post..." value={form.content} onChange={e => set("content", e.target.value)} rows={8} />
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => createMutation.mutate({ ...form, published: false })} disabled={!form.title || !form.content || !form.slug || createMutation.isPending} variant="outline" className="gap-2">Save Draft</Button>
            <Button onClick={() => createMutation.mutate({ ...form, published: true })} disabled={!form.title || !form.content || !form.slug || createMutation.isPending} className="gap-2">Publish</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-slate-500" /> All Posts</span>
            <Badge variant="secondary">{posts.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            : posts.length === 0 ? <div className="text-center py-12 text-muted-foreground"><p className="text-sm">No posts yet.</p></div>
            : (
              <div className="divide-y">
                {posts.map((p: Post) => (
                  <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{p.title}</p>
                      <p className="text-xs text-muted-foreground">/blog/{p.slug}</p>
                    </div>
                    <Badge className={p.published ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}>{p.published ? "Published" : "Draft"}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => togglePublish.mutate({ id: p.id, published: !p.published })}>{p.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(p.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── AI Writing Tab ────────────────────────────────────────────────────────────
function AIWritingTab() {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<"blog" | "article">("article");
  const [generated, setGenerated] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();

  const { data: settings } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });

  const saveKeyMutation = useMutation({
    mutationFn: () => apiPost("/api/admin/settings", { key: "openai_key", value: apiKey }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings"] }); toast({ title: "API key saved!" }); },
  });

  const generateMutation = useMutation({
    mutationFn: () => apiPost("/api/admin/ai/generate", { prompt, type }),
    onSuccess: (data) => { setGenerated(data); toast({ title: "Content generated!", description: "Review and publish below." }); },
    onError: (e: any) => toast({ title: "Generation failed", description: e.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: () => apiPost(type === "blog" ? "/api/admin/posts" : "/api/admin/articles", { ...generated, published: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type === "blog" ? "/api/posts" : "/api/articles"] });
      toast({ title: "Published!", description: `Your ${type} has been published.` });
      setGenerated(null); setPrompt("");
    },
    onError: (e: any) => toast({ title: "Publish failed", description: e.message, variant: "destructive" }),
  });

  const hasKey = settings?.openai_key_set === "true";

  return (
    <div className="space-y-6">
      {/* API Key Setup */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <CardTitle className="flex items-center gap-2 text-purple-900"><Sparkles className="h-5 w-5" /> ChatGPT AI Integration</CardTitle>
          <CardDescription>Connect your OpenAI API key to auto-generate blog posts and articles using ChatGPT.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className={`flex items-start gap-3 p-3 rounded-lg ${hasKey ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
            {hasKey ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />}
            <p className="text-sm">{hasKey ? "OpenAI API key is configured. You can generate content below." : "No API key configured. Enter your OpenAI API key to enable AI writing."}</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                data-testid="input-openai-key"
              />
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button onClick={() => saveKeyMutation.mutate()} disabled={!apiKey || saveKeyMutation.isPending} className="gap-2 bg-purple-600 hover:bg-purple-500 text-white">
              {saveKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save Key
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">platform.openai.com</a>. Uses GPT-4o mini for cost efficiency.</p>
        </CardContent>
      </Card>

      {/* Generate Content */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500" /> Generate Content</CardTitle>
          <CardDescription>Describe the topic you want to write about. AI will generate a full post with SEO meta tags.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-2">
            {(["article", "blog"] as const).map(t => (
              <Button key={t} variant={type === t ? "default" : "outline"} size="sm" onClick={() => setType(t)} className={type === t ? "bg-purple-600 hover:bg-purple-500" : ""}>
                {t === "article" ? <FileText className="h-4 w-4 mr-1" /> : <BookOpen className="h-4 w-4 mr-1" />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">What should the AI write about?</label>
            <Textarea
              placeholder={`E.g. "Write a detailed article about how to register a Private Limited company in India, covering the step-by-step process, required documents, fees, and common mistakes to avoid."`}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={4}
              data-testid="input-ai-prompt"
            />
          </div>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!prompt.trim() || generateMutation.isPending}
            className="gap-2 bg-purple-600 hover:bg-purple-500 text-white"
            data-testid="button-ai-generate"
          >
            {generateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate with ChatGPT</>}
          </Button>

          {generated && (
            <div className="mt-4 space-y-4 p-4 bg-slate-50 rounded-xl border">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">{generated.title}</h3>
                <Badge className="bg-purple-100 text-purple-700">AI Generated</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{generated.excerpt}</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p><strong>Slug:</strong> {generated.slug}</p>
                <p><strong>Category:</strong> {generated.category}</p>
                <p><strong>Meta Title:</strong> {generated.metaTitle}</p>
                <p><strong>Keywords:</strong> {generated.metaKeywords}</p>
              </div>
              <details className="rounded border bg-white">
                <summary className="px-3 py-2 cursor-pointer text-sm font-medium">Preview Content</summary>
                <div className="px-3 pb-3 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">{generated.content?.slice(0, 1000)}{(generated.content?.length || 0) > 1000 ? "…" : ""}</div>
              </details>
              <div className="flex gap-3">
                <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="gap-2 bg-green-600 hover:bg-green-500 text-white">
                  {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Publish {type}
                </Button>
                <Button variant="outline" onClick={() => setGenerated(null)}>Discard</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AutoBlogSchedulerCard hasKey={hasKey} />
    </div>
  );
}

// ─── Auto-Blog Scheduler Card ─────────────────────────────────────────────────
function AutoBlogSchedulerCard({ hasKey }: { hasKey: boolean }) {
  const [newTopic, setNewTopic] = useState("");
  const [newType, setNewType] = useState<"blog" | "article">("blog");
  const { toast } = useToast();

  const { data: settings = {} } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });
  const { data: topics = [] } = useQuery<any[]>({ queryKey: ["/api/admin/ai/topics"] });

  const enabled = settings.auto_blog_enabled === "on";
  const frequency = settings.auto_blog_frequency || "weekly";

  const saveSettings = useMutation({
    mutationFn: (vals: Record<string, string>) => apiPost("/api/admin/settings/bulk", vals),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/settings"] }),
    onError: (e: any) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  const addTopic = useMutation({
    mutationFn: () => apiPost("/api/admin/ai/topics", { topic: newTopic, type: newType }),
    onSuccess: () => { setNewTopic(""); queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/topics"] }); toast({ title: "Topic queued!" }); },
    onError: (e: any) => toast({ title: "Failed to add topic", description: e.message, variant: "destructive" }),
  });

  const deleteTopic = useMutation({
    mutationFn: (id: number) => apiDel(`/api/admin/ai/topics/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/topics"] }),
  });

  const retryTopic = useMutation({
    mutationFn: (id: number) => apiPost(`/api/admin/ai/topics/${id}/retry`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/topics"] }),
  });

  const pending = topics.filter(t => t.status === "pending").length;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
        <CardTitle className="flex items-center gap-2 text-indigo-900"><Sparkles className="h-5 w-5" /> Auto-Blog Scheduler</CardTitle>
        <CardDescription>Queue topics and the site will automatically generate and publish posts on schedule — no manual work needed.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {!hasKey && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm">Add your OpenAI API key above first — the scheduler needs it to generate content.</p>
          </div>
        )}

        {/* Enable + frequency */}
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" data-testid="toggle-auto-blog"
            onClick={() => saveSettings.mutate({ auto_blog_enabled: enabled ? "" : "on" })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-indigo-600" : "bg-slate-300"}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className="text-sm font-semibold text-slate-700">{enabled ? "Auto-publishing is ON" : "Auto-publishing is OFF"}</span>
          <div className="flex gap-1.5 ml-auto">
            {(["daily", "weekly"] as const).map(f => (
              <button key={f} type="button" onClick={() => saveSettings.mutate({ auto_blog_frequency: f })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-all ${
                  frequency === f ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 text-slate-600 hover:border-indigo-400"
                }`}>{f}</button>
            ))}
          </div>
        </div>
        {settings.auto_blog_last_run && (
          <p className="text-xs text-muted-foreground">Last auto-published: {new Date(settings.auto_blog_last_run).toLocaleString()}</p>
        )}

        {/* Add topic */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Add a topic to the queue</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder={`E.g. "Step-by-step guide to GST registration for small businesses in India"`}
              value={newTopic} onChange={e => setNewTopic(e.target.value)} className="flex-1" data-testid="input-auto-topic" />
            <div className="flex gap-2">
              {(["blog", "article"] as const).map(t => (
                <Button key={t} type="button" variant={newType === t ? "default" : "outline"} size="sm"
                  onClick={() => setNewType(t)} className={newType === t ? "bg-indigo-600 hover:bg-indigo-500" : ""}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
              <Button onClick={() => addTopic.mutate()} disabled={newTopic.trim().length < 10 || addTopic.isPending}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white" data-testid="button-add-topic">
                {addTopic.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "+"} Queue
              </Button>
            </div>
          </div>
        </div>

        {/* Topic queue */}
        {topics.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">{pending} pending topic{pending === 1 ? "" : "s"} · publishes one per {frequency === "daily" ? "day" : "week"}</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {topics.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-white text-sm">
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{t.type}</Badge>
                  <span className="flex-1 truncate" title={t.topic}>{t.topic}</span>
                  {t.status === "pending" && <Badge className="bg-slate-100 text-slate-600 shrink-0">Queued</Badge>}
                  {t.status === "generated" && <Badge className="bg-green-100 text-green-700 shrink-0">Published</Badge>}
                  {t.status === "failed" && (
                    <>
                      <Badge className="bg-red-100 text-red-700 shrink-0" title={t.errorMessage}>Failed</Badge>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => retryTopic.mutate(t.id)}>Retry</Button>
                    </>
                  )}
                  {t.status !== "generated" && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteTopic.mutate(t.id)} data-testid={`button-delete-topic-${t.id}`}>✕</Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── SEO & Settings Tab ────────────────────────────────────────────────────────
function SeoTab() {
  const { data: settings = {}, isLoading } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });
  const [form, setForm] = useState({ site_title: "", site_description: "", site_keywords: "", og_image: "", robots_txt: "" });
  const [adminEmail, setAdminEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (settings) setForm({
      site_title: settings.site_title || "",
      site_description: settings.site_description || "",
      site_keywords: settings.site_keywords || "",
      og_image: settings.og_image || "",
      robots_txt: settings.robots_txt || "",
    });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => fetch("/api/admin/settings/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings"] }); toast({ title: "Settings saved!" }); },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const addAdminMutation = useMutation({
    mutationFn: () => apiPost("/api/admin/add-admin", { email: adminEmail }),
    onSuccess: () => { setAdminEmail(""); toast({ title: "Admin added!", description: adminEmail }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* SEO Meta */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
          <CardTitle className="flex items-center gap-2 text-green-900"><Search className="h-5 w-5" /> SEO & Meta Tags</CardTitle>
          <CardDescription>These settings control how search engines and social media see your site.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Site Title</label>
            <Input placeholder="IndiaCorpDB — Indian Company Directory" value={form.site_title} onChange={e => setForm(p => ({ ...p, site_title: e.target.value }))} data-testid="input-seo-title" />
            <p className="text-xs text-muted-foreground">Recommended: 50–60 characters</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Meta Description</label>
            <Textarea placeholder="Search, browse and discover detailed information about 20L+ Indian companies..." value={form.site_description} onChange={e => setForm(p => ({ ...p, site_description: e.target.value }))} rows={3} data-testid="input-seo-description" />
            <p className="text-xs text-muted-foreground">Recommended: 120–160 characters. Current: {form.site_description.length}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Keywords</label>
            <Input placeholder="indian company directory, CIN lookup, MCA records, company registration" value={form.site_keywords} onChange={e => setForm(p => ({ ...p, site_keywords: e.target.value }))} data-testid="input-seo-keywords" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">OG Image URL</label>
            <Input placeholder="https://your-site.com/og-image.png" value={form.og_image} onChange={e => setForm(p => ({ ...p, og_image: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Social share preview image (1200×630px recommended)</p>
          </div>

          {/* Sitemap hint */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>Sitemap auto-updates</strong> — new blog posts and articles are automatically added to <a href="/sitemap.xml" target="_blank" className="underline">/sitemap.xml</a>. <a href="/robots.txt" target="_blank" className="underline">/robots.txt</a> is also auto-generated.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Custom robots.txt</label>
            <Textarea placeholder={`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://yoursite.com/sitemap.xml`} value={form.robots_txt} onChange={e => setForm(p => ({ ...p, robots_txt: e.target.value }))} rows={4} className="font-mono text-xs" />
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2 bg-green-600 hover:bg-green-500 text-white" data-testid="button-save-seo">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Admin Management */}
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-slate-500" /> Admin Access</CardTitle>
          <CardDescription>Add email addresses that should have admin access. Admins can log in with a password at /admin/login, or via Replit OAuth.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>How to log in as admin:</strong> Go to <strong>/admin/login</strong> and sign in with your admin email and password, or use Replit OAuth via the "Log In" button in the navbar. You can change your password in the <strong>Account</strong> tab.
            </div>
          </div>
          <div className="flex gap-2">
            <Input placeholder="admin@example.com" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} data-testid="input-admin-email" />
            <Button onClick={() => addAdminMutation.mutate()} disabled={!adminEmail || addAdminMutation.isPending} className="gap-2">
              {addAdminMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Admin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Site Settings Tab ────────────────────────────────────────────────────────
function SiteSettingsTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    site_name: "", contact_email: "", support_phone: "", footer_text: "",
    announcement: "", maintenance_mode: "", social_twitter: "", social_linkedin: "", social_facebook: "",
  });

  const { data: settings, isLoading } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });
  useEffect(() => {
    if (settings) setForm(p => ({
      ...p,
      ...Object.fromEntries(Object.keys(p).map(k => [k, (settings as any)[k] ?? ""])),
    }));
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => apiPost("/api/admin/settings/bulk", form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings"] }); toast({ title: "Site settings saved!" }); },
    onError: (e: any) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const field = (key: keyof typeof form, label: string, placeholder: string, hint?: string) => (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <Input placeholder={placeholder} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-slate-600" /> Site Settings</CardTitle>
          <CardDescription>General site configuration — name, contact details, announcements and social links.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("site_name", "Site Name", "AddressBay")}
            {field("contact_email", "Contact Email", "support@addressbay.com")}
            {field("support_phone", "Support Phone", "+91 98765 43210")}
            {field("footer_text", "Footer Text", "© AddressBay. All rights reserved.")}
          </div>
          {field("announcement", "Announcement Banner", "e.g. New: UK company data now available!", "Shown site-wide when set. Leave empty to hide.")}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Maintenance Mode</label>
            <select className="border rounded-lg px-3 py-2 text-sm w-full sm:w-64"
              value={form.maintenance_mode} onChange={e => setForm(p => ({ ...p, maintenance_mode: e.target.value }))}>
              <option value="">Off</option>
              <option value="on">On — show maintenance notice</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {field("social_twitter", "Twitter / X URL", "https://x.com/addressbay")}
            {field("social_linkedin", "LinkedIn URL", "https://linkedin.com/company/addressbay")}
            {field("social_facebook", "Facebook URL", "https://facebook.com/addressbay")}
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save Site Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Account Tab (change password, session) ──────────────────────────────────
function AccountTab() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);

  const changeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message || "Failed to change password"); }
    },
    onSuccess: () => {
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast({ title: "Password changed", description: "Use your new password next time you log in." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const logout = async () => {
    await fetch("/api/admin/logout-local", { method: "POST", credentials: "include" });
    queryClient.invalidateQueries();
    setLocation("/admin/login");
  };

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <div className="space-y-6 max-w-xl">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-600" /> Change Password</CardTitle>
          <CardDescription>Update the password you use at /admin/login.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Current Password</label>
            <Input type={show ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} data-testid="input-current-password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">New Password</label>
            <Input type={show ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} data-testid="input-new-password" />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Confirm New Password</label>
            <Input type={show ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} data-testid="input-confirm-password" />
            {mismatch && <p className="text-xs text-red-600">Passwords do not match.</p>}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} className="rounded" /> Show passwords
          </label>
          <Button
            disabled={!currentPassword || newPassword.length < 8 || newPassword !== confirmPassword || changeMutation.isPending}
            onClick={() => changeMutation.mutate()}
            className="gap-2" data-testid="button-change-password">
            {changeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Change Password
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base"><XCircle className="h-5 w-5 text-red-500" /> Session</CardTitle>
          <CardDescription>Sign out of the admin portal on this device.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={logout} data-testid="button-logout">
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sidebar navigation config ───────────────────────────────────────────────
const NAV_SECTIONS: { label: string; items: { value: string; label: string; icon: any }[] }[] = [
  {
    label: "Company Data",
    items: [
      { value: "upload", label: "Data Import", icon: Upload },
      { value: "import-jobs", label: "Import Jobs", icon: ClipboardList },
      { value: "bulk-edit", label: "Bulk Edit", icon: Pencil },
      { value: "badges", label: "Badges", icon: ShieldAlert },
    ],
  },
  {
    label: "Moderation",
    items: [
      { value: "claims", label: "Claims", icon: ShieldAlert },
      { value: "suggestions", label: "Corrections", icon: AlertCircle },
      { value: "reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    label: "Content",
    items: [
      { value: "articles", label: "Articles", icon: FileText },
      { value: "blog", label: "Blog Posts", icon: BookOpen },
      { value: "ai", label: "AI Writing", icon: Sparkles },
      { value: "services", label: "Service Links", icon: Link2 },
    ],
  },
  {
    label: "Audience",
    items: [
      { value: "analytics", label: "Analytics", icon: BarChart2 },
      { value: "users", label: "Users", icon: Users },
      { value: "newsletter", label: "Newsletter", icon: Mail },
    ],
  },
  {
    label: "Settings",
    items: [
      { value: "seo", label: "SEO & Admins", icon: Search },
      { value: "site-settings", label: "Site Settings", icon: Settings },
      { value: "account", label: "Account", icon: Users },
    ],
  },
];

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  "upload": { title: "Data Import", subtitle: "Upload country-specific company data files." },
  "import-jobs": { title: "Import Jobs", subtitle: "Track the status of background imports." },
  "bulk-edit": { title: "Bulk Edit", subtitle: "Update any field across many companies at once." },
  "badges": { title: "Badges", subtitle: "Assign verified, featured, claimed and premium badges." },
  "claims": { title: "Claim Requests", subtitle: "Approving marks the company as claimed automatically." },
  "suggestions": { title: "Data Corrections", subtitle: "Approving applies the change to the company record." },
  "reviews": { title: "Reviews", subtitle: "Moderate user-submitted company reviews." },
  "articles": { title: "Articles", subtitle: "Create and manage knowledge articles." },
  "blog": { title: "Blog Posts", subtitle: "Create and manage blog content." },
  "ai": { title: "AI Writing", subtitle: "Generate blog and article content with AI." },
  "services": { title: "Service Links", subtitle: "Add sidebar services via external URL or file upload." },
  "analytics": { title: "Analytics", subtitle: "Directory statistics at a glance." },
  "users": { title: "Users", subtitle: "Registered user accounts." },
  "newsletter": { title: "Newsletter", subtitle: "Subscriber list and export." },
  "seo": { title: "SEO & Admins", subtitle: "Meta tags, robots.txt and admin access." },
  "site-settings": { title: "Site Settings", subtitle: "Site name, contact details and social links." },
  "account": { title: "Account", subtitle: "Change your password and manage your session." },
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const defaultTab = new URLSearchParams(search).get("tab") || "upload";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: adminCheck, isLoading: adminLoading } = useIsAdmin();

  useEffect(() => {
    // Redirect to admin login if neither OAuth-authenticated nor a password-session admin
    if (!authLoading && !adminLoading && !isAuthenticated && !adminCheck?.isAdmin) {
      setLocation("/admin/login");
    }
  }, [authLoading, adminLoading, isAuthenticated, adminCheck, setLocation]);

  if (authLoading || adminLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-3xl font-bold font-display mb-2">Access Denied</h1>
          <p className="text-muted-foreground max-w-md mb-4">You do not have administrative privileges.</p>
          <Button onClick={() => setLocation("/admin/login")}>Go to Admin Login</Button>
        </div>
      </div>
    );
  }

  const selectTab = (value: string) => {
    setActiveTab(value);
    window.history.replaceState(null, "", `/admin?tab=${value}`);
  };

  const header = TAB_TITLES[activeTab] || TAB_TITLES["upload"];

  const renderTab = () => {
    switch (activeTab) {
      case "upload": return (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-white border-b">
                <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Bulk Data Import</CardTitle>
                <CardDescription>Upload Excel (.xlsx, .xls), CSV or XML files containing company records.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 bg-slate-50/50"><FileUpload /></CardContent>
            </Card>
          </div>
          <div>
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-3">
                <CardTitle className="text-blue-900 text-base">Supported Columns</CardTitle>
                <CardDescription className="text-xs">Column names are flexible — the system auto-detects common variations.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3">
                {[["Required", ["Name", "Company Name"]], ["Identification", ["CIN", "Registration Number", "ACN", "UEN", "Company Number"]], ["Company Info", ["Status", "Class", "Category", "ROC", "Country"]], ["Financials", ["Authorized Capital", "Paid Up Capital"]], ["Location", ["State", "City", "Pincode", "Address"]], ["Dates", ["Incorporation Date", "Last AGM Date", "Last Balance Sheet Date"]]].map(([label, cols]: any) => (
                  <div key={label}>
                    <p className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> {label}</p>
                    <div className="flex flex-wrap gap-1">{cols.map((c: string) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      );
      case "import-jobs": return <ImportJobsTab />;
      case "claims": return <ClaimsTab />;
      case "suggestions": return <SuggestionsTab />;
      case "reviews": return <ReviewsAdminTab />;
      case "newsletter": return <NewsletterAdminTab />;
      case "analytics": return <AnalyticsTab />;
      case "bulk-edit": return <BulkEditTab />;
      case "badges": return <BadgesAdminTab />;
      case "users": return <UsersAdminTab />;
      case "services": return <ServicesTab />;
      case "articles": return <ArticlesTab />;
      case "blog": return <BlogTab />;
      case "ai": return <AIWritingTab />;
      case "seo": return <SeoTab />;
      case "site-settings": return <SiteSettingsTab />;
      case "account": return <AccountTab />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <div className="flex">
        {/* ── Left sidebar ── */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] sticky top-16 self-start">
          <div className="px-5 py-5 border-b border-slate-800">
            <p className="text-white font-bold font-display text-lg leading-tight">Admin Panel</p>
            <p className="text-[11px] text-slate-400 mt-0.5">AddressBay control center</p>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 space-y-5">
            {NAV_SECTIONS.map(section => (
              <div key={section.label}>
                <p className="px-5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{section.label}</p>
                <div className="space-y-0.5 px-2">
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const active = activeTab === item.value;
                    return (
                      <button key={item.value} onClick={() => selectTab(item.value)}
                        data-testid={`nav-${item.value}`}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          active
                            ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}>
                        <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="px-5 py-4 border-t border-slate-800 text-[11px] text-slate-500">
            Signed in as admin
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0">
          {/* Mobile nav: horizontal scroll pills */}
          <div className="lg:hidden sticky top-16 z-10 bg-white border-b px-4 py-2 overflow-x-auto">
            <div className="flex gap-1.5 w-max">
              {NAV_SECTIONS.flatMap(s => s.items).map(item => (
                <button key={item.value} onClick={() => selectTab(item.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                    activeTab === item.value ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600"
                  }`}>{item.label}</button>
              ))}
            </div>
          </div>

          <div className="px-4 sm:px-8 py-8 max-w-6xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900">{header.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{header.subtitle}</p>
            </div>
            {renderTab()}
          </div>
        </main>
      </div>
    </div>
  );
}
