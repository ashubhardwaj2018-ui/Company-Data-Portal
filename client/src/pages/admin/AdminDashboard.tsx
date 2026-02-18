import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { Navbar } from "@/components/layout/Navbar";
import { FileUpload } from "@/components/companies/FileUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Upload, Users, ShieldAlert } from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: adminCheck, isLoading: adminLoading } = useIsAdmin();

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!isAuthenticated) {
        setLocation("/");
      } else if (!adminCheck?.isAdmin) {
        // Optionally redirect non-admins, but let's show access denied UI instead
      }
    }
  }, [authLoading, adminLoading, isAuthenticated, adminCheck, setLocation]);

  if (authLoading || adminLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
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
            Please contact the system administrator if you believe this is an error.
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
            <p className="text-muted-foreground">Manage company data and system settings.</p>
          </div>
        </div>

        <Tabs defaultValue="upload" className="space-y-8">
          <TabsList className="bg-background border p-1 rounded-xl shadow-sm">
            <TabsTrigger value="overview" disabled className="data-[state=active]:bg-muted">Overview</TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Upload className="h-4 w-4 mr-2" /> Data Import
            </TabsTrigger>
            <TabsTrigger value="users" disabled className="data-[state=active]:bg-muted">
              <Users className="h-4 w-4 mr-2" /> Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Stats dashboard coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

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

              <div>
                <Card className="border-0 shadow-md h-full">
                  <CardHeader className="bg-blue-50/50 border-b border-blue-100">
                    <CardTitle className="text-blue-900 text-lg">Instructions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 text-sm space-y-4">
                    <p className="font-medium text-slate-900">Required Columns:</p>
                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                      <li>CIN (Unique Identifier)</li>
                      <li>Company Name</li>
                      <li>Status (Active/Strike Off)</li>
                      <li>Class (Public/Private)</li>
                      <li>Authorized Capital</li>
                      <li>State, City, Pincode</li>
                      <li>Incorporation Date (YYYY-MM-DD)</li>
                    </ul>
                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-xs text-yellow-800 mt-4">
                      <strong>Note:</strong> Large files (over 10MB) may take a few minutes to process. Please do not close the window.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
