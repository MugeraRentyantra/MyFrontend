import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router-dom';
import App from '@/App';
import { routes, ROUTER_FUTURE } from '@/routes/AppRoutes';
import { DEMO_PASSWORD } from '@/mocks/demoAccounts';

function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path], future: ROUTER_FUTURE });
  render(<App router={router} />);
  return router;
}

async function logIn(user, email) {
  const emailField = await screen.findByLabelText(/email/i, {}, { timeout: 5000 });
  await user.clear(emailField);
  await user.type(emailField, email);
  // Submitting with Enter avoids depending on the button label.
  await user.type(screen.getByLabelText(/^password/i), `${DEMO_PASSWORD}{enter}`);
}

describe('app shell and auth (SN1, SN3, KD1)', () => {
  it('sends anonymous visitors from a protected page to login with a redirect back', async () => {
    const router = renderAt('/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toContain('redirect=%2Fdashboard');
  });

  it('lands a student on /dashboard after login', async () => {
    const user = userEvent.setup();
    const router = renderAt('/login');
    await logIn(user, 'student@demo.dev');
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'), {
      timeout: 5000,
    });
  });

  it.each([
    ['admin@demo.dev', '/admin'],
    ['trainer@demo.dev', '/trainer'],
  ])('lands %s on %s', async (email, home) => {
    const user = userEvent.setup();
    const router = renderAt('/login');
    await logIn(user, email);
    await waitFor(() => expect(router.state.location.pathname).toBe(home), { timeout: 5000 });
  });

  it('shows the 403 page when a student opens an admin URL', async () => {
    const user = userEvent.setup();
    const router = renderAt('/login?redirect=%2Fadmin%2Fusers');
    await logIn(user, 'student@demo.dev');
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'), {
      timeout: 5000,
    });
    expect(await screen.findByText(/don.t have access/i, {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('rejects a wrong password with one generic message', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    const emailField = await screen.findByLabelText(/email/i, {}, { timeout: 5000 });
    await user.type(emailField, 'student@demo.dev');
    await user.type(screen.getByLabelText(/^password/i), 'WrongPass1{enter}');
    expect(
      await screen.findByText(/email or password is incorrect/i, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
