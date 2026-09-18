import { test, expect } from '@playwright/test';
test('FAQ search, categories, source links and chat work on desktop and mobile', async ({page}) => {
  const errors:string[]=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/faq');
  await expect(page.locator('.faq-results').getByRole('status')).toHaveText('34 answers');
  await page.getByRole('textbox', {name:'Search FAQs'}).fill('installments');
  await expect(page.locator('.faq-results').getByRole('status')).toHaveText('1 answer');
  await page.getByRole('button', {name:/Can I pay my school fees in installments/}).click();
  await expect(page.getByText('Full payment is normally required.',{exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'Read the official BUK answer'})).toHaveAttribute('href','https://www.buk.edu.ng/node/713');
  await page.getByRole('link',{name:'Ask Campus AI',exact:true}).click();
  await expect(page.getByText('Full payment is normally required.',{exact:false})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.goto('/faq?id=buk-faq-718');
  await expect(page.getByText('Report to campus security.',{exact:false})).toBeVisible();
  await page.getByRole('complementary',{name:'FAQ topics'}).getByRole('button',{name:/About BUK/}).click();
  await expect(page.locator('.faq-results').getByRole('status')).toHaveText('4 answers');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});


