import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiPost, UnauthorizedError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

interface LoginCredentials {
  username: string;
  password: string;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery<AuthUser | null>({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      try {
        return await api<AuthUser>('/api/auth/me');
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      apiPost<AuthUser>('/api/auth/login', credentials),
    onSuccess: (newUser) => {
      queryClient.setQueryData(queryKeys.auth.me(), newUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiPost<void>('/api/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.me(), null);
      queryClient.clear();
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutate,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
  };
}
