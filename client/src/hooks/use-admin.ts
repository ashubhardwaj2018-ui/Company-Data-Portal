import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useAuth } from "./use-auth";

export function useIsAdmin() {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: [api.admin.check.path],
    queryFn: async () => {
      const res = await fetch(api.admin.check.path, { credentials: "include" });
      if (!res.ok) return { isAdmin: false };
      return (await res.json()) as { isAdmin: boolean };
    },
    enabled: isAuthenticated, // Only check if logged in
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
