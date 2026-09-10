import { expect, test } from '@playwright/test';

test('generated query reacts to IDs, reuses cache, refreshes, and recovers from errors', async ({ page }) => {
  const requests: number[] = [];
  await page.route('**/api/pets/*', async (route) => {
    const id = Number(new URL(route.request().url()).pathname.split('/').pop());
    requests.push(id);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({ status: id === 500 ? 500 : 200, json: { id, name: `Pet ${id}` } });
  });
  await page.goto('/');
  await expect(page.getByTestId('loading')).toHaveText('loading');
  await expect(page.getByTestId('data')).toContainText('Pet 1');
  await page.getByRole('button', { name: 'Pet 2', exact: true }).click();
  await expect(page.getByTestId('data')).toContainText('Pet 2');
  await page.getByRole('button', { name: 'Pet 1', exact: true }).click();
  await expect(page.getByTestId('data')).toContainText('Pet 1');
  expect(requests.filter((id) => id === 1)).toHaveLength(1);
  await page.getByRole('button', { name: 'Force refresh' }).click();
  await expect.poll(() => requests.filter((id) => id === 1).length).toBe(2);
  await expect(page.getByTestId('loading')).toHaveText('idle');
  await page.getByRole('button', { name: 'Simulate error' }).click();
  await expect(page.getByTestId('status')).toHaveText('error');
  await expect(page.getByRole('alert')).toHaveText('Request failed');
  await page.getByRole('button', { name: 'Pet 2', exact: true }).click();
  await expect(page.getByTestId('status')).toHaveText('success');
  await expect(page.getByTestId('data')).toContainText('Pet 2');
  await page.screenshot({ path: test.info().outputPath('query-success.png'), fullPage: true });
});

test('a second forced refresh aborts the previous generated Fetch request', async ({ page }) => {
  let requestCount = 0;
  const aborted: string[] = [];
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/pets/')) aborted.push(request.failure()?.errorText ?? '');
  });
  await page.route('**/api/pets/*', async (route) => {
    const sequence = ++requestCount;
    if (sequence === 2) {
      // Keep the first refresh pending until the newer response is displayed.
      await expect(page.getByTestId('data')).toContainText('Response 3');
      return route.abort();
    }
    await route.fulfill({ json: { id: 1, name: `Response ${sequence}` } });
  });
  await page.goto('/');
  await expect(page.getByTestId('data')).toContainText('Response 1');
  await page.getByRole('button', { name: 'Force refresh' }).click();
  await expect.poll(() => requestCount).toBe(2);
  await page.getByRole('button', { name: 'Force refresh' }).click();
  await expect(page.getByTestId('data')).toContainText('Response 3');
  await expect.poll(() => aborted.length).toBe(1);
  expect(aborted[0]).toContain('ERR_ABORTED');
  await expect(page.getByTestId('status')).toHaveText('success');
});
