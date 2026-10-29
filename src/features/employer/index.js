/**
 * Admin catalog (KD3, KD4): designations, domains, internship plans and pricing.
 * Pages are lazy-loaded by the router (src/routes/lazyPages.js).
 */
export { CatalogTabs } from './components/CatalogTabs';
export { CatalogTable } from './components/CatalogTable';
export { CatalogItemDialog } from './components/CatalogItemDialog';
export { CatalogManager } from './components/CatalogManager';
export { CatalogRowActions } from './components/CatalogRowActions';
export { StatusChangeDialog, UNPUBLISH_NOTE } from './components/StatusChangeDialog';
export { PostInternshipForm, DUPLICATE_PLAN_MESSAGE } from './components/PostInternshipForm';
export { PlanDialog } from './components/PlanDialog';
export { PlansTable, describePlan } from './components/PlansTable';
export {
  CATALOG_KINDS,
  getCatalogKind,
  invalidateCatalogQueries,
  useCatalogOptions,
  useCreateCatalogItem,
  useUpdateCatalogItem,
  useSetCatalogStatus,
} from './hooks/useCatalogAdmin';
export {
  fetchAdminPlans,
  useAdminPlans,
  useCreatePlan,
  useUpdatePlan,
  useSetPlanStatus,
} from './hooks/useEmployerInternships';
export {
  catalogItemSchema,
  planCreateSchema,
  planUpdateSchema,
  parseRupeeInput,
  paiseToRupeeInput,
} from './schemas/catalogValidation';
