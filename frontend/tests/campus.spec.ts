import { test, expect } from "@playwright/test";
test("student navigation, unknown answers, private uploads and mobile shell", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error("Browser runtime error:", e.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error")
      console.error("Browser console:", message.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A smarter way to campus." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Ask Campus AI" })
    .fill("What is the teleportation policy?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(
    page.getByText("I don’t have enough verified BUK information", {
      exact: false,
    }),
  ).toBeVisible();
  // Navigation questions abstain with a map hand-off instead of a wrong FAQ.
  await page
    .getByRole("textbox", { name: "Your message" })
    .fill("Where can I find a teleportation station?");
  await page.getByRole("textbox", { name: "Your message" }).press("Enter");
  await expect(
    page.getByText("couldn’t match that place", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open campus map" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My documents", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "A private space for your academic documents",
    }),
  ).toBeVisible();
  await page.goto("/guide");
  await page
    .getByRole("button", { name: "Complete Get ready before you arrive" })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Sign in",
  );
  await page.goto("/events");
  await expect(
    page.getByRole("heading", { name: "Around campus" }),
  ).toBeVisible();
  await page.goto("/emergency");
  await expect(
    page.getByRole("heading", { name: "Emergency & safety" }),
  ).toBeVisible();
  await page.goto("/map?id=osm-way-662005578");
  await expect(page.locator(".map-canvas").first()).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Faculty of Computing" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Walking directions" }).click();
  await expect(page.getByText("walk from", { exact: false })).toBeVisible({
    timeout: 20000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Fresher guide", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A fresh start, a little guidance" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
