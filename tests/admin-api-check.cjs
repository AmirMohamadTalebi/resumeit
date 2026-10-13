const assert = require("node:assert/strict");
const { createServer } = require("../src/http/server.cjs");
(async () => {
  const fixture = await require("./admin-fixture.cjs")(),
    server = createServer(fixture.db);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const get = (route, cookie) =>
    fetch(base + route, {
      redirect: "manual",
      headers: cookie ? { Cookie: "ri_session=" + cookie.repeat(64) } : {},
    });
  try {
    for (const route of [
      "/admin/",
      "/admin/admin.js",
      "/admin/admin.css",
      "/api/admin/users",
      "/api/admin/overview",
    ]) {
      assert([303, 401].includes((await get(route)).status));
      assert.equal((await get(route, "b")).status, 403);
      assert.equal((await get(route, "a")).status, 200);
    }
    for (const kind of [
      "users",
      "pages",
      "transactions",
      "purchases",
      "otp",
      "audit",
    ]) {
      const r = await get("/api/admin/" + kind, "a");
      assert.equal(r.headers.get("cache-control"), "no-store");
      const list = await r.json();
      assert.equal(list.rows.length, 25);
      assert(!JSON.stringify(list).includes("password_hash"));
    }
    for (const query of [
      "page=-1",
      "page=1.5",
      "days=0",
      "q=" + "a".repeat(101),
      "status=madeup",
    ])
      assert.equal((await get("/api/admin/users?" + query, "a")).status, 400);
    const post = (body, origin = base, cookie = "a") =>
      fetch(base + "/api/admin/users/" + fixture.target + "/actions", {
        method: "POST",
        headers: {
          Cookie: "ri_session=" + cookie.repeat(64),
          Origin: origin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    const input = {
      action: "credit",
      reason: "شارژ آزمون مدیریت",
      requestId: "test_request_123456",
      toman: 10000,
    };
    assert.equal((await post(input, "https://evil.example")).status, 403);
    assert.equal((await post(input, base, "b")).status, 403);
    assert.equal((await post({ ...input, reason: "a" })).status, 400);
    assert.equal((await post({ ...input, action: "delete" })).status, 400);
    assert.equal((await post(input)).status, 200);
    assert.equal(fixture.actions.length, 1);
    assert.equal((await get("/api/version")).status, 200);
    assert.equal((await get("/api/admin/health", "a")).status, 200);
    console.log(
      "PASS: admin HTML/assets/API role guards, private headers, paginated read models, filter validation, CSRF, action boundary and version.",
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
