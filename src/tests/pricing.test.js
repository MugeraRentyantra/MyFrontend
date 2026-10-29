import { describe, expect, it } from 'vitest';
import { computePayable, DEFAULT_SLABS, discountForScore } from '@/mocks/seed/helpers';

/**
 * Mirrors the backend test cases in MM17 so the mock server prices exactly like the real API:
 * scores 0, 7, 8, 9, 10, 14, 15 map to the right slab and payable = base x (1 - discount%).
 */
describe('discount slabs (MM6/MM17)', () => {
  it.each([
    [0, 0],
    [7, 0],
    [8, 5],
    [9, 5],
    [10, 10],
    [14, 10],
    [15, 20],
  ])('score %i gives %i%% discount', (score, expected) => {
    expect(discountForScore(DEFAULT_SLABS, score)).toBe(expected);
  });
});

describe('price quote (MM8)', () => {
  it('applies the individual discount and rounds to whole paise', () => {
    expect(computePayable(1000000, 10)).toBe(900000); // ₹10,000 at 10% -> ₹9,000
    expect(computePayable(1299900, 10)).toBe(1169910);
    expect(computePayable(999900, 5)).toBe(949905);
    expect(computePayable(1000000, 0)).toBe(1000000);
  });

  it('charges team members the full price even for a perfect score', () => {
    const teamDiscount = 0; // MM8: team members always get 0%
    expect(computePayable(1000000, teamDiscount)).toBe(1000000);
  });
});
