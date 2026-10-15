(() => {
  "use strict";
  const sections = {
    overview: [
      "نمای کلی",
      "home",
      "آنچه امروز در ResumeIt می‌گذرد؛ از رشد کاربران تا استفاده و خرید.",
    ],
    users: [
      "کاربران",
      "user",
      "حساب‌ها، دسترسی‌ها و وضعیت فعالیت کاربران را مدیریت کنید.",
    ],
    pages: [
      "صفحات کاربران",
      "globe",
      "آدرس‌ها و وضعیت انتشار رزومه و صفحهٔ لینک‌ها.",
    ],
    traffic: [
      "بازدید و کلیک",
      "chart",
      "روند استفاده از صفحات عمومی در بازهٔ انتخاب‌شده.",
    ],
    transactions: [
      "کیف پول و تراکنش‌ها",
      "card",
      "گردش It، شارژهای مدیریتی و خریدهای انجام‌شده.",
    ],
    payments: ["پرداخت‌های بانکی", "card", "درخواست‌های شارژ، نتیجهٔ تأیید بانک و موارد نیازمند بررسی؛ اطلاعات کارت ذخیره نمی‌شود."],
    purchases: [
      "خریدها و اشتراک‌ها",
      "star",
      "دسترسی‌های خریداری‌شده و زمان پایان اشتراک‌ها.",
    ],
    catalog: [
      "قالب‌ها و فونت‌ها",
      "palette",
      "فهرست محصولات و قیمت‌های واقعی مورد استفاده در سایت.",
    ],
    otp: [
      "پیامک و OTP",
      "phone",
      "تعداد درخواست‌های ارسال، پذیرش سرویس پیامک و تأیید کدها.",
    ],
    audit: [
      "سابقهٔ مدیریت",
      "history",
      "عملیات مدیر همراه با دلیل، زمان و حساب هدف ثبت می‌شود.",
    ],
    health: [
      "وضعیت سرویس‌ها",
      "settings",
      "نسخهٔ سایت، اتصال سرویس‌ها و محدودیت‌های فعال.",
    ],
  };
  const section = document.body.dataset.section || "overview",
    $ = (s) => document.querySelector(s),
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      ),
    fa = (v) => Number(v || 0).toLocaleString("fa-IR",{maximumFractionDigits:4}),
    date = (v) =>
      v
        ? new Date(
            typeof v === "string" && !/^\d+$/.test(v) ? v : Number(v),
          ).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" })
        : "—",
    icon = (n) => window.RI.icon(n),
    parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
  let ownerId, detailUser, fullAdmin=false;
  const roleNames={owner:'مالک / فول ادمین',admin:'ادمین',support:'ساپورت',user:'کاربر'};
  let page = 1,
    rows = [],
    total = 0,
    loadToken = 0;
  const actionNames = {
    'owner-password':'بازنشانی رمز توسط مالک',
    'owner-subscription':'اصلاح اشتراک توسط مالک',
    'owner-profile':'ویرایش پیشرفتهٔ مشخصات',
    'owner-access':'تغییر دسترسی محصول',
    'owner-wallet':'اصلاح اعتبار توسط مالک',
    'owner-extra-subdomain':'تغییر سهمیهٔ ریزدامنه',
    'owner-commerce':'تغییر قیمت‌گذاری و نرخ It',
    'account-role':'تغییر نقش حساب',
    'support-role':'تغییر نقش ساپورت',
    'audit-purge':'پاک‌سازی لاگ مدیریتی',
    'support-reply':'پاسخ پشتیبانی',
    'support-open':'باز کردن تیکت',
    'support-closed':'بستن تیکت',
    credit: "شارژ کیف پول",
    suspend: "تعلیق حساب",
    restore: "رفع تعلیق",
    "block-publication": "توقف انتشار",
    "unblock-publication": "اجازهٔ انتشار",
    "revoke-sessions": "خروج از همهٔ نشست‌ها",
    "edit-profile": "ویرایش مشخصات",
    "delete-account": "حذف دائمی حساب",
    "payment-gateways": "تغییر درگاه‌های پرداخت",
  };
  const statuses = {
    accepted: "پذیرفته‌شده",
    failed: "ارسال ناموفق",
    pending: "در انتظار نتیجه",
    register: "ثبت‌نام",
    login: "ورود",
    reset: "بازیابی رمز",
    phone: "تأیید شماره",
  };
  const badge = (s, label) =>
    '<span class="badge ' +
    (s ? "badge-success" : "badge-warning") +
    '">' +
    esc(label || (s ? "فعال" : "غیرفعال")) +
    "</span>";
  async function api(route, data) {
    const response = await fetch("/api/admin/" + route, {
      cache: "no-store",
      method: data ? "POST" : "GET",
      headers: { ...(data ? { "Content-Type": "application/json" } : {}), ...(ownerId ? { "X-ResumeIt-Owner": ownerId } : {}) },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) location.assign("/login/");
      throw new Error(result.error || "درخواست انجام نشد");
    }
    return result;
  }
  function summary(items) {
    return (
      '<dl class="summary-list">' +
      items
        .map(([k, v]) => "<div><dt>" + esc(k) + "</dt><dd>" + v + "</dd></div>")
        .join("") +
      "</dl>"
    );
  }
  function table(headers, data) {
    return (
      '<p class="table-hint">اگر همهٔ ستون‌ها دیده نمی‌شوند، جدول را افقی جابه‌جا کنید.</p><div class="table-scroll" tabindex="0" role="region" aria-label="جدول ' + esc(headers.join('، ')) + '"><table class="table"><thead><tr>' +
      headers.map((h) => '<th scope="col">' + esc(h) + "</th>").join("") +
      "</tr></thead><tbody>" +
      data
        .map(
          (row) =>
            "<tr>" + row.map((v) => "<td>" + v + "</td>").join("") + "</tr>",
        )
        .join("") +
      "</tbody></table></div>"
    );
  }
  function chart(data, otp = false) {
    const map = new Map();
    for (const r of data) {
      const day = Number(r.day);
      if (!map.has(day)) map.set(day, [0, 0]);
      if (otp) map.set(day, [Number(r.accepted), Number(r.failed)]);
      else map.get(day)[r.event === "click" ? 1 : 0] += Number(r.total);
    }
    const vals = [...map].sort((a, b) => a[0] - b[0]),
      max = Math.max(1, ...vals.flatMap((x) => x[1]));
    if (!vals.length)
      return '<p class="empty">هنوز آماری برای این بازه ثبت نشده است.</p>';
    return (
      '<div class="chart" role="img" aria-label="' +
      (otp ? "پذیرش و خطای ارسال OTP" : "بازدید و کلیک صفحات") +
      '">' +
      vals
        .map(
          ([day, [a, b]]) =>
            '<div class="chart-day" title="' +
            esc(new Date(day * 86400000).toLocaleDateString("fa-IR")) +
            "؛ " +
            fa(a) +
            " / " +
            fa(b) +
            '"><span style="height:' +
            Math.max(1, (a / max) * 100) +
            '%"></span><span style="height:' +
            Math.max(1, (b / max) * 100) +
            '%"></span></div>',
        )
        .join("") +
      '</div><div class="chart-legend"><span>' +
      (otp ? "پذیرش سرویس" : "بازدید") +
      "</span><span>" +
      (otp ? "خطای ارسال" : "کلیک") +
      "</span></div>"
    );
  }
  function overview(d) {
    const views = d.traffic
      .filter((r) => r.event !== "click")
      .reduce((a, r) => a + Number(r.total), 0);
    return (
      '<div class="overview-kpis">' +
      [
        [
          d.users.total,
          "کل کاربران",
          fa(d.users.recent) + " حساب جدید در بازه",
        ],
        [views, "بازدید صفحات", "در بازهٔ انتخاب‌شده"],
        [
          d.otp.accepted,
          "ارسال پذیرفته‌شدهٔ OTP",
          fa(d.otp.failed) + " ارسال ناموفق",
        ],
        [
          Number(d.purchases.spent) / 2000,
          "خرید با It",
          fa(d.purchases.total) + " تراکنش خرید",
        ],
      ]
        .map(
          ([v, k, sub]) =>
            '<div class="kpi"><span>' +
            k +
            "</span><strong>" +
            fa(v) +
            "</strong><small>" +
            sub +
            "</small></div>",
        )
        .join("") +
      '</div><div class="admin-grid"><section class="panel"><h2>روند بازدید و کلیک<a class="section-link" href="/admin/traffic/">گزارش بازدید</a></h2>' +
      chart(d.traffic) +
      '</section><section class="panel"><h2>حساب‌ها و صفحات<a class="section-link" href="/admin/users/">کاربران</a></h2>' +
      summary([
        ["شماره‌های تأییدشده", fa(d.users.verified)],
        ["کاربران دارای نشست فعال", fa(d.sessions.total)],
        ["رزومه‌های منتشرشده", fa(d.pages.resumes)],
        ["صفحه‌های لینک منتشرشده", fa(d.pages.links)],
        ["اشتراک‌های فعال", fa(d.subscriptions.total)],
        ["موجودی کل کیف پول‌ها", fa(Number(d.wallet.balance) / 2000) + " It"],
      ]) +
      '</section><section class="panel"><h2>ارسال پیامک<a class="section-link" href="/admin/otp/">گزارش OTP</a></h2>' +
      chart(d.otpDaily, true) +
      '</section><section class="panel"><h2>تأیید و کنترل دسترسی</h2>' +
      summary([
        ["درخواست ارسال در بازه", fa(d.otp.total)],
        ["کدهای تأییدشده", fa(d.otp.verified)],
        ["حساب‌های محدودشده", fa(d.controls.suspended)],
        ["شروع داده‌های OTP در بازه", date(d.otp.started)],
      ]) +
      '<p class="notice">پذیرش سرویس به معنی تحویل به گوشی نیست. آمار ماندگار OTP از نسخهٔ ۲۱ ثبت می‌شود.</p></section></div>'
    );
  }
  const userLink = (id, name) =>
    '<a href="/admin/users/?user=' +
    encodeURIComponent(id) +
    '">' +
    esc(name || "مشاهدهٔ حساب") +
    "</a>";
  function publication(v) {
    const p = parse(v) || {};
    return (
      "رزومه: " +
      (p.resume?.status === "published" ? "منتشرشده" : "پیش‌نویس") +
      " / لینک: " +
      (p.links?.status === "published" ? "منتشرشده" : "پیش‌نویس")
    );
  }
  function listContent(kind, data) {
    const configs = {
      users: [
        ["کاربر", "شماره", "وضعیت", "موجودی It", "تاریخ عضویت", "جزئیات"],
        (r) => [
          userLink(
            r.id,
            [r.first_name, r.last_name].filter(Boolean).join(" ") ||
              r.name ||
              "بدون نام",
          ),
          '<span class="ltr">' + esc(r.phone || "ورود اجتماعی") + "</span>",
          r.suspended
            ? badge(false, "تعلیق‌شده")
            : badge(true, r.is_admin ? "مدیر" : "فعال"),
          fa(Number(r.balance_units) / 2000),
          date(r.created_at),
          userLink(r.id),
        ],
      ],
      pages: [
        ["مالک", "جایگاه", "آدرس", "انتشار", "کنترل انتشار", "ویرایش"],
        (r) => [
          userLink(r.id, r.name),
          fa(r.slot||1),
          r.slug
            ? '<a class="ltr" href="https://' +
              (Number(r.slot)===3?'resumeit.ir/'+esc(r.slug):esc(r.slug)+'.resumeit.ir') +
              '" target="_blank" rel="noopener">' +
              (Number(r.slot)===3?'resumeit.ir/'+esc(r.slug):esc(r.slug)+'.resumeit.ir') + '</a>'
            : "بدون آدرس",
          esc(publication(r.pub)),
          badge(
            !r.publication_blocked && !r.suspended,
            r.suspended ? "حساب تعلیق‌شده" : r.publication_blocked ? "متوقف‌شده" : "مجاز",
          ),
          fa(r.revision),
        ],
      ],
      transactions: [
        ["مالک", "عنوان", "تغییر It", "موجودی پس از تراکنش", "زمان"],
        (r) => [
          userLink(r.user_id, r.name || r.phone),
          esc(r.label),
          fa(Number(r.delta_units) / 2000),
          fa(Number(r.balance_units) / 2000),
          date(r.created_at),
        ],
      ],
      purchases: [
        ["مالک", "محصول", "قیمت It", "نوع دسترسی", "زمان خرید"],
        (r) => [
          userLink(r.user_id, r.name || r.phone),
          esc(r.ref),
          fa(Number(r.price_units) / 2000),
          r.expires_at ? "اشتراک تا " + date(r.expires_at) : "خرید یک‌باره",
          date(r.created_at),
        ],
      ],
      payments: [
        ["مالک", "درگاه", "مبلغ تومان", "وضعیت", "شماره مرجع", "رهگیری", "بررسی‌ها", "آخرین خطا", "زمان"],
        r => [r.user_id?userLink(r.user_id,r.name||r.phone):'حساب حذف‌شده',r.provider==='sep'?'سپ':'زیبال',fa(r.amount_toman),esc(({creating:'آماده‌سازی',pending:'تأیید نشده',verifying:'در حال تأیید',paid:'شارژ انجام شد',review:'نیاز به بررسی',failed:'ناموفق',reversed:'برگشت به کارت',cancelled:'انصراف',expired:'مهلت تمام‌شده'})[r.status]||r.status),esc(r.rrn||'—'),esc(r.trace||'—'),fa(r.attempts),esc(r.last_error||'—'),date(r.created_at)],
      ],
      otp: [
        ["شماره", "کاربرد", "نتیجهٔ ارسال", "زمان درخواست", "تأیید کد"],
        (r) => [
          '<span class="ltr">' + esc(r.phone) + "</span>",
          esc(statuses[r.purpose] || r.purpose),
          badge(r.status === "accepted", statuses[r.status] || r.status),
          date(r.created_at),
          date(r.verified_at),
        ],
      ],
      audit: [
        ["مدیر", "عملیات", "حساب هدف", "دلیل", "زمان"],
        (r) => [
          esc(r.name || r.actor_id),
          esc(actionNames[r.action] || r.action),
          userLink(r.target_id),
          esc(r.reason),
          date(r.created_at),
        ],
      ],
    };
    const otpSummary =
      kind === "otp" && data.stats
        ? '<div class="overview-kpis">' +
          [
            ["accepted", "پذیرفته‌شده"],
            ["failed", "ناموفق"],
            ["pending", "در انتظار نتیجه"],
            ["verified", "کد تأییدشده"],
          ]
            .map(
              ([key, label]) =>
                '<div class="kpi"><span>' +
                label +
                "</span><strong>" +
                fa(data.stats[key]) +
                "</strong><small>با فیلتر انتخاب‌شده</small></div>",
            )
            .join("") +
          '</div><p class="notice">ثبت ماندگار از نسخهٔ ۲۱ شروع شده است. کد پیامک ذخیره یا نمایش داده نمی‌شود و پذیرش سرویس، تحویل به گوشی را اثبات نمی‌کند.</p>'
        : "";
    const [headers, mapper] = configs[kind];
    return (
      otpSummary +
      '<section class="panel">' +
      (!data.rows.length
        ? '<div class="empty">موردی با این فیلتر پیدا نشد. بازه یا عبارت جست‌وجو را تغییر دهید.</div>'
        : table(headers, data.rows.map(mapper))) +
      '<div class="pager"><span>' +
      fa(data.total) +
      " مورد · صفحهٔ " +
      fa(data.page) +
      " از " +
      fa(Math.max(1, Math.ceil(data.total / 25))) +
      '</span><div><button class="btn" id="prev" ' +
      (page === 1 ? "disabled" : "") +
      '>قبلی</button><button class="btn" id="next" ' +
      (page * 25 >= data.total ? "disabled" : "") +
      ">بعدی</button></div></div></section>"
    );
  }
  function detail(d) {
    const u = d.user;
    detailUser=u;
    return (
      '<div class="admin-grid"><section class="panel"><h2>' +
      esc(
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
          u.name ||
          "حساب بدون نام",
      ) +
      "</h2>" +
      summary([
        ["شماره", '<span class="ltr">' + esc(u.phone || "—") + "</span>"],
        ["تأیید شماره", badge(u.phone_verified)],
        ["نقش", roleNames[u.account_role] || (u.is_owner ? roleNames.owner : u.is_admin ? roleNames.admin : u.is_support ? roleNames.support : roleNames.user)],
        ["وضعیت", badge(!u.suspended, u.suspended ? "تعلیق‌شده" : "فعال")],
        ["تاریخ عضویت", date(u.created_at)],
        ["موجودی", fa(Number(d.balance_units) / 2000) + " It"],
        ["نشست‌های فعال", fa(d.sessions.total)],
        [
          "ورود اجتماعی",
          esc(d.social.map((x) => x.provider).join("، ") || "ندارد"),
        ],
      ]) +
      '<div class="detail-actions">' +
      [
        ["credit", "شارژ کیف پول"],
        ["revoke-sessions", "خروج نشست‌ها"],
        ...(!u.is_admin
          ? [
              ['edit-profile','ویرایش مشخصات'],
              ['delete-account','حذف دائمی حساب'],
              [
                u.suspended ? "restore" : "suspend",
                u.suspended ? "رفع تعلیق" : "تعلیق حساب",
              ],
              [
                u.publication_blocked
                  ? "unblock-publication"
                  : "block-publication",
                u.publication_blocked ? "اجازهٔ انتشار" : "توقف انتشار",
              ],
            ]
          : []),
      ]
        .map(
          ([action, label]) =>
            '<button class="btn ' +
            (action === "credit" ? "btn-primary" : "") +
            '" data-action="' +
            action +
            '" data-user="' +
            esc(u.id) +
            '">' +
            label +
            "</button>",
        )
        .join("") +
      '</div>' + (!u.is_admin?'<form id="support-role-form" class="staff-role-form"><h3>نقش ساپورت</h3><p>فقط پاسخ‌گویی به تیکت‌ها؛ بدون دسترسی به مدیریت، پرداخت‌ها، OTP یا تغییر حساب کاربران.</p><label class="admin-channel-row"><span>دسترسی پنل پشتیبانی</span><input type="checkbox" class="toggle" name="enabled" '+(u.is_support?'checked':'')+'></label><label>دلیل تغییر<input class="input" name="reason" required minlength="5" maxlength="500"></label><button class="btn" type="submit">ذخیرهٔ نقش ساپورت</button><p role="status"></p></form>':'')+'</section><section class="panel"><h2>صفحه و دسترسی‌های کاربر</h2>' +
      summary([
        ["آدرس", esc(d.document?.slug || "انتخاب نشده")],
        [
          "وضعیت انتشار",
          esc(d.document ? publication(d.document.pub) : "صفحه ساخته نشده"),
        ],
        ["قالب رزومه", esc(d.document?.template || "—")],
        ["تعداد دسترسی‌ها", fa(d.access.length)],
      ]) +
      (d.documents?.length?table(['جایگاه','آدرس','وضعیت ثبت‌شده'],d.documents.map(doc=>[fa(doc.slot),esc(doc.slug||'انتخاب نشده'),esc(publication(doc.pub))])):'')+
      (d.access.length
        ? table(
            ["محصول", "پایان دسترسی"],
            d.access.map((a) => [esc(a.ref), date(a.expires_at) || "دائمی"]),
          )
        : "") +
      '</section></div><p class="notice">تغییرات مدیریتی به همراه دلیل ثبت می‌شوند. تعلیق، نشست‌ها را می‌بندد و نمایش عمومی را متوقف می‌کند؛ محتوای کاربر حذف نمی‌شود.</p>'
    );
  }
  function catalog(d) {
    const group = $("#catalog-kind").value,
      items =
        group === "plans"
          ? Object.entries(d.plans).map(([id, v]) => ({ id, ...v }))
          : d[group];
    return (
      '<div class="catalog-grid">' +
      items
        .map(
          (x) =>
            '<article class="catalog-item">' +
            (["vista", "satiar"].includes(x.id)
              ? '<img src="/brand/template-' +
                x.id +
                '-thumb.png" alt="نمای قالب ' +
                esc(x.name) +
                '" loading="lazy">'
              : "") +
            "<h2>" +
            esc(x.name || x.id) +
            "</h2><p>" +
            esc(x.desc || x.description || x.id) +
            "</p>" +
            summary([
              [
                "قیمت",
                x.price
                  ? fa(x.price*d.rate/2000) + " تومان / " + fa(x.price / 2000) + " It"
                  : "رایگان",
              ],
              ["شناسه", esc(x.id)],
              ["دسترسی", esc(x.access || (x.months ? "اشتراک" : "رایگان"))],
            ]) +
            "</article>",
        )
        .join("") +
      '</div><p class="notice">قیمت‌ها از فهرست فعال سایت خوانده می‌شوند. تغییر قیمت و توقف فروش در کنترل مالک انجام می‌شود؛ فاکتورهای قبلی حفظ می‌شوند.</p>'
    );
  }
  function health(d) {
    const channels=d.notificationChannels;
    return (
      (d.paymentPolicy?'<section class="panel"><h2>شروع پرداخت بانکی</h2><form id="admin-payment-gateways">'+[['sep','سپ'],['zibal','زیبال']].map(([id,label])=>'<label class="admin-channel-row"><span><b>'+label+'</b><small>'+(d.gateways?.find(g=>g.id===id)?.enabled?'اطلاعات پذیرندگی تنظیم شده':'اطلاعات پذیرندگی در میزبان تنظیم نشده')+'</small></span><input class="toggle" type="checkbox" name="'+id+'" '+(d.paymentPolicy[id]?'checked':'')+' aria-label="اجازهٔ پرداخت جدید با '+label+'"></label>').join('')+'<p>توقف درگاه فقط شروع پرداخت تازه را می‌بندد؛ تأیید و پیگیری پرداخت‌های قبلی ادامه دارد.</p><button class="btn" type="submit">ذخیرهٔ درگاه‌ها</button><p role="status"></p></form></section>':'')+
      (channels?'<section class="panel"><h2>کانال‌های اعلان سایت</h2><p>این کلیدها اجازهٔ سراسری ارسال‌اند؛ دریافت هر کاربر به انتخاب خودش هم وابسته است. پیامک ورود و بازیابی رمز مستقل باقی می‌ماند.</p><form id="admin-notification-channels">'+[['email','ایمیل'],['sms','پیامک اعلان'],['push','پوش مرورگر']].map(([id,label])=>'<label class="admin-channel-row"><span><b>'+label+'</b><small>'+(channels.configured[id]?'پیکربندی سرویس موجود است':'نیازمند پیکربندی امن سرویس')+'</small></span><input class="toggle" type="checkbox" name="'+id+'" '+(channels.enabled[id]?'checked':'')+' aria-label="اجازهٔ سراسری '+label+'"></label>').join('')+'<p>خاموش‌کردن، ارسال‌های بعدی را متوقف می‌کند؛ پیام در حال ارسال قابل پس‌گرفتن نیست. ترجیحات کاربران حفظ می‌شود.</p><button class="btn btn-primary" type="submit">ذخیرهٔ کانال‌های سایت</button><p role="status" data-admin-channel-status></p></form></section>':'')+
      '<div class="admin-grid"><section class="panel"><h2>سرویس‌های فعال</h2>' +
      summary([
        ["پایگاه داده", badge(true, d.database)],
        [
          "پیامک SMS.ir",
          badge(
            d.smsConfigured,
            d.smsConfigured ? "پیکربندی‌شده" : "تنظیم نشده",
          ),
        ],
        [
          "ورود گوگل",
          badge(
            d.googleConfigured,
            d.googleConfigured ? "پیکربندی‌شده" : "تنظیم نشده",
          ),
        ],
        [
          "ورود گیت‌هاب",
          badge(
            d.githubConfigured,
            d.githubConfigured ? "پیکربندی‌شده" : "تنظیم نشده",
          ),
        ],
        ["درگاه سپ", d.gateways?.find(g=>g.id==='sep')?.enabled?"فعال در تنظیمات؛ نیازمند تأیید اتصال واقعی":"در انتظار فعال‌سازی"],
        ["درگاه زیبال", d.gateways?.find(g=>g.id==='zibal')?.enabled?"فعال در تنظیمات؛ نیازمند تأیید اتصال واقعی":"در انتظار فعال‌سازی"],
        ["دامنه", esc(d.origin)],
      ]) +
      '</section><section class="panel"><h2>نسخه و محدودیت‌ها</h2>' +
      summary([
        ["نسخه", '<span class="ltr">' + esc(d.displayVersion||d.version) + "</span>"],
        ["زمان فعالیت سرور", fa(Math.floor(d.uptime / 60000)) + " دقیقه"],
        ["سقف روزانهٔ OTP", fa(d.limits.otpDaily)],
        ["سقف روزانهٔ هر شماره", fa(d.limits.phoneDaily)],
        ["فاصلهٔ ارسال مجدد", fa(d.limits.resendSeconds) + " ثانیه"],
        ["اعتبار کد", fa(d.limits.otpSeconds) + " ثانیه"],
      ]) +
      '</section></div><p class="notice">پیکربندی‌شده بودن، سلامت لحظه‌ای سرویس یا تحویل پیامک را تضمین نمی‌کند. کلیدها و رمزهای سرویس‌ها در این پنل نمایش داده نمی‌شوند.</p>'
    );
  }
  async function load() {
    const token = ++loadToken;
    $("#content").setAttribute("aria-busy", "true");
    $("#content").innerHTML =
      '<div class="loading" role="status">در حال دریافت اطلاعات…</div>';
    $("#export").disabled = true;
    try {
      const detailId = new URL(location.href).searchParams.get("user");
      let route = section === "traffic" ? "overview" : section;
      if (section === "users" && detailId) {
        if (!/^[a-f0-9-]{36}$/.test(detailId))
          throw new Error("شناسهٔ حساب معتبر نیست");
        route = "users/" + detailId;
      }
      const params = new URLSearchParams({
          page,
          days: $("#days").value,
          q: $("#search").value,
          status: $("#status").value,
        }),
        d = await api(route + "?" + params);
      if (token !== loadToken) return;
      rows = d.rows || [];
      total = d.total || 0;
      $("#content").innerHTML =
        section === "overview"
          ? overview(d)
          : section === "traffic"
            ? '<section class="panel"><h2>روند بازدید صفحات</h2>' +
              chart(d.traffic) +
              table(
                ["تاریخ", "نوع", "تعداد"],
                d.traffic.map((r) => [
                  new Date(Number(r.day) * 86400000).toLocaleDateString(
                    "fa-IR",
                  ),
                  esc(r.event),
                  fa(r.total),
                ]),
              ) +
              "</section>"
            : section === "catalog"
              ? catalog(d)
              : section === "health"
                ? health(d)
                : detailId && section === "users"
                  ? detail(d)
                  : listContent(section, d);
      permissions(d,detailId);
      if(fullAdmin&&detailId&&section==='users')$('#content').insertAdjacentHTML('beforeend',window.ownerUserControls(d));
      if(fullAdmin&&section==='catalog'&&d.policy)$('#content').insertAdjacentHTML('afterbegin',window.ownerCommerceControls(d));
      document.querySelectorAll('.owner-product-row').forEach(row=>{if(!row.querySelector('[data-owner-price]'))row.querySelector('[data-owner-paused]').disabled=true;});
      $("#updated").textContent = "آخرین دریافت: " + date(Date.now());
      $("#export").disabled = !rows.length;
    } catch (e) {
      if (token === loadToken)
        $("#content").innerHTML =
          '<div class="notice error" role="alert">' +
          esc(e.message) +
          ' <button class="btn" id="retry">تلاش دوباره</button></div>';
    } finally {
      if (token === loadToken) {
        $("#content").removeAttribute("aria-busy");
        if($("#refresh"))$("#refresh").disabled = false;
      }
    }
  }
  function permissions(data,detailId){
    if(!fullAdmin){
      document.querySelectorAll('[data-action="credit"],[data-action="delete-account"]').forEach(button=>button.remove());
      for(const id of ['admin-payment-gateways','admin-notification-channels']){const form=document.getElementById(id);if(form){const notice=document.createElement('p');notice.className='notice';notice.textContent='تغییر تنظیمات سراسری این بخش فقط برای مالک سایت مجاز است.';form.replaceWith(notice);}}
      return;
    }
    if(section==='users'&&detailId){
      $('#support-role-form')?.remove();
      const role=detailUser.account_role||(detailUser.is_admin?'admin':detailUser.is_support?'support':'user');
      if(detailId===ownerId)return;
      $('#content .detail-actions').insertAdjacentHTML('afterend','<form id="account-role-form" class="staff-role-form"><h3>نقش حساب</h3><p>مالک می‌تواند تنظیمات حساس و نقش مدیرها را تغییر دهد. ادمین به کنترل‌های سراسری سرویس‌ها و پاک‌کردن لاگ‌ها دسترسی ندارد.</p><label>سطح دسترسی<select class="select" name="role">'+Object.entries(roleNames).map(([id,label])=>'<option value="'+id+'" '+(role===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>دلیل تغییر<input class="input" name="reason" required minlength="5" maxlength="500"></label><label>برای تأیید، نام نقش انتخاب‌شده را بنویس<input class="input" name="confirmation" required autocomplete="off" placeholder="'+esc(roleNames[role])+'"></label><button class="btn" type="submit">ذخیرهٔ نقش حساب</button><p role="status"></p></form>');
    }
    if(section==='audit')$('#content').insertAdjacentHTML('afterbegin','<section class="panel audit-purge"><h2>پاک‌سازی لاگ‌های مدیریتی</h2><p>حذف برگشت‌پذیر نیست؛ رسیدهای پاک‌سازی شامل عامل، دلیل و تعداد حذف‌شده باقی می‌مانند.</p><form id="audit-purge-form" class="staff-role-form"><label>بازهٔ حذف<select class="select" name="range"><option value="90">قدیمی‌تر از ۹۰ روز</option><option value="30">قدیمی‌تر از ۳۰ روز</option><option value="7">قدیمی‌تر از ۷ روز</option><option value="0">تمام لاگ‌ها تا همین لحظه</option></select></label><label>دلیل پاک‌سازی<input class="input" name="reason" required minlength="5" maxlength="500"></label><label>برای تأیید بنویس: حذف لاگ‌ها<input class="input" name="confirmation" required autocomplete="off"></label><button class="btn" type="submit">حذف لاگ‌های این بازه</button><p role="status"></p></form></section>');
  }
  function actionDialog(id, action) {
    const dlg = $("#action-dialog");
    $("#action-title").textContent = actionNames[action];
    $("#action-explain").textContent =
      action==='delete-account'?'حذف برگشت‌ناپذیر است: صفحات، نشست‌ها، تیکت‌ها و کیف پول حذف می‌شوند. رسیدهای بانکی برای پیگیری بدون حساب نگه داشته می‌شوند. تأیید: '+(detailUser.phone||id):"این عملیات روی حساب انتخاب‌شده انجام می‌شود و در سابقهٔ مدیریت باقی می‌ماند.";
    $('#profile-fields').hidden=action!=='edit-profile';
    $('#delete-field').hidden=action!=='delete-account';
    $('#delete-confirm').required=action==='delete-account';$('#delete-confirm').value='';
    for(const [field,key] of [['first','first_name'],['last','last_name'],['role','role'],['bio','bio']])$('#edit-'+field).value=detailUser?.[key]||'';
    $('#edit-first').required=$('#edit-last').required=action==='edit-profile';
    $("#amount-field").hidden = action !== "credit";
    $("#amount").required = action === "credit";
    $("#action-error").textContent = "";
    $("#reason").value = "";
    $("#amount").value = "";
    const requestId = crypto.randomUUID().replace(/-/g, "");
    let pending = false;
    $("#action-form").onsubmit = async (e) => {
      e.preventDefault();
      if (pending) return;
      pending = true;
      $("#action-submit").disabled = true;
      $("#action-cancel").disabled = true;
      try {
        const reason = $("#reason").value.trim(),
          toman = Number($("#amount").value);
        await api("users/" + id + "/actions", {
          action,
          reason,
          requestId,
          ...(action === "credit" ? { toman } : {}),
          ...(action==='edit-profile'?{profile:Object.fromEntries([['first','first_name'],['last','last_name'],['role','role'],['bio','bio']].map(([field,key])=>[key,$('#edit-'+field).value]))}:{}),
          ...(action==='delete-account'?{confirmation:$('#delete-confirm').value}:{}),
        });
        dlg.close();
        if(action==='delete-account')history.replaceState(null,'','/admin/users/');
        await load();
      } catch (error) {
        $("#action-error").textContent = error.message;
      } finally {
        pending = false;
        $("#action-submit").disabled = false;
        $("#action-cancel").disabled = false;
      }
    };
    dlg.oncancel = (e) => {
      if (pending) e.preventDefault();
    };
    $("#action-cancel").onclick = () => dlg.close();
    dlg.showModal();
  }
  function exportCsv() {
    const keys = Object.keys(rows[0] || {}),
      cell = (v) =>
        '"' +
        String(typeof v === "object" ? JSON.stringify(v) : (v ?? ""))
          .replace(/^[\s]*[=+@\-\t\r]/, "'$&")
          .replace(/"/g, '""') +
        '"',
      csv =
        "\uFEFF" +
        [keys, ...rows.map((r) => keys.map((k) => r[k]))]
          .map((row) => row.map(cell).join(","))
          .join("\r\n");
    const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "resumeit-" + section + "-page-" + page + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function boot() {
    window.bindOwnerControls(api,load,()=>ownerId);
    const response = await fetch("/api/auth/session", { cache: "no-store" }),
      { user } = await response.json();
    if (!user) {
      location.replace("/login/");
      return;
    }
    if (!user.is_admin) {
      location.replace("/dashboard/");
      return;
    }
    ownerId=user.id;
    fullAdmin=!!user.is_owner;
    const info = sections[section];
    $("#page-title").textContent = info[0];
    $("#page-desc").textContent = info[2];
    $("#section-title").textContent = info[0];
    $("#admin-name").textContent =
      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      "مدیر ResumeIt";
    const groups=[['دید کلی','chart',['overview','traffic']],['کاربران و صفحات','user',['users','pages']],['امور مالی','card',['payments','transactions','purchases']],['محصولات','palette',['catalog']],['امنیت و سرویس‌ها','shield',['health','otp','audit']]],active=groups.find(g=>g[2].includes(section));
    const href=id=>id==='overview'?'/admin/':'/admin/'+id+'/';
    $("#admin-nav").innerHTML='<ul class="menu">'+groups.map(([label,symbol,ids])=>'<li><a title="'+label+'" href="'+href(ids.includes(section)?section:ids[0])+'" '+(ids.includes(section)?'aria-current="page"':'')+'>'+icon(symbol)+'<span>'+label+'</span></a></li>').join('')+'<li><a href="/staff/" title="پنل پشتیبانی">'+icon('help')+'<span>پشتیبانی و تیکت‌ها</span></a></li></ul>';
    $("#admin-menu").innerHTML = icon("menu");
    const topnav=document.createElement('nav');topnav.className='admin-topnav';topnav.setAttribute('aria-label','دسترسی سریع مدیریت');topnav.append($('#admin-menu'));
    for(const id of active[2]){const a=document.createElement('a');a.href=href(id);a.innerHTML=icon(sections[id][1])+'<span>'+sections[id][0]+'</span>';if(id===section)a.setAttribute('aria-current','page');topnav.append(a);}
    $('.admin-head').after(topnav);$('#admin-menu').setAttribute('aria-controls','admin-side');$('#admin-menu').title='باز و بسته کردن منوی مدیریت';
    $('#admin-close').innerHTML=icon('x');
    $('.admin-payment').remove();$('#refresh').remove();
    const footer=$('.admin-side footer'),name=$('#admin-name'),logout=$('#logout'),profile=document.createElement('details');profile.className='admin-profile';
    profile.innerHTML='<summary title="پروفایل و دسترسی سریع"><img src="/brand/resumeit-mark-v1.png" alt="" width="42" height="42"><span><strong></strong><small>مدیر · دسترسی سریع</small></span>'+icon('chevD')+'</summary><div class="admin-profile-menu"><a href="/dashboard/settings/">'+icon('user')+'تنظیمات حساب</a><a href="/staff/">'+icon('help')+'میز پشتیبانی</a></div>';
    profile.querySelector('strong').replaceWith(name);logout.innerHTML=icon('logout')+'<span>خروج از حساب</span>';profile.querySelector('.admin-profile-menu').append(logout);footer.prepend(profile);
    profile.querySelector('summary small').textContent=(fullAdmin?'مالک / فول ادمین':'ادمین')+' · دسترسی سریع';
    document.addEventListener('click',e=>{if(!profile.contains(e.target))profile.open=false;});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&profile.open){profile.open=false;profile.querySelector('summary').focus();}});
    $("#search-wrap").hidden = ![
      "users",
      "pages",
      "transactions",
      "payments",
      "purchases",
      "otp",
      "audit",
    ].includes(section);
    $("#days-wrap").hidden = ["users", "pages", "catalog", "health"].includes(
      section,
    );
    $("#status-wrap").hidden = !["users", "otp", "payments"].includes(section);
    $("#status").innerHTML =
      '<option value="">همهٔ وضعیت‌ها</option>' +
      (section === "payments"
        ? '<option value="paid">شارژ انجام شد</option><option value="pending">تأیید نشده</option><option value="verifying">در حال تأیید</option><option value="review">نیاز به بررسی</option><option value="failed">ناموفق</option><option value="reversed">برگشت به کارت</option><option value="cancelled">انصراف</option><option value="expired">مهلت تمام‌شده</option>'
        : section === "users"
        ? '<option value="active">فعال</option><option value="suspended">تعلیق‌شده</option>'
        : '<option value="accepted">پذیرفته‌شده</option><option value="failed">ناموفق</option><option value="pending">در انتظار</option>');
    $("#catalog-controls").hidden = section !== "catalog";
    $("#export").hidden = ["overview", "traffic", "catalog", "health"].includes(
      section,
    );
    if (new URL(location.href).searchParams.has("user")) {
      $("#filters").hidden = true;
      $("#export").hidden = true;
    }
    $("#filters").onsubmit = (e) => {
      e.preventDefault();
      page = 1;
      load();
    };
    $("#days").onchange = () => {
      page = 1;
      load();
    };
    $("#status").onchange = () => {
      page = 1;
      load();
    };
    $("#catalog-kind").onchange = load;
    $("#export").onclick = exportCsv;
    document.addEventListener('change',event=>{const form=event.target.closest('#account-role-form');if(form&&event.target.name==='role'){const confirmation=form.elements.namedItem('confirmation');confirmation.value='';confirmation.placeholder=roleNames[event.target.value];form.querySelector('[role=status]').textContent='';delete form.dataset.requestId;}});
    document.addEventListener('submit',async event=>{
      if(['account-role-form','audit-purge-form'].includes(event.target.id)){
        event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]'),status=form.querySelector('[role=status]');if(button.disabled)return;
        const role=form.elements.namedItem('role')?.value;
        if(role&&form.elements.namedItem('confirmation').value.trim()!==roleNames[role]){status.textContent='نام نقش انتخاب‌شده را دقیق وارد کن: '+roleNames[role];return;}
        const input={reason:form.elements.namedItem('reason').value,requestId:form.dataset.requestId||(form.dataset.requestId=crypto.randomUUID()),...(role?{role}:{before:Number(form.dataset.before||(form.dataset.before=Date.now()-Number(form.elements.namedItem('range').value)*86400000)),confirmation:form.elements.namedItem('confirmation').value})};
        button.disabled=true;
        try{const result=await api(role?'users/'+detailUser.id+'/role':'audit/purge',input);await load();const output=document.querySelector('#'+form.id+' [role=status]');if(output)output.textContent=role?'نقش حساب ذخیره شد.':fa(result.deleted)+' لاگ حذف شد؛ رسید پاک‌سازی ثبت شد.';}catch(error){status.textContent=error.message;delete form.dataset.requestId;delete form.dataset.before;}finally{button.disabled=false;}return;
      }
      if(event.target.id==='support-role-form'){
        event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]'),status=form.querySelector('[role=status]');if(button.disabled)return;button.disabled=true;
        const requestId=form.dataset.requestId||(form.dataset.requestId=crypto.randomUUID());
        try{await api('users/'+detailUser.id+'/support-role',{enabled:form.elements.namedItem('enabled').checked,reason:form.elements.namedItem('reason').value,requestId});await load();}catch(error){status.textContent=error.message;delete form.dataset.requestId;}finally{button.disabled=false;}return;
      }
      if(event.target.id==='admin-payment-gateways'){
        event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]'),status=form.querySelector('[role=status]');if(button.disabled)return;button.disabled=true;
        try{await api('payment-gateways',Object.fromEntries(['sep','zibal'].map(key=>[key,form.elements.namedItem(key).checked])));status.textContent='تنظیم درگاه‌ها ذخیره شد؛ پیگیری پرداخت‌های قبلی ادامه دارد.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}return;
      }
      if(event.target.id!=='admin-notification-channels')return;event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]'),status=form.querySelector('[data-admin-channel-status]');if(button.disabled)return;button.disabled=true;
      try{await api('notification-channels',Object.fromEntries(['email','sms','push'].map(key=>[key,form.elements.namedItem(key).checked])));status.textContent='تنظیم کانال‌های سایت ذخیره شد؛ انتخاب کاربران حفظ شده است.';}
      catch(error){status.textContent=error.message;}finally{button.disabled=false;}
    });
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-action]");
      if (a) actionDialog(a.dataset.user, a.dataset.action);
      if (e.target.closest("#prev")) {
        page--;
        load();
      }
      if (e.target.closest("#next")) {
        page++;
        load();
      }
      if (e.target.closest("#retry")) load();
    });
    const mobile = matchMedia("(max-width:760px)");
    const drawer = (open) => {
      const wasOpen = $("#admin-side").dataset.open === "true";
      $(".admin-main").inert = open && mobile.matches;
      $("#admin-side").inert = !open && mobile.matches;
      $("#admin-side").dataset.open = open;
      $("#admin-backdrop").dataset.open = open;
      $("#admin-menu").setAttribute("aria-expanded", String(open));
      $('.admin-shell').classList.toggle('admin-compact',!open&&!mobile.matches);
      $('.admin-brand img').src=!open&&!mobile.matches?'/brand/resumeit-mark-v1.png':'/brand/resumeit-logo-v1.png';
      $('#admin-menu').setAttribute('aria-label',open?'جمع کردن منوی مدیریت':'باز کردن منوی مدیریت');
      if (open&&mobile.matches) $("#admin-close").focus();
      else if (mobile.matches && wasOpen) $("#admin-menu").focus();
    };
    drawer(!mobile.matches);
    mobile.addEventListener("change", () => drawer(!mobile.matches));
    $("#admin-close").onclick = () => drawer(false);
    $("#admin-menu").onclick = () =>
      drawer($("#admin-side").dataset.open !== "true");
    $("#admin-backdrop").onclick = () => drawer(false);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#admin-side").dataset.open === "true") drawer(false);
    });
    $("#user-panel").onclick = () => {
      sessionStorage.setItem("ri-panel-choice", user.id);
    };
    $("#logout").onclick = async () => {
      try {
        const r = await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!r.ok) throw new Error();
        sessionStorage.removeItem("ri-panel-choice");
        location.assign("/login/");
      } catch {
        $("#content").innerHTML =
          '<p class="notice error" role="alert">خروج انجام نشد؛ دوباره تلاش کنید.</p>';
      }
    };
    await load();
  }
  boot().catch(() => {
    $("#content").innerHTML =
      '<p class="notice error">پنل آماده نشد؛ صفحه را دوباره باز کنید.</p>';
  });
})();
