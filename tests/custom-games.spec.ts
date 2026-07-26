import { test, expect } from "@playwright/test";

const HUB = `http://localhost:${process.env.HUB_PORT || "3004"}`;

test.describe("P2Play Hub — Live GitHub Custom Games Feature", () => {
  test("host can add a custom GitHub game, see LIVE badge, and sync to guest", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();
    const host = await hostCtx.newPage();
    const guest = await guestCtx.newPage();

    // 1. Host creates room
    await host.goto(HUB, { waitUntil: "networkidle" });
    await host.getByPlaceholder(/pseudo/i).fill("HostCustom");
    await host.getByRole("button", { name: /Créer un salon/i }).click();
    await expect(host.getByText(/Salon Connecté/i)).toBeVisible({ timeout: 30000 });

    const codeMatch = (await host.getByText(/Code :/).first().innerText()).match(/[A-Z]{6}/);
    const roomCode = codeMatch?.[0];
    expect(roomCode).toBeTruthy();

    // 2. Guest joins room
    await guest.goto(HUB, { waitUntil: "networkidle" });
    await guest.getByPlaceholder(/pseudo/i).fill("GuestCustom");
    await guest.getByPlaceholder(/CODE/i).fill(roomCode!);
    await guest.getByRole("button", { name: /Rejoindre un salon/i }).click();

    await expect.poll(
      async () => (await host.getByText(/Joueurs Connectés \(/i).first().innerText().catch(() => "")),
      { timeout: 30000, intervals: [500] }
    ).toContain("2");

    // 3. Host opens "Ajouter un jeu" modal
    await host.getByRole("button", { name: /Ajouter un jeu/i }).click();
    await expect(host.getByText(/Ajouter un jeu GitHub Live/i)).toBeVisible();

    // 4. Host uses quick example for gab371/skull-and-roses
    const exampleBtn = host.getByRole("button", { name: "💀 Skull & Roses", exact: true });
    await exampleBtn.click();


    // 5. Host submits modal
    const submitBtn = host.getByRole("button", { name: /Ajouter le jeu/i });
    await submitBtn.click();

    // Modal closes upon successful fetch and extraction
    await expect(host.getByText(/Ajouter un jeu GitHub Live/i)).toBeHidden({ timeout: 30000 });

    // 8. Host selects the custom game card and launches it
    const customCard = host.locator('[role="button"]', { hasText: "LIVE" }).first();
    await customCard.click();

    const launchBtn = host.getByRole("button", { name: /Lancer la partie/i });
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();

    // 9. Verify BOTH Host and Guest launch the custom game shell successfully (no script load error)
    await expect(host.locator('[data-p2play-game-shell]')).toBeVisible({ timeout: 30000 });
    await expect(guest.locator('[data-p2play-game-shell]')).toBeVisible({ timeout: 30000 });

    // Verify neither page shows the script load error
    await expect(host.getByText(/Échec du chargement du script/i)).toBeHidden();
    await expect(guest.getByText(/Échec du chargement du script/i)).toBeHidden();

    // Clean up
    await hostCtx.close();
    await guestCtx.close();
  });
});

