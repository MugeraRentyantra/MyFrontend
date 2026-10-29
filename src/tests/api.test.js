import { describe, expect, it } from 'vitest';
import { ApiError, toApiError, unwrap } from '@/services/api';

describe('api client helpers', () => {
  it('unwraps { success, data } envelopes and leaves plain bodies alone', () => {
    expect(unwrap({ success: true, data: { id: 1 } })).toEqual({ id: 1 });
    expect(unwrap({ items: [], total: 0 })).toEqual({ items: [], total: 0 });
  });

  it('normalises server errors into ApiError with code, message and field details', () => {
    const error = toApiError({
      response: {
        status: 409,
        data: {
          success: false,
          error: {
            code: 'EMAIL_TAKEN',
            message: 'An account with this email already exists.',
            details: [{ field: 'email', message: 'Already registered' }],
          },
        },
      },
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.code).toBe('EMAIL_TAKEN');
    expect(error.details).toEqual([{ field: 'email', message: 'Already registered' }]);
  });

  it('falls back to friendly messages by status and flags network errors', () => {
    expect(toApiError({ response: { status: 429, data: '' } }).message).toMatch(/too many attempts/i);
    const network = toApiError({ request: {} });
    expect(network.isNetworkError).toBe(true);
    expect(network.code).toBe('NETWORK_ERROR');
  });
});
