import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useIsAdmin() {
  return useQuery({
    queryKey: [api.admin.check.path],
    queryFn: async () => {
      const res = await fetch(api.admin.check.path, { credentials: "include" });
      if (!res.ok) return { isAdmin: false };
      return (await res.json()) as { isAdmin: boolean };
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
