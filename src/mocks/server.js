import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Node mock server for Vitest (see src/tests/setup.js). */
export const server = setupServer(...handlers);
