import { z } from 'zod';

export const CERTIFICATE_NO_EXAMPLE = 'IP-2026-000123';

/** Certificate numbers are case-insensitive for people typing them: trim + uppercase. */
export function normalizeCertificateNo(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

/**
 * Public verification form (SN12). Deliberately lenient: the server is the source of truth
 * and answers 404 for numbers it does not know.
 */
export const verifySchema = z.object({
  certificateNo: z
    .string()
    .transform(normalizeCertificateNo)
    .pipe(
      z
        .string()
        .min(1, 'Enter the certificate number.')
        .max(40, 'That number is too long. Check it and try again.')
        .regex(/^[A-Z0-9-]+$/, 'Use only letters, numbers and hyphens, e.g. IP-2026-000123.'),
    ),
});

export default verifySchema;
