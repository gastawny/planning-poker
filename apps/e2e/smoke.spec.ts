import { type Page, expect, test } from "@playwright/test";

async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto("/");
  await page.fill('[data-testid="create-name-input"]', name);
  await page.click('[data-testid="create-room-submit"]');
  await page.waitForURL(/\/room\//);
  const match = page.url().match(/\/room\/([^/]+)/);
  if (!match?.[1]) throw new Error("Could not extract roomId from URL");
  return match[1];
}

async function joinRoom(
  page: Page,
  roomId: string,
  name: string,
  role: "participant" | "spectator" = "participant"
) {
  await page.goto(`/room/${roomId}`);
  await page.waitForSelector('[data-testid="join-modal"]', { timeout: 5000 });
  await page.fill('[data-testid="join-name-input"]', name);
  if (role === "spectator") {
    await page.click('[data-testid="join-role-spectator"]');
  }
  await page.click('[data-testid="join-submit"]');
  await page.waitForSelector('[data-testid="voting-area"]', { timeout: 5000 });
}

test.describe("Core planning poker flow", () => {
  test("full round: create room → join → vote → reveal → new round", async ({ browser }) => {
    const facilitatorCtx = await browser.newContext();
    const participantCtx = await browser.newContext();
    const spectatorCtx = await browser.newContext();

    const facilitatorPage = await facilitatorCtx.newPage();
    const participantPage = await participantCtx.newPage();
    const spectatorPage = await spectatorCtx.newPage();

    try {
      // 1. Facilitator creates room
      const roomId = await createRoom(facilitatorPage, "Alice");
      await expect(facilitatorPage.locator('[data-testid="voting-area"]')).toBeVisible();

      // 2. Participant joins via invite link
      await joinRoom(participantPage, roomId, "Bob", "participant");

      // 3. Spectator joins via invite link
      await joinRoom(spectatorPage, roomId, "Charlie", "spectator");

      // 4. Facilitator starts voting
      await facilitatorPage.click('button:has-text("Start voting")');
      await expect(participantPage.locator('[data-testid="card-deck"]')).toBeVisible();

      // 5. Participant selects a card
      await participantPage.click('[data-testid="card-3"]');
      await expect(participantPage.locator('[data-testid="card-3"]')).toHaveClass(/ring-/);

      // 6. Facilitator reveals
      await facilitatorPage.click('button:has-text("Reveal cards")');
      await expect(facilitatorPage.locator('[data-testid="stats-panel"]')).toBeVisible({
        timeout: 5000,
      });

      // 7. Facilitator starts new round
      await facilitatorPage.click('button:has-text("New round")');
      await expect(facilitatorPage.locator('button:has-text("Start voting")')).toBeVisible();
    } finally {
      await facilitatorCtx.close();
      await participantCtx.close();
      await spectatorCtx.close();
    }
  });
});
