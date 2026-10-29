import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import RootLayout from '@/shared/components/layout/RootLayout';
import RouteErrorPage from '@/pages/RouteErrorPage';
import { publicRoutes } from './PublicRoutes';
import { authRoutes } from './AuthRoutes';
import { studentRoutes } from './StudentRoutes';
import { trainerRoutes } from './TrainerRoutes';
import { adminRoutes } from './AdminRoutes';

/**
 * Route tree with four groups (SN1): public, student, trainer and admin (+ auth pages).
 * A data router is used so screens can block in-app navigation (useBlocker) mid-assessment.
 */
export const routes = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [publicRoutes, ...authRoutes, studentRoutes, trainerRoutes, adminRoutes],
  },
];

/** Opt in to React Router v7 behaviour now (also silences the future-flag warnings). */
export const ROUTER_FUTURE = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
};

let browserRouter = null;

function getBrowserRouter() {
  if (!browserRouter) {
    browserRouter = createBrowserRouter(routes, { future: ROUTER_FUTURE });
  }
  return browserRouter;
}

/** Tests can pass a memory router: createMemoryRouter(routes, { initialEntries, future }). */
export default function AppRoutes({ router }) {
  return <RouterProvider router={router ?? getBrowserRouter()} future={{ v7_startTransition: true }} />;
}
