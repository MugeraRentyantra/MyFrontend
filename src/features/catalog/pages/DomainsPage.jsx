import { useDocumentTitle } from '@/shared/hooks';
import { CatalogManager } from '../components/CatalogManager';

/** /admin/domains (KD3) — create, edit, publish and unpublish domains. */
export default function DomainsPage() {
  useDocumentTitle('Domains');
  return <CatalogManager kind="domain" />;
}
