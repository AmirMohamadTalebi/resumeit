const { testStore } = require("./auth-test-store.cjs");
const { digest } = require("../src/auth/auth.cjs");
const { randomUUID } = require("node:crypto");
module.exports = async () => {
  const db = testStore(),
    owner = await db.provisionAccount("09120000123", null),
    target = await db.provisionAccount("09120000124", null);
  await db.setAccountNames(owner, "مدیر", "آزمایش");
  await db.markPhoneVerified(owner);
  await db.createSession(digest("a".repeat(64)), owner, Date.now() + 600000);
  await db.createSession(digest("b".repeat(64)), target, Date.now() + 600000);
  const session = db.session;
  db.session = async (token) => {
    const user = await session(token);
    if(!user)return null;
    let role=user.id===owner?'owner':'user';
    if(db.accountRole)try{role=(await db.accountRole(user.id)).role;}catch(error){if(error.status!==404)throw error;role='user';}
    return {...user,is_owner:role==='owner',is_admin:['owner','admin'].includes(role),is_support:role==='support',account_role:role};
  };
  const users = Array.from({ length: 31 }, (_, i) => ({
    id: i === 0 ? target : randomUUID(),
    phone: "09120000124",
    name: "نام بلند کاربر برای بررسی نمایش درست در جدول مدیریت",
    first_name: "کاربر",
    last_name: String(i),
    created_at: new Date().toISOString(),
    phone_verified: true,
    balance_units: 1000000,
    is_admin: false,
    suspended: false,
  }));
  db.adminOverview = async () => ({
    users: { total: 31, verified: 24, recent: 5 },
    pages: { total: 20, resumes: 11, links: 9 },
    otp: {
      total: 48,
      accepted: 43,
      failed: 5,
      verified: 35,
      started: Date.now() - 86400000,
    },
    wallet: { balance: 2000000 },
    purchases: { total: 9, spent: 118000 },
    sessions: { total: 3 },
    subscriptions: { total: 4 },
    controls: { suspended: 0, blocked: 0 },
    traffic: Array.from({ length: 30 }, (_, i) => ({
      day: Math.floor(Date.now() / 86400000) - 29 + i,
      event: i % 2 ? "click" : "view",
      total: (i + 1) * 10,
    })),
    otpDaily: [
      {
        day: Math.floor(Date.now() / 86400000),
        total: 48,
        accepted: 43,
        failed: 5,
      },
    ],
  });
  db.adminList = async (kind, { page, q }) => {
    if(kind==='payments')return {rows:[],total:0,page,pageSize:25};
    const all =
      kind === "users"
        ? users
        : kind === "pages"
          ? users.map((u) => ({
              ...u,
              slug: "long-public-slug",
              pub: {
                resume: { status: "published" },
                links: { status: "draft" },
              },
              revision: 2,
            }))
          : kind === "transactions"
            ? users.map((u) => ({
                ...u,
                user_id: u.id,
                delta_units: -118000,
                balance_units: 882000,
                label: "خرید قالب Vista",
              }))
            : kind === "purchases"
              ? users.map((u) => ({
                  ...u,
                  user_id: u.id,
                  ref: "rt:vista",
                  price_units: 118000,
                }))
              : kind === "otp"
                ? users.map((u) => ({
                    ...u,
                    purpose: "login",
                    status: "accepted",
                    created_at: Date.now(),
                    verified_at: Date.now(),
                  }))
                : users.map((u) => ({
                    ...u,
                    actor_id: owner,
                    target_id: u.id,
                    action: "credit",
                    reason: "دلیل آزمایشی شارژ مدیریتی",
                  }));
    const filtered = q ? all.filter((u) => JSON.stringify(u).includes(q)) : all;
    return {
      rows: filtered.slice((page - 1) * 25, page * 25),
      total: filtered.length,
      page,
      pageSize: 25,
      ...(kind === "otp"
        ? { stats: { accepted: 31, failed: 0, pending: 0, verified: 31 } }
        : {}),
    };
  };
  db.adminUser = async (id) => ({
    user: { ...users[0], id },
    document: {
      slug: "pixit",
      pub: { resume: { status: "published" }, links: { status: "published" } },
      template: "vista",
    },
    balance_units: 1000000,
    sessions: { total: 2 },
    social: [{ provider: "github" }],
    access: [{ ref: "rt:vista", price_units: 118000 }],
    traffic: [],
  });
  let actions = [];
  let policy={sep:true,zibal:true};
  db.paymentPolicy=async()=>({...policy});
  db.savePaymentPolicy=async(actor,input)=>{if(typeof input.sep!=='boolean'||typeof input.zibal!=='boolean')throw Object.assign(Error('Invalid gateways'),{status:400});policy={sep:input.sep,zibal:input.zibal};return {ok:true};};
  db.adminAction = async (actor, id, action, input) => {
    actions.push({ actor, id, action, ...input });
    return { ok: true };
  };
  return { db, owner, target, actions };
};
