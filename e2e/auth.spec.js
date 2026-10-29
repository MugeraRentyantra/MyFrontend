import { expect, test } from '@playwright/test';

const PASSWORD = 'Password@123';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/^password/i).fill(PASSWORD);
  await page.getByLabel(/^password/i).press('Enter');
}

test.describe('authentication (SN3)', () => {
  test('protected pages redirect to login and back after signing in', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL(/\/login\?redirect=%2Ftasks/);
    await page.getByLabel(/email/i).first().fill('student@demo.dev');
    await page.getByLabel(/^password/i).fill(PASSWORD);
    await page.getByLabel(/^password/i).press('Enter');
    await expect(page).toHaveURL(/\/tasks$/);
  });

  for (const [email, home] of [
    ['student@demo.dev', '/dashboard'],
    ['trainer@demo.dev', '/trainer'],
    ['admin@demo.dev', '/admin'],
  ]) {
    test(`${email} lands on ${home}`, async ({ page }) => {
      await login(page, email);
      await expect(page).toHaveURL(new RegExp(`${home}$`));
    });
  }

  test('a student opening an admin URL sees the 403 page', async ({ page }) => {
    await login(page, 'student@demo.dev');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/admin/users');
    await expect(page.getByText(/don.t have access/i)).toBeVisible();
  });

  test('wrong credentials show one generic message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).first().fill('student@demo.dev');
    await page.getByLabel(/^password/i).fill('WrongPass1');
    await page.getByLabel(/^password/i).press('Enter');
    await expect(page.getByText(/email or password is incorrect/i)).toBeVisible();
  });

  test('the session survives a reload (refresh token cookie)', async ({ page }) => {
    await login(page, 'student@demo.dev');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('registering shows the check-your-email page', async ({ page }) => {
    const email = `e2e.${Date.now()}@example.com`;
    await page.goto('/register');
    await page.getByLabel(/name/i).first().fill('E2E Student');
    await page.getByLabel(/email/i).first().fill(email);
    await page.getByLabel(/^password/i).fill('Secure123');
    await page.getByLabel(/^password/i).press('Enter');
    await expect(page).toHaveURL(/\/check-email/);
    await expect(page.getByText(email)).toBeVisible();
  });
});
