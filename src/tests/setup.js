import '@testing-library/jest-dom/vitest';
import '@/shared/utils/zodCompat';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '@/mocks/server';
import { resetDb } from '@/mocks/db';
import { queryClient } from '@/services/queryClient';
import { clearAccessToken } from '@/services/api';

// --- Browser APIs jsdom does not implement -------------------------------------------

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver || ResizeObserverStub;
window.IntersectionObserver =
  window.IntersectionObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock-preview');
  URL.revokeObjectURL = vi.fn();
}

// --- Mock API (same handlers as the browser worker) ----------------------------------

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetDb();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  queryClient.clear();
  clearAccessToken();
});

afterAll(() => {
  server.close();
});
