import { useQuery } from "@tanstack/react-query";
import { Faq, Post, Article, Company } from "@shared/schema";

export function useFaqs() {
  return useQuery<Faq[]>({ queryKey: ["/api/faqs"] });
}

export function usePosts() {
  return useQuery<Post[]>({ queryKey: ["/api/posts"] });
}

export function usePost(slug: string) {
  return useQuery<Post>({ queryKey: ["/api/posts", slug], enabled: !!slug });
}

export function useArticles() {
  return useQuery<Article[]>({ queryKey: ["/api/articles"] });
}

export function useArticle(slug: string) {
  return useQuery<Article>({ queryKey: ["/api/articles", slug], enabled: !!slug });
}

export function useCompanies(params: { search?: string; alphabet?: string; page: number; limit: number }) {
  return useQuery<{ data: Company[]; total: number; page: number; limit: number }>({
    queryKey: ["/api/companies", params],
  });
}

export function useSiteSettings() {
  return useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });
}
