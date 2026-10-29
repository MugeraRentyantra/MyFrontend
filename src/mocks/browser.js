import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** In-browser mock API, started from main.jsx when VITE_USE_MOCKS=true. */
export const worker = setupWorker(...handlers);
