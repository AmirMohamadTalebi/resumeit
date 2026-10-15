const assert = require("node:assert/strict"),
  fs = require("node:fs");
const { chromium } = require("playwright");
const { createServer } = require("../src/http/server.cjs");
(async () => {
  const fixture = await require("./admin-fixture.cjs")(),
    store = require('./workspace-test-store.cjs')(fixture.db,[fixture.owner,fixture.target]),
    server = createServer(fixture.db);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port,
    browser = await chromium.launch({
      channel: process.platform === "win32" ? "msedge" : undefined,
      headless: true,
    });
  const errors = [];
  fs.mkdirSync("artifacts/admin", { recursive: true });
  try {
    const context = await browser.newContext();
    await context.addCookies([
      { name: "ri_session", value: "a".repeat(64), url: base },
    ]);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(r.url() + ": " + r.status());
    });
    let count = 0;
    for (const width of [320, 390, 768, 1024, 1366, 1920]) {
      await page.setViewportSize({ width, height: 768 });
      for (const section of [
        "",
        "users/",
        "pages/",
        "traffic/",
        "transactions/",
        "payments/",
        "purchases/",
        "catalog/",
        "otp/",
        "audit/",
        "health/",
      ]) {
        await page.goto(base + "/admin/" + section);
        await page.waitForFunction(
          () => document.querySelector("#updated")?.textContent,
        );
        await page.evaluate(() => document.fonts.ready);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          true,
          "overflow " + width + " " + section,
        );
        assert.equal(
          await page.locator('#content [role="alert"]').count(),
          0,
          section,
        );
        if (width >= 1024)
          assert(
            (await page.locator(".admin-main").evaluate((e) => e.clientWidth)) >
              700,
            "content column",
          );
        count++;
        if (width === 1366 || width === 390)
          await page.screenshot({
            path:
              "artifacts/admin/" +
              (section.replace("/", "") || "overview") +
              "-" +
              width +
              ".png",
            fullPage: true,
          });
      }
    }
    await page.setViewportSize({ width: 390, height: 768 });
    await page.goto(base + "/admin/");
    await page.waitForFunction(
      () => document.querySelector("#updated")?.textContent,
    );
    assert.equal(
      await page.locator("#admin-side").evaluate((e) => e.inert),
      true,
    );
    await page.locator("#admin-menu").click();
    assert.equal(
      await page.locator(".admin-main").evaluate((e) => e.inert),
      true,
    );
    await page.locator("#admin-close").click();
    assert.equal(
      await page.locator(".admin-main").evaluate((e) => e.inert),
      false,
    );
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(base + "/admin/users/");
    await page.waitForFunction(
      () => document.querySelector("#updated").textContent,
    );
    await page.locator("#next").click();
    await page.waitForFunction(() =>
      document.querySelector(".pager")?.textContent.includes("صفحهٔ ۲"),
    );
    assert.equal(await page.locator("tbody tr").count(), 6);
    await page.locator("#search").fill("پیدا نمی‌شود");
    await page.locator("#filters").evaluate((form) => form.requestSubmit());
    await page.waitForFunction(() => document.querySelector(".empty"));
    await page.locator("#search").fill("");
    await page.locator("#filters").evaluate((form) => form.requestSubmit());
    await page.waitForSelector("tbody tr");
    await page.goto(base + "/admin/users/?user=" + fixture.target);
    await page.waitForSelector('[data-action="credit"]');
    await page.locator('[data-action="credit"]').click();
    await page.locator("#amount").fill("10000");
    await page.locator("#reason").fill("شارژ آزمایشی با دلیل");
    await page.locator("#action-submit").click();
    await page.waitForFunction(
      () => !document.querySelector("#action-dialog").open,
    );
    assert.equal(fixture.actions[0].toman, 10000);
    await page.goto(base + "/admin/catalog/");
    await page.waitForSelector(".catalog-item");
    await page.locator("#catalog-kind").selectOption("fonts");
    await page.waitForFunction(() =>
      document.querySelector("#content").textContent.includes("استعداد"),
    );
    assert(await page.locator("#content").textContent());
    await page.goto(base + "/dashboard/");
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "پنل کاربری", exact: true }).click();
    assert.equal(await page.locator('#sidebar a[href="/admin/"]').count(), 1);
    await page.reload();
    await page.waitForSelector('#sidebar a[href="/admin/"]');
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: " +
        count +
        " admin page/viewports, tables, pagination, search/empty, fonts, wallet action, admin chooser/switch and browser errors.",
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
    store.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
