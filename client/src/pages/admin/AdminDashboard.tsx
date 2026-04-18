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
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Service } from "@shared/schema";
import {
  Upload, Users, ShieldAlert, BookOpen, CheckCircle2,
  Link2, Plus, Trash2, ExternalLink, Globe, Loader2
} from "lucide-react";

function ServicesTab() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("🔗");

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; url: string; icon: string }) => {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, isActive: true, order: services.length }),
      });
      if (!res.ok) throw new Error("Failed to add service");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setTitle("");
      setDescription("");
      setUrl("https://startupcaservices.com/");
      setIcon("🔗");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/services"] }),
  });

  const handleAdd = () => {
    if (!title.trim() || !url.trim()) return;
    addMutation.mutate({ title: title.trim(), description: description.trim(), url: url.trim(), icon: icon.trim() || "🔗" });
  };

  return (
    <div className="space-y-6">
      {/* Add Service Form */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Link2 className="h-5 w-5" />
            Add Service Link
          </CardTitle>
          <CardDescription>
            Add relevant service links from <a href="https://startupcaservices.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 font-semibold hover:underline">startupcaservices.com</a> — they'll appear on the home page.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Service Title <span className="text-red-500">*</span></label>
              <Input
                placeholder="e.g. GST Registration"
                value={title}
                onChange={e => setTitle(e.target.value)}
                data-testid="input-service-title"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Icon (emoji)</label>
              <Input
                placeholder="e.g. 📋"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                data-testid="input-service-icon"
                className="w-24"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">URL <span className="text-red-500">*</span></label>
            <Input
              placeholder="https://startupcaservices.com/gst-registration"
              value={url}
              onChange={e => setUrl(e.target.value)}
              data-testid="input-service-url"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Short Description</label>
            <Input
              placeholder="e.g. Expert GST registration for your business"
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="input-service-description"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!title.trim() || !url.trim() || addMutation.isPending}
            className="bg-orange-600 hover:bg-orange-500 text-white gap-2"
            data-testid="button-add-service"
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Service
          </Button>
          {addMutation.isError && <p className="text-sm text-red-500">Failed to add. Please try again.</p>}
          {addMutation.isSuccess && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Service added successfully!</p>}
        </CardContent>
      </Card>

      {/* Existing Services */}
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Globe className="h-5 w-5 text-slate-500" /> Live Service Links</span>
            <Badge variant="secondary">{services.length} total</Badge>
          </CardTitle>
          <CardDescription>These links appear in the "Recommended Services" section on the home page.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Link2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No services added yet. Add your first service link above.</p>
            </div>
          ) : (
            <div className="divide-y">
              {services.map(svc => (
                <div key={svc.id} data-testid={`service-row-${svc.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-xl flex-shrink-0 shadow">
                    {svc.icon || "🔗"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{svc.title}</p>
                    {svc.description && <p className="text-xs text-muted-foreground truncate">{svc.description}</p>}
                    <a href={svc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 mt-0.5">
                      {svc.url.length > 50 ? svc.url.slice(0, 50) + "…" : svc.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Badge variant={svc.isActive ? "default" : "secondary"} className={svc.isActive ? "bg-green-100 text-green-700 border-green-200" : ""}>
                    {svc.isActive ? "Active" : "Hidden"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(svc.id)}
                    disabled={deleteMutation.isPending}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    data-testid={`button-delete-service-${svc.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: adminCheck, isLoading: adminLoading } = useIsAdmin();

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!isAuthenticated) {
        setLocation("/");
      }
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
          <p className="text-muted-foreground max-w-md">
            You do not have administrative privileges to access this area.
          </p>
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
            <p className="text-muted-foreground">Manage company data, content and service links.</p>
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
            <TabsTrigger value="content" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4 mr-2" /> Content
            </TabsTrigger>
            <TabsTrigger value="users" disabled className="data-[state=active]:bg-muted">
              <Users className="h-4 w-4 mr-2" /> Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card className="border-0 shadow-lg overflow-hidden">
                  <CardHeader className="bg-white border-b">
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-primary" />
                      Bulk Data Import
                    </CardTitle>
                    <CardDescription>
                      Upload Excel (.xlsx, .xls) or CSV files containing company records.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 bg-slate-50/50">
                    <FileUpload />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="border-0 shadow-md">
                  <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-3">
                    <CardTitle className="text-blue-900 text-base">Supported Columns</CardTitle>
                    <CardDescription className="text-xs">Column names are flexible — the system auto-detects common variations.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 text-xs space-y-3">
                    <div>
                      <p className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Required
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {["Name", "Company Name"].map(c => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 mb-1.5">Identification</p>
                      <div className="flex flex-wrap gap-1">
                        {["CIN", "Registration Number"].map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 mb-1.5">Company Info</p>
                      <div className="flex flex-wrap gap-1">
                        {["Status", "Class", "Category", "Sub Category", "ROC", "Country"].map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 mb-1.5">Financials</p>
                      <div className="flex flex-wrap gap-1">
                        {["Authorized Capital", "Paid Up Capital"].map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 mb-1.5">Location</p>
                      <div className="flex flex-wrap gap-1">
                        {["State", "City", "Pincode", "Address"].map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 mb-1.5">Dates (YYYY-MM-DD)</p>
                      <div className="flex flex-wrap gap-1">
                        {["Incorporation Date", "Last AGM Date", "Last Balance Sheet Date"].map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                      </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2.5 text-[11px] text-yellow-800">
                      <strong>Tip:</strong> Use "Download Sample Template" in the upload area for a ready-to-fill CSV.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="services">
            <ServicesTab />
          </TabsContent>

          <TabsContent value="content">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Blog Posts</CardTitle>
                  <CardDescription>Create and manage corporate insights.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Add New Post</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>FAQs</CardTitle>
                  <CardDescription>Manage frequently asked questions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Add New FAQ</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">Coming soon...</p></CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
