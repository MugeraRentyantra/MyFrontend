import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatMoney,
  getInitials,
  humanize,
  isGithubUrl,
  isValidEmail,
  percent,
  pluralize,
  rupeesToPaise,
} from '@/shared/utils/helpers';
import { applyServerErrors, getErrorMessage, getFieldErrors } from '@/shared/utils/errors';
import { getStatusMeta } from '@/shared/constants';

describe('money (paise in, rupees out)', () => {
  it('formats whole rupees without decimals and keeps paise when present', () => {
    expect(formatMoney(999900)).toBe('₹9,999');
    expect(formatMoney(1169910)).toBe('₹11,699.10');
    expect(formatMoney(1000000)).toBe('₹10,000');
  });

  it('uses Indian digit grouping', () => {
    expect(formatMoney(12345600)).toBe('₹1,23,456');
  });

  it('shows a dash for missing values', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
  });

  it('converts admin-entered rupees to integer paise', () => {
    expect(rupeesToPaise('12999')).toBe(1299900);
    expect(rupeesToPaise(10.1)).toBe(1010);
  });
});

describe('text helpers', () => {
  it('pluralizes, humanizes and builds initials', () => {
    expect(pluralize(1, 'task')).toBe('1 task');
    expect(pluralize(3, 'task')).toBe('3 tasks');
    expect(humanize('CHANGES_REQUESTED')).toBe('Changes requested');
    expect(getInitials('Aarav Sharma')).toBe('AS');
    expect(getInitials('Priya')).toBe('P');
    expect(formatDuration(1)).toBe('1 month');
    expect(formatDuration(6)).toBe('6 months');
  });

  it('computes percentages safely', () => {
    expect(percent(2, 12)).toBe(17);
    expect(percent(0, 0)).toBe(0);
  });
});

describe('validation hints', () => {
  it('accepts GitHub repository, commit and pull-request links only', () => {
    expect(isGithubUrl('https://github.com/aarav/java-banking')).toBe(true);
    expect(isGithubUrl('https://github.com/aarav/java-banking/pull/3')).toBe(true);
    expect(isGithubUrl('https://github.com/aarav/java-banking/commit/0a1b2c3d')).toBe(true);
    expect(isGithubUrl('http://github.com/aarav/repo')).toBe(false);
    expect(isGithubUrl('https://gitlab.com/aarav/repo')).toBe(false);
  });

  it('checks email format', () => {
    expect(isValidEmail('student@demo.dev')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });
});

describe('status metadata', () => {
  it('labels every task state and falls back for unknown values', () => {
    expect(getStatusMeta('LOCKED').label).toBe('Locked');
    expect(getStatusMeta('CHANGES_REQUESTED').variant).toBe('orange');
    expect(getStatusMeta('SOMETHING_NEW').label).toBe('Something new');
  });
});

describe('api error helpers', () => {
  const error = {
    status: 422,
    code: 'VALIDATION_ERROR',
    message: 'Please check the highlighted fields.',
    details: [
      { field: 'description', message: 'Description must be at least 50 characters.' },
      { field: 'githubUrl', message: 'Link must start with https://github.com/' },
    ],
  };

  it('maps details to field errors and applies them to a form', () => {
    expect(getFieldErrors(error)).toEqual({
      description: 'Description must be at least 50 characters.',
      githubUrl: 'Link must start with https://github.com/',
    });
    const calls = [];
    const applied = applyServerErrors(error, (field, value) => calls.push([field, value.message]));
    expect(applied).toBe(true);
    expect(calls).toHaveLength(2);
    expect(getErrorMessage(error)).toBe('Please check the highlighted fields.');
    expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
  });
});
