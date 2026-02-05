/**
 * tRPC Client Configuration
 * Sets up React Query integration for the frontend
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers';

export const trpc = createTRPCReact<AppRouter>();
