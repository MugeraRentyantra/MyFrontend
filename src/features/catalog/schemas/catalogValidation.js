import { z } from 'zod';
import { DURATION_OPTIONS } from '@/shared/constants';

/**
 * Client-side rules for the admin catalog forms (KD3, KD4). The server re-validates everything;
 * these only give fast, friendly feedback.
 */

export const CATALOG_NAME_MIN = 2;
export const CATALOG_NAME_MAX = 60;
export const CATALOG_DESCRIPTION_MIN = 10;
export const CATALOG_DESCRIPTION_MAX = 500;

/** Highest base price an admin can set, in rupees (₹10,00,000). */
export const PLAN_PRICE_MAX_RUPEES = 1000000;

export const catalogItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(CATALOG_NAME_MIN, `Enter at least ${CATALOG_NAME_MIN} characters.`)
    .max(CATALOG_NAME_MAX, `Keep the name to ${CATALOG_NAME_MAX} characters or fewer.`),
  description: z
    .string()
    .trim()
    .min(CATALOG_DESCRIPTION_MIN, `Write at least ${CATALOG_DESCRIPTION_MIN} characters.`)
    .max(CATALOG_DESCRIPTION_MAX, `Keep the description to ${CATALOG_DESCRIPTION_MAX} characters or fewer.`),
});

const RUPEE_NUMBER = /^\d+(\.\d+)?$/;
const RUPEE_TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;

function stripGrouping(value) {
  return String(value ?? '')
    .trim()
    .replace(/[,\s₹]/g, '');
}

/**
 * Parses what an admin typed in the price box ("12,999.50", "₹12999") into rupees.
 * Returns null when it is not a valid amount with at most 2 decimal places.
 */
export function parseRupeeInput(value) {
  const cleaned = stripGrouping(value);
  if (!cleaned || !RUPEE_TWO_DECIMALS.test(cleaned)) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

/** Paise from the server -> the string shown in the price box (1299900 -> "12999", 999950 -> "9999.5"). */
export function paiseToRupeeInput(paise) {
  if (paise === null || paise === undefined || Number.isNaN(Number(paise))) return '';
  return String(Number(paise) / 100);
}

/** Select values arrive as strings ("3"); the API wants a number from DURATION_OPTIONS. */
const durationField = z
  .union([z.string(), z.number()])
  .transform((value) => (value === '' ? Number.NaN : Number(value)))
  .refine((value) => DURATION_OPTIONS.includes(value), { message: 'Choose a duration.' });

const basePriceField = z.string().superRefine((raw, ctx) => {
  const cleaned = stripGrouping(raw);
  const issue = (message) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  if (!cleaned) {
    issue('Enter the base price in rupees.');
    return;
  }
  if (!RUPEE_NUMBER.test(cleaned)) {
    issue('Enter the price as a number, for example 12999.');
    return;
  }
  if (!RUPEE_TWO_DECIMALS.test(cleaned)) {
    issue('Use at most 2 decimal places.');
    return;
  }
  const amount = Number(cleaned);
  if (!(amount > 0)) {
    issue('The price must be more than ₹0.');
    return;
  }
  if (amount > PLAN_PRICE_MAX_RUPEES) issue('The price can be at most ₹10,00,000.');
});

/** Create a plan: designation + domain + duration + base price (rupees, sent to the API as paise). */
export const planCreateSchema = z.object({
  designationId: z.string().min(1, 'Choose a designation.'),
  domainId: z.string().min(1, 'Choose a domain.'),
  durationMonths: durationField,
  basePrice: basePriceField,
  publishNow: z.boolean().optional().default(false),
});

/** Edit a plan: the designation is fixed; domain, duration and price can change. */
export const planUpdateSchema = z.object({
  domainId: z.string().min(1, 'Choose a domain.'),
  durationMonths: durationField,
  basePrice: basePriceField,
});
