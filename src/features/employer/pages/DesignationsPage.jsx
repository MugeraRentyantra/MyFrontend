import { useDocumentTitle } from '@/shared/hooks';
import { CatalogManager } from '../components/CatalogManager';

/** /admin/designations (KD3) — create, edit, publish and unpublish designations. */
export default function DesignationsPage() {
  useDocumentTitle('Designations');
  return <CatalogManager kind="designation" />;
}
