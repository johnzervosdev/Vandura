'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { GlobalToastProvider } from '@/components/GlobalToastProvider';
import { BugReportFab } from '@/components/BugReportFab';
import { createAppQueryClient } from '@/lib/create-app-query-client';
import { trpc } from '@/lib/trpc-client';
import superjson from 'superjson';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <GlobalToastProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
          <BugReportFab />
        </QueryClientProvider>
      </trpc.Provider>
    </GlobalToastProvider>
  );
}
