import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertCompany, type Company } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// === TYPES ===
interface CompanyListResponse {
  data: Company[];
  total: number;
  page: number;
  limit: number;
}

interface CompanyQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

// === QUERIES ===

export function useCompanies(params: CompanyQueryParams) {
  return useQuery({
    queryKey: [api.companies.list.path, params],
    queryFn: async () => {
      const url = buildUrl(api.companies.list.path);
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append("search", params.search);
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      
      const res = await fetch(`${url}?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch companies");
      return (await res.json()) as CompanyListResponse;
    },
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });
}

export function useCompany(id: number) {
  return useQuery({
    queryKey: [api.companies.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.companies.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch company details");
      return (await res.json()) as Company;
    },
    enabled: !!id && id > 0,
  });
}

export function useCompanyBySlug(countryCode: string, slug: string) {
  return useQuery({
    queryKey: ["company-by-slug", countryCode, slug],
    queryFn: async () => {
      const res = await fetch(`/api/${countryCode}/company/${slug}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch company details");
      return (await res.json()) as Company;
    },
    enabled: !!(countryCode && slug),
  });
}

export function useRelatedCompanies(companyId: number) {
  return useQuery({
    queryKey: ["related-companies", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/related`);
      if (!res.ok) return [] as Company[];
      return (await res.json()) as Company[];
    },
    enabled: !!companyId,
  });
}

// === MUTATIONS (Admin Only) ===

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertCompany) => {
      const res = await fetch(api.companies.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create company");
      }
      return (await res.json()) as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.companies.list.path] });
      toast({ title: "Success", description: "Company created successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertCompany>) => {
      const url = buildUrl(api.companies.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update company");
      }
      return (await res.json()) as Company;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.companies.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.companies.get.path, data.id] });
      toast({ title: "Success", description: "Company updated successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.companies.delete.path, { id });
      const res = await fetch(url, { 
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete company");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.companies.list.path] });
      toast({ title: "Success", description: "Company deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}

export function useUploadCompanies() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.companies.upload.path, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload file");
      }
      return (await res.json()) as { message: string; totalRows: number; inserted: number; skipped: number; skippedDetails: { row: number; reason: string }[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.companies.list.path] });
      toast({ 
        title: "Import Successful", 
        description: `${data.inserted} of ${data.totalRows} records imported. ${data.skipped > 0 ? `${data.skipped} skipped.` : ''}` 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Import Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}
