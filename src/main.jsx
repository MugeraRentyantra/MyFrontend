import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/shared/utils/zodCompat';
import '@fontsource-variable/inter';
import './index.css';
import App from './App';
import { USE_MOCKS } from '@/shared/constants';

/**
 * Starts the in-browser mock API (MSW) when VITE_USE_MOCKS=true so every screen works
 * without the backend (ticket GP1). The worker script is generated into /public by
 * `npm install` (see "msw.workerDirectory" in package.json) or `npm run msw:init`.
 */
async function enableMocking() {
  if (!USE_MOCKS) return;
  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      '[mocks] The mock API could not start. Run `npm run msw:init` to generate public/mockServiceWorker.js.',
      error,
    );
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
