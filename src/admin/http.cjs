const { readJson } = require("../http/security.cjs");
const { isAdmin } = require("./access.cjs");
const { RI } = require("../dashboard/render.cjs");
const { version } = require("../version.cjs");
const started = Date.now();
function adminHandler(database, auth) {
  return async (req, res, path, origin) => {
    if (path === "/api/version" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ version }));
      return true;
    }
    if (!path.startsWith("/api/admin/")) return false;
    const reply = (status, body) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(body));
    };
    res.setHeader("Vary", "Cookie");
    try {
      const user = await auth.account(req);
      if (!user) {
        reply(401, { error: "برای ادامه وارد حساب شوید" });
        return true;
      }
      if (!isAdmin(user)) {
        reply(403, { error: "این بخش فقط برای مدیر است" });
        return true;
      }
      const url = new URL(req.url, origin),
        page = Number(url.searchParams.get("page") || 1),
        days = Number(url.searchParams.get("days") || 30),
        q = (url.searchParams.get("q") || "").trim(),
        status = url.searchParams.get("status") || "";
      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        page > 100000 ||
        ![7, 30, 90, 365].includes(days) ||
        q.length > 100 ||
        !["", "accepted", "pending", "failed", "suspended", "active"].includes(
          status,
        )
      ) {
        reply(400, { error: "فیلتر معتبر نیست" });
        return true;
      }
      const from = Date.now() - days * 86400000;
      if (req.method === "GET") {
        if (path === "/api/admin/overview")
          reply(200, await database.adminOverview(from));
        else if (path === "/api/admin/catalog")
          reply(200, {
            templates: RI.RESUME_TEMPLATES,
            linkTemplates: RI.LINK_TEMPLATES,
            fonts: RI.FONTS,
            palettes: RI.PALETTES,
            plans: RI.PLANS,
            rate: RI.IT_RATE,
          });
        else if (path === "/api/admin/health")
          reply(200, {
            version,
            uptime: Date.now() - started,
            origin: process.env.PUBLIC_ORIGIN || origin,
            database: "متصل",
            smsConfigured: !!process.env.SMSIR_API_KEY,
            googleConfigured: !!(
              process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ),
            githubConfigured: !!(
              process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
            ),
            paymentConfigured: false,
            limits: {
              otpDaily: 100,
              phoneDaily: 5,
              ipQuarterHour: 10,
              resendSeconds: 60,
              otpSeconds: 120,
            },
            at: Date.now(),
          });
        else if (/^\/api\/admin\/users\/[a-f0-9-]{36}$/.test(path))
          reply(200, await database.adminUser(path.split("/").pop()));
        else if (
          /^\/api\/admin\/(users|pages|transactions|purchases|otp|audit)$/.test(
            path,
          )
        )
          reply(
            200,
            await database.adminList(path.split("/").pop(), {
              page,
              q,
              from,
              status,
            }),
          );
        else reply(404, { error: "بخش پیدا نشد" });
      } else if (
        req.method === "POST" &&
        /^\/api\/admin\/users\/[a-f0-9-]{36}\/actions$/.test(path)
      ) {
        if (
          req.headers.origin !== origin ||
          req.headers["content-type"]?.split(";")[0] !== "application/json"
        ) {
          reply(403, { error: "درخواست معتبر نیست" });
          return true;
        }
        const input = await readJson(req);
        if (
          typeof input.reason !== "string" ||
          input.reason.trim().length < 5 ||
          input.reason.length > 500 ||
          /[\x00-\x1f\x7f]/.test(input.reason) ||
          !/^[a-zA-Z0-9_-]{16,64}$/.test(input.requestId || "") ||
          ![
            "credit",
            "suspend",
            "restore",
            "block-publication",
            "unblock-publication",
            "revoke-sessions",
          ].includes(input.action)
        ) {
          reply(400, { error: "عملیات، دلیل و شناسهٔ درخواست را کامل کنید" });
          return true;
        }
        input.reason = input.reason.trim();
        reply(
          200,
          await database.adminAction(
            user.id,
            path.split("/")[4],
            input.action,
            input,
          ),
        );
      } else reply(405, { error: "روش درخواست معتبر نیست" });
    } catch (error) {
      reply(error.status || 503, {
        error: error.status
          ? error.message
          : "اطلاعات دریافت نشد؛ دوباره تلاش کنید",
      });
    }
    return true;
  };
}
module.exports = { adminHandler };
