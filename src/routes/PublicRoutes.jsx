import Layout from '@/shared/components/layout/Layout';
import {
  CatalogPage,
  DesignationDetailPage,
  ForbiddenPage,
  HomePage,
  NotFoundPage,
  TeamInvitePage,
  TermsPage,
  UiKitPage,
  VerifyCertificatePage,
} from './lazyPages';

/** Public marketing, catalog, terms, certificate verification and team-invite pages. */
export const publicRoutes = {
  element: <Layout />,
  children: [
    { index: true, element: <HomePage /> },
    { path: 'internships', element: <CatalogPage /> },
    { path: 'internships/:slug', element: <DesignationDetailPage /> },
    { path: 'terms', element: <TermsPage /> },
    { path: 'verify', element: <VerifyCertificatePage /> },
    { path: 'verify/:number', element: <VerifyCertificatePage /> },
    { path: 'team/invite/:token', element: <TeamInvitePage /> },
    { path: 'dev/ui', element: <UiKitPage /> },
    { path: '403', element: <ForbiddenPage /> },
    { path: '*', element: <NotFoundPage /> },
  ],
};

export default publicRoutes;
