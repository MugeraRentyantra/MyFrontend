import { useEffect, useState } from 'react';
import { USE_MOCKS } from '@/shared/constants';

/**
 * Seeded certificate numbers to try on the public verification page — mock mode only.
 * The demo module is imported lazily so it never ships in a real-API build.
 * Returns { valid, revoked } or null.
 */
export function useDemoCertificateNumbers() {
  const [samples, setSamples] = useState(null);

  useEffect(() => {
    if (!USE_MOCKS) return undefined;
    let active = true;
    import('@/mocks/demoAccounts')
      .then((module) => {
        if (active && module?.DEMO_CERTIFICATES) setSamples(module.DEMO_CERTIFICATES);
      })
      .catch(() => {
        // samples are a convenience only
      });
    return () => {
      active = false;
    };
  }, []);

  return samples;
}

export default useDemoCertificateNumbers;
