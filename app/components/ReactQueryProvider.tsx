"use client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React, { useState } from 'react';

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // Ensure a new QueryClient per app instance
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity, // Data doesn't become stale automatically
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false, // Don't auto-refetch when user switches tabs
        refetchOnReconnect: false, // Don't auto-refetch on reconnect
        refetchOnMount: false, // Don't auto-refetch when component mounts
      },
    },
  }));
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
} 