import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/services/queryClient';
import { AuthProvider } from '@/shared/context/AuthContext';
import { ErrorBoundary } from '@/shared/components/ui';
import AppRoutes from '@/routes/AppRoutes';

/**
 * Application root: server-state cache, authentication session and the router.
 * Toasts, scroll restoration and the mock devtools live in RootLayout (inside the router).
 */
export default function App({ router }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRoutes router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
