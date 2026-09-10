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
  await page.getByRole('button', { name: '宠物 2', exact: true }).click();
  await expect(page.getByTestId('data')).toContainText('Pet 2');
  await page.getByRole('button', { name: '宠物 1', exact: true }).click();
  await expect(page.getByTestId('data')).toContainText('Pet 1');
  expect(requests.filter((id) => id === 1)).toHaveLength(1);
  await page.getByRole('button', { name: '强制刷新' }).click();
  await expect.poll(() => requests.filter((id) => id === 1).length).toBe(2);
  await expect(page.getByTestId('loading')).toHaveText('idle');
  await page.getByRole('button', { name: '模拟错误' }).click();
  await expect(page.getByTestId('status')).toHaveText('error');
  await expect(page.getByRole('alert')).toHaveText('请求失败');
  await page.getByRole('button', { name: '宠物 2', exact: true }).click();
  await expect(page.getByTestId('status')).toHaveText('success');
  await expect(page.getByTestId('data')).toContainText('Pet 2');
});
