import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  // Replit Auth is not enabled on the VPS.
  // Treat the user as unauthenticated instead of trying to parse index.html.
  if (response.status === 401 || response.status === 404) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  // The production SPA fallback can return index.html for an unknown API route.
  if (!contentType.includes("application/json")) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  // Local AddressBay admin logout.
  await fetch("https://api.addressbay.com/api/admin/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/check"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/auth/me"],
      });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
