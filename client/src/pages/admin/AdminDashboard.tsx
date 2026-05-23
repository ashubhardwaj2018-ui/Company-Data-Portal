import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { Navbar } from "@/components/layout/Navbar";
import { FileUpload } from "@/components/companies/FileUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Info, AlertCircle
} from "lucide-react";
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

// ─── Services Tab ─────────────────────────────────────────────────────────────
function ServicesTab() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("🔗");
  const [imageUrl, setImageUrl] = useState("");
  const { toast } = useToast();

  const { data: services = [], isLoading } = useQuery<Service[]>({ queryKey: ["/api/services"] });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/admin/services", { ...data, isActive: true, order: services.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setTitle(""); setDescription(""); setUrl(""); setIcon("🔗"); setImageUrl("");
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
            Add startup service links from <a href="https://startupcaservices.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 font-semibold hover:underline">startupcaservices.com</a>. They appear in the left/right sidebars on company and article pages.
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
            <label className="text-sm font-semibold text-slate-700">URL *</label>
            <Input placeholder="https://startupcaservices.com/gst" value={url} onChange={e => setUrl(e.target.value)} data-testid="input-service-url" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Service Image URL <span className="text-xs text-muted-foreground">(shown in sidebar)</span></label>
            <Input placeholder="https://example.com/image.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} data-testid="input-service-imageurl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Short Description</label>
            <Input placeholder="Expert GST registration for your business" value={description} onChange={e => setDescription(e.target.value)} data-testid="input-service-description" />
          </div>
          <Button onClick={() => addMutation.mutate({ title, description, url, icon, imageUrl })} disabled={!title.trim() || !url.trim() || addMutation.isPending} className="bg-orange-600 hover:bg-orange-500 text-white gap-2" data-testid="button-add-service">
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

  const hasKey = settings?.openai_key && settings.openai_key.length > 0;

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
    </div>
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
          <CardDescription>Add email addresses that should have admin access. Login is via Replit OAuth — use the "Log In" button at the top.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>How to log in as admin:</strong> Click "Log In" in the top navbar. Sign in with your Replit account. If your Replit account email matches an email in this list, you'll have admin access. Your account <strong>ashubhardwaj2018@gmail.com</strong> is already added.
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

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: adminCheck, isLoading: adminLoading } = useIsAdmin();

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAuthenticated) setLocation("/");
  }, [authLoading, adminLoading, isAuthenticated, setLocation]);

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
          <p className="text-muted-foreground max-w-md">You do not have administrative privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <div className="container-width py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-slate-900">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage company data, content, SEO and service links.</p>
          </div>
        </div>

        <Tabs defaultValue="upload" className="space-y-8">
          <TabsList className="bg-background border p-1 rounded-xl shadow-sm flex-wrap h-auto gap-1">
            <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Upload className="h-4 w-4 mr-2" /> Data Import
            </TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
              <Link2 className="h-4 w-4 mr-2" /> Service Links
            </TabsTrigger>
            <TabsTrigger value="articles" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" /> Articles
            </TabsTrigger>
            <TabsTrigger value="blog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4 mr-2" /> Blog Posts
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Sparkles className="h-4 w-4 mr-2" /> AI Writing
            </TabsTrigger>
            <TabsTrigger value="seo" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" /> SEO & Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card className="border-0 shadow-lg overflow-hidden">
                  <CardHeader className="bg-white border-b">
                    <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Bulk Data Import</CardTitle>
                    <CardDescription>Upload Excel (.xlsx, .xls) or CSV files containing company records.</CardDescription>
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
                    {[["Required", ["Name", "Company Name"]], ["Identification", ["CIN", "Registration Number"]], ["Company Info", ["Status", "Class", "Category", "ROC", "Country"]], ["Financials", ["Authorized Capital", "Paid Up Capital"]], ["Location", ["State", "City", "Pincode", "Address"]], ["Dates", ["Incorporation Date", "Last AGM Date", "Last Balance Sheet Date"]]].map(([label, cols]: any) => (
                      <div key={label}>
                        <p className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> {label}</p>
                        <div className="flex flex-wrap gap-1">{cols.map((c: string) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="services"><ServicesTab /></TabsContent>
          <TabsContent value="articles"><ArticlesTab /></TabsContent>
          <TabsContent value="blog"><BlogTab /></TabsContent>
          <TabsContent value="ai"><AIWritingTab /></TabsContent>
          <TabsContent value="seo"><SeoTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
