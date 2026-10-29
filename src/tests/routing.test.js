import { describe, expect, it } from 'vitest';
import { buildPath, getHomeRoute, getSafeRedirect, paths, ROUTES } from '@/shared/constants';

describe('route helpers', () => {
  it('fills params and query strings', () => {
    expect(buildPath(ROUTES.TASK, { id: 'abc123' })).toBe('/tasks/abc123');
    expect(paths.paymentStatus({ enrollmentId: 'e1', orderId: 'o1' })).toBe(
      '/payment/status?enrollmentId=e1&orderId=o1',
    );
    expect(paths.enroll({ designationId: 'd1', planId: undefined })).toBe('/enroll?designationId=d1');
    expect(paths.login('/dashboard')).toBe('/login?redirect=%2Fdashboard');
  });

  it('throws when a required param is missing', () => {
    expect(() => buildPath(ROUTES.TASK, {})).toThrow(/missing param/);
  });

  it('sends each role to its own home (SN3)', () => {
    expect(getHomeRoute({ roles: ['STUDENT'] })).toBe('/dashboard');
    expect(getHomeRoute({ roles: ['TRAINER'] })).toBe('/trainer');
    expect(getHomeRoute({ roles: ['ADMIN'] })).toBe('/admin');
    expect(getHomeRoute({ roles: ['STUDENT', 'ADMIN'] })).toBe('/admin');
  });

  it('only allows same-app redirects', () => {
    expect(getSafeRedirect('/tasks/1')).toBe('/tasks/1');
    expect(getSafeRedirect('https://evil.example')).toBeNull();
    expect(getSafeRedirect('//evil.example')).toBeNull();
    expect(getSafeRedirect(null)).toBeNull();
  });
});
