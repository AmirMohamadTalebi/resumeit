const { randomUUID } = require("node:crypto");
const { fail } = require("../dashboard/model.cjs");
const { RI } = require("../dashboard/render.cjs");
const publicationSummary="JSON_OBJECT('resume',JSON_OBJECT('status',JSON_UNQUOTE(JSON_EXTRACT(pub,'$.resume.status'))),'links',JSON_OBJECT('status',JSON_UNQUOTE(JSON_EXTRACT(pub,'$.links.status')))) AS pub";
const documents="(SELECT user_id,1 slot,slug,draft,pub,revision FROM dashboard_documents UNION ALL SELECT user_id,slot,slug,draft,pub,revision FROM dashboard_workspaces)";
const metrics="(SELECT user_id,day,event,total FROM dashboard_metrics UNION ALL SELECT user_id,day,event,total FROM dashboard_workspace_metrics)";
const editableProfile = input => {
  const profile={};
  for(const [key,max] of [['first_name',39],['last_name',39],['role',100],['bio',500]]){
    if(typeof input?.[key]!=='string'||input[key].trim().length>max||/[\u0000-\u001f\u007f<>]/.test(input[key]))fail('اطلاعات مشخصات معتبر نیست');
    profile[key]=input[key].trim();
  }
  if(!profile.first_name||!profile.last_name)fail('نام و نام خانوادگی را کامل کن');
  return profile;
};
module.exports = ({ execute, transaction }) => ({
  async paymentPolicy(){const [row]=await execute('SELECT sep_enabled,zibal_enabled FROM payment_policy WHERE id=1');return {sep:!!row?.sep_enabled,zibal:!!row?.zibal_enabled};},
  async savePaymentPolicy(actor,input){
    if(!input||typeof input.sep!=='boolean'||typeof input.zibal!=='boolean')fail('وضعیت درگاه معتبر نیست');
    return transaction(async con=>{
      const [[manager]]=await con.execute('SELECT a.user_id FROM admin_accounts a LEFT JOIN admin_controls c ON c.user_id=a.user_id WHERE a.user_id=? AND COALESCE(c.suspended,0)=0 FOR UPDATE',[actor]);
      if(!manager)fail('دسترسی مدیریت ندارید',403);
      await con.execute('SELECT id FROM payment_policy WHERE id=1 FOR UPDATE');
      await con.execute('UPDATE payment_policy SET sep_enabled=?,zibal_enabled=? WHERE id=1',[input.sep,input.zibal]);
      await con.execute('INSERT INTO admin_audit(id,actor_id,target_id,action,reason,details,request_id,created_at) VALUES(?,?,NULL,?,?,?,?,?)',[randomUUID(),actor,'payment-gateways','تغییر اجازهٔ شروع پرداخت',JSON.stringify({sep:input.sep,zibal:input.zibal}),randomUUID(),Date.now()]);
      return {ok:true};
    });
  },
  async adminOverview(from) {
    const results = await Promise.all([
      execute(
        "SELECT COUNT(*) total,SUM(phone_verified) verified,SUM(created_at>=FROM_UNIXTIME(?/1000)) recent FROM users",
        [from],
      ),
      execute(
        `SELECT COUNT(*) total,SUM(d.slot<>3 AND JSON_UNQUOTE(JSON_EXTRACT(d.pub,'$.resume.status'))='published' AND COALESCE(c.suspended,0)=0 AND COALESCE(c.publication_blocked,0)=0) resumes,SUM(JSON_UNQUOTE(JSON_EXTRACT(d.pub,'$.links.status'))='published' AND COALESCE(c.suspended,0)=0 AND COALESCE(c.publication_blocked,0)=0) links FROM ${documents} d LEFT JOIN admin_controls c ON c.user_id=d.user_id WHERE d.slot=1 OR EXISTS(SELECT 1 FROM account_access a WHERE a.user_id=d.user_id AND a.ref LIKE 'subscription:%' AND a.expires_at>?)`,
        [Date.now()],
      ),
      execute(
        "SELECT COUNT(*) total,SUM(status='accepted') accepted,SUM(status='failed') failed,SUM(verified_at IS NOT NULL) verified,MIN(created_at) started FROM otp_events WHERE created_at>=?",
        [from],
      ),
      execute("SELECT COALESCE(SUM(balance_units),0) balance FROM wallets"),
      execute(
        "SELECT COUNT(*) total,COALESCE(SUM(-delta_units),0) spent FROM wallet_transactions WHERE delta_units<0 AND created_at>=?",
        [from],
      ),
      execute(
        "SELECT COUNT(DISTINCT user_id) total FROM sessions WHERE expires_at>?",
        [Date.now()],
      ),
      execute("SELECT COUNT(*) total FROM account_access WHERE expires_at>?", [
        Date.now(),
      ]),
      execute(
        `SELECT day,event,SUM(total) total FROM ${metrics} m WHERE day>=? GROUP BY day,event ORDER BY day`,
        [Math.floor((from + 12600000) / 86400000)],
      ),
      execute(
        "SELECT FLOOR((created_at+12600000)/86400000) day,COUNT(*) total,SUM(status='accepted') accepted,SUM(status='failed') failed FROM otp_events WHERE created_at>=? GROUP BY day ORDER BY day",
        [from],
      ),
      execute(
        "SELECT COALESCE(SUM(suspended),0) suspended,COALESCE(SUM(publication_blocked),0) blocked FROM admin_controls WHERE suspended=TRUE OR publication_blocked=TRUE",
      ),
    ]);
    return {
      users: results[0][0],
      pages: results[1][0],
      otp: results[2][0],
      wallet: results[3][0],
      purchases: results[4][0],
      sessions: results[5][0],
      subscriptions: results[6][0],
      traffic: results[7],
      otpDaily: results[8],
      controls: results[9][0],
      at: Date.now(),
    };
  },
  async adminList(kind, { page, q, from, status }) {
    const sources = {
      users: {
        table:
          "users u JOIN profiles p ON p.user_id=u.id LEFT JOIN wallets w ON w.user_id=u.id LEFT JOIN admin_controls c ON c.user_id=u.id",
        fields:
          "u.id,u.phone,u.phone_verified,u.created_at,p.name,p.first_name,p.last_name,COALESCE(w.balance_units,0) balance_units,COALESCE(c.suspended,0) suspended,EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) is_admin",
        search: "CONCAT_WS(' ',u.phone,p.name,p.first_name,p.last_name)",
        date: "UNIX_TIMESTAMP(u.created_at)*1000",
        order: "u.created_at DESC,u.id",
      },
      pages: {
        table:
          `${documents} d JOIN profiles p ON p.user_id=d.user_id LEFT JOIN admin_controls c ON c.user_id=d.user_id`,
        fields:
          `d.user_id id,d.slot,d.slug,${publicationSummary},d.revision,p.name,COALESCE(c.publication_blocked,0) publication_blocked,COALESCE(c.suspended,0) suspended`,
        search: "CONCAT_WS(' ',d.slug,p.name)",
        order: "d.user_id,d.slot",
      },
      transactions: {
        table:
          "wallet_transactions t JOIN users u ON u.id=t.user_id LEFT JOIN profiles p ON p.user_id=u.id",
        fields:
          "t.id,t.user_id,t.delta_units,t.balance_units,t.label,t.created_at,u.phone,p.name",
        search: "CONCAT_WS(' ',u.phone,p.name,t.label)",
        date: "t.created_at",
        order: "t.created_at DESC,t.id",
      },
      purchases: {
        table:
          "account_access a JOIN users u ON u.id=a.user_id LEFT JOIN profiles p ON p.user_id=u.id",
        fields:
          "a.user_id,a.ref,a.price_units,a.expires_at,a.created_at,u.phone,p.name",
        search: "CONCAT_WS(' ',u.phone,p.name,a.ref)",
        date: "a.created_at",
        order: "a.created_at DESC,a.user_id,a.ref",
      },
      payments: {
        table: "payment_orders o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN profiles p ON p.user_id=o.user_id",
        fields: "o.id,o.user_id,o.provider,o.amount_toman,o.status,o.rrn,o.trace,o.last_error,o.attempts,o.created_at,o.updated_at,u.phone,p.name",
        search: "CONCAT_WS(' ',o.id,u.phone,p.name,o.rrn,o.trace)",
        date: "o.created_at",
        order: "o.created_at DESC,o.id",
      },
      otp: {
        table: "otp_events",
        fields: "id,phone,purpose,status,created_at,verified_at",
        search: "phone",
        date: "created_at",
        order: "created_at DESC,id",
      },
      audit: {
        table: "admin_audit a LEFT JOIN profiles p ON p.user_id=a.actor_id",
        fields:
          "a.id,a.actor_id,a.target_id,a.action,a.reason,a.details,a.created_at,p.name",
        search: "CONCAT_WS(' ',a.action,a.reason,p.name,a.target_id)",
        date: "a.created_at",
        order: "a.created_at DESC,a.id",
      },
    };
    const s = sources[kind];
    if (!s) fail("بخش پیدا نشد", 404);
    const where = [`${s.search} LIKE ? ESCAPE '='`],
      params = ["%" + q.replace(/[=%_]/g, (v) => "=" + v) + "%"];
    if (s.date && kind !== "users") {
      where.push(`${s.date}>=?`);
      params.push(from);
    }
    if (kind === "otp" && status) {
      where.push("status=?");
      params.push(status);
    }
    if(kind==='payments'&&status){where.push('o.status=?');params.push(status);}
    if (kind === "users" && status) {
      where.push("COALESCE(c.suspended,0)=?");
      params.push(status === "suspended" ? 1 : 0);
    }
    const clause = where.join(" AND "),
      [count] = await execute(
        `SELECT COUNT(*) total FROM ${s.table} WHERE ${clause}`,
        params,
      );
    const rows = await execute(
      `SELECT ${s.fields} FROM ${s.table} WHERE ${clause} ORDER BY ${s.order} LIMIT 25 OFFSET ${25 * (page - 1)}`,
      params,
    );
    const stats =
      kind === "otp"
        ? (
            await execute(
              `SELECT COALESCE(SUM(status='accepted'),0) accepted,COALESCE(SUM(status='failed'),0) failed,COALESCE(SUM(status='pending'),0) pending,COALESCE(SUM(verified_at IS NOT NULL),0) verified FROM otp_events WHERE ${clause}`,
              params,
            )
          )[0]
        : undefined;
    return {
      rows,
      total: Number(count.total),
      page,
      pageSize: 25,
      ...(stats ? { stats } : {}),
    };
  },
  async adminUser(id) {
    const [user] = await execute(
      "SELECT u.id,u.phone,u.phone_verified,u.created_at,p.name,p.first_name,p.last_name,p.role,p.bio,COALESCE(c.suspended,0) suspended,COALESCE(c.publication_blocked,0) publication_blocked,EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) is_admin FROM users u JOIN profiles p ON p.user_id=u.id LEFT JOIN admin_controls c ON c.user_id=u.id WHERE u.id=?",
      [id],
    );
    if (!user) fail("حساب پیدا نشد", 404);
    const [document, wallet, access, sessions, social, traffic] =
      await Promise.all([
        execute(
          `SELECT slot,slug,${publicationSummary},revision,JSON_UNQUOTE(JSON_EXTRACT(draft,'$.theme.resume')) template FROM ${documents} d WHERE user_id=? ORDER BY slot`,
          [id],
        ),
        execute("SELECT balance_units FROM wallets WHERE user_id=?", [id]),
        execute(
          "SELECT ref,price_units,expires_at,created_at FROM account_access WHERE user_id=?",
          [id],
        ),
        execute(
          "SELECT COUNT(*) total,MAX(expires_at) expires_at FROM sessions WHERE user_id=? AND expires_at>?",
          [id, Date.now()],
        ),
        execute("SELECT provider FROM social_identities WHERE user_id=?", [id]),
        execute(
          `SELECT event,SUM(total) total FROM ${metrics} m WHERE user_id=? GROUP BY event`,
          [id],
        ),
      ]);
    return {
      user,
      document: document[0] || null,
      documents: document,
      balance_units: wallet[0]?.balance_units || 0,
      access,
      sessions: sessions[0],
      social,
      traffic,
    };
  },
  async adminAction(actor, id, action, input) {
    return transaction(async (con) => {
      const [[manager]] = await con.execute(
        "SELECT a.user_id FROM admin_accounts a JOIN users u ON u.id=a.user_id LEFT JOIN admin_controls c ON c.user_id=u.id WHERE a.user_id=? AND COALESCE(c.suspended,0)=0 FOR UPDATE",
        [actor],
      );
      if (!manager) fail("دسترسی مدیریت ندارید", 403);
      const profile=action==='edit-profile'?editableProfile(input.profile):null;
      const [[prior]] = await con.execute(
        "SELECT actor_id,target_id,action,reason,details FROM admin_audit WHERE request_id=?",
        [input.requestId],
      );
      if (prior) {
        const details =
          typeof prior.details === "string"
            ? JSON.parse(prior.details)
            : prior.details;
        if (
          prior.actor_id !== actor ||
          prior.target_id !== id ||
          prior.action !== action ||
          prior.reason !== input.reason ||
          (action === "credit" && details.toman !== input.toman) ||
          (action === "edit-profile" && JSON.stringify(details.profile)!==JSON.stringify(profile)) ||
          (action === "delete-account" && details.confirmation!==input.confirmation)
        )
          fail("شناسهٔ درخواست تکراری است", 409);
        return { ok: true, repeated: true };
      }
      const [[user]] = await con.execute('SELECT id,phone FROM users WHERE id=? FOR UPDATE',[id]);
      if(!user)fail('حساب پیدا نشد',404);
      const details = {};
      if(['edit-profile','delete-account'].includes(action)){
        const [[admin]]=await con.execute('SELECT user_id FROM admin_accounts WHERE user_id=?',[id]);
        if(admin)fail('ویرایش یا حذف حساب مدیر از این مسیر مجاز نیست',409);
        if(action==='edit-profile'){
          await con.execute('UPDATE profiles SET first_name=?,last_name=?,name=?,role=?,bio=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?',[profile.first_name,profile.last_name,profile.first_name+' '+profile.last_name,profile.role,profile.bio,id]);
          details.profile=profile;
        }else{
          if(input.confirmation!==(user.phone||id))fail('برای حذف دائمی، شمارهٔ حساب یا شناسهٔ نمایش‌داده‌شده را دقیق وارد کن');
          details.confirmation=input.confirmation;
          await con.execute('DELETE FROM oauth_states WHERE owner_id=?',[id]);
          await con.execute('DELETE FROM otp_challenges WHERE owner_id=? OR phone=?',[id,user.phone]);
          await con.execute('DELETE FROM users WHERE id=?',[id]);
        }
      } else if (action === "credit") {
        const amount = input.toman;
        if (
          !Number.isSafeInteger(amount) ||
          amount <= 0 ||
          amount > 100000000 ||
          amount % RI.IT_RATE
        )
          fail("مبلغ باید مضرب ۲٬۰۰۰ تومان باشد");
        await con.execute(
          "INSERT IGNORE INTO wallets(user_id,balance_units) VALUES(?,0)",
          [id],
        );
        const [[wallet]] = await con.execute(
          "SELECT balance_units FROM wallets WHERE user_id=? FOR UPDATE",
          [id],
        );
        const balance = Number(wallet.balance_units) + amount;
        if (!Number.isSafeInteger(balance)) fail("موجودی بیش از حد مجاز است");
        await con.execute(
          "UPDATE wallets SET balance_units=? WHERE user_id=?",
          [balance, id],
        );
        await con.execute(
          "INSERT INTO wallet_transactions(id,user_id,delta_units,balance_units,label,reference,created_at) VALUES(?,?,?,?,?,?,?)",
          [
            randomUUID(),
            id,
            amount,
            balance,
            "شارژ مدیریت: " + input.reason.slice(0, 90),
            "admin:" + input.requestId,
            Date.now(),
          ],
        );
        details.toman = amount;
        details.balance = balance;
      } else if (
        [
          "suspend",
          "restore",
          "block-publication",
          "unblock-publication",
        ].includes(action)
      ) {
        const [[admin]] = await con.execute(
          "SELECT user_id FROM admin_accounts WHERE user_id=?",
          [id],
        );
        if (admin) fail("محدود کردن حساب مدیر مجاز نیست", 409);
        await con.execute(
          "INSERT IGNORE INTO admin_controls(user_id) VALUES(?)",
          [id],
        );
        const column = action.includes("publication")
            ? "publication_blocked"
            : "suspended",
          value = ["suspend", "block-publication"].includes(action);
        await con.execute(
          `UPDATE admin_controls SET ${column}=? WHERE user_id=?`,
          [value, id],
        );
        if (action === "suspend")
          await con.execute("DELETE FROM sessions WHERE user_id=?", [id]);
      } else if (action === "revoke-sessions") {
        if (actor === id)
          fail("برای خروج خودتان از دکمهٔ خروج استفاده کنید", 409);
        await con.execute("DELETE FROM sessions WHERE user_id=?", [id]);
      } else fail("عملیات معتبر نیست");
      await con.execute(
        "INSERT INTO admin_audit(id,actor_id,target_id,action,reason,details,request_id,created_at) VALUES(?,?,?,?,?,?,?,?)",
        [
          randomUUID(),
          actor,
          id,
          action,
          input.reason,
          JSON.stringify(details),
          input.requestId,
          Date.now(),
        ],
      );
      return { ok: true };
    });
  },
});
