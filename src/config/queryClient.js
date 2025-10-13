// src/config/queryClient.js - React Query configuration
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // ⚡ Keep unused data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // ⚡ Retry failed requests 1 time
      retry: 1,
      // ⚡ Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // ⚡ Don't refetch on mount if data is fresh
      refetchOnMount: false,
      // ⚡ Don't refetch on reconnect if data is fresh
      refetchOnReconnect: false,
    },
  },
});
