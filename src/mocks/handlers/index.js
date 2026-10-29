import { authHandlers } from './auth';
import { catalogHandlers } from './catalog';
import { assessmentHandlers } from './assessment';
import { enrollmentHandlers } from './enrollment';
import { paymentHandlers } from './payments';
import { learningHandlers } from './learning';
import { taskHandlers } from './tasks';
import { teamHandlers } from './teams';
import { githubHandlers } from './github';
import { certificateHandlers } from './certificates';
import { adminHandlers } from './admin';
import { adminCatalogHandlers } from './adminCatalog';
import { adminScheduleHandlers } from './adminSchedules';
import { trainerHandlers } from './trainer';

/**
 * Every mocked endpoint, one file per API area (ticket GP1). Response shapes follow
 * docs/API_CONTRACT.md so a screen can switch to the real API with VITE_USE_MOCKS=false.
 */
export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...assessmentHandlers,
  ...enrollmentHandlers,
  ...paymentHandlers,
  ...learningHandlers,
  ...taskHandlers,
  ...teamHandlers,
  ...githubHandlers,
  ...certificateHandlers,
  ...adminHandlers,
  ...adminCatalogHandlers,
  ...adminScheduleHandlers,
  ...trainerHandlers,
];

export default handlers;
