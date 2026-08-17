import { useQuery } from "@tanstack/react-query";

export function useIsAdmin() {
  return useQuery({
    queryKey: ["/api/admin/auth/me"],
    queryFn: async () => {
      const res = await fetch("https://api.addressbay.com/api/admin/auth/me", {
        credentials: "include",
      });

      if (!res.ok) {
        return { isAdmin: false };
      }

      return (await res.json()) as {
        isAdmin: boolean;
        authenticated?: boolean;
        email?: string;
      };
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
