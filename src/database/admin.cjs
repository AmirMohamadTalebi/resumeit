const { randomUUID } = require("node:crypto");
const { fail } = require("../dashboard/model.cjs");
const { RI } = require("../dashboard/render.cjs");
const publicationSummary="JSON_OBJECT('resume',JSON_OBJECT('status',JSON_UNQUOTE(JSON_EXTRACT(pub,'$.resume.status'))),'links',JSON_OBJECT('status',JSON_UNQUOTE(JSON_EXTRACT(pub,'$.links.status')))) AS pub";
const documents="(SELECT user_id,1 slot,slug,draft,pub,revision FROM dashboard_documents UNION ALL SELECT user_id,slot,slug,draft,pub,revision FROM dashboard_workspaces)";
const metrics="(SELECT user_id,day,event,total FROM dashboard_metrics UNION ALL SELECT user_id,day,event,total FROM dashboard_workspace_metrics)";
const subscribed="EXISTS(SELECT 1 FROM account_access a WHERE a.user_id=d.user_id AND a.ref LIKE 'subscription:%' AND a.expires_at>?)";
const customQuota="JSON_CONTAINS_PATH(o.settings,'one','$.subdomainLimit')",quotaValue="JSON_EXTRACT(o.settings,'$.subdomainLimit')";
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
  async adminSales(){
    const now=Date.now(),day=Math.floor((now+12600000)/86400000)*86400000-12600000;
    const [totals]=await execute("SELECT COUNT(*) total,COALESCE(SUM(created_at>=?),0) today,COALESCE(SUM(created_at>=?),0) week,COALESCE(SUM(created_at>=?),0) month,COALESCE(SUM(-delta_units),0) units,COALESCE(SUM(product_ref IS NULL),0) unassigned FROM wallet_transactions WHERE delta_units<0 AND reference LIKE 'purchase:%'",[day,now-7*86400000,now-30*86400000]);
    const products=await execute("SELECT product_ref ref,COUNT(*) total,COALESCE(SUM(created_at>=?),0) month,COALESCE(SUM(-delta_units),0) units FROM wallet_transactions WHERE delta_units<0 AND reference LIKE 'purchase:%' AND product_ref IS NOT NULL GROUP BY product_ref",[now-30*86400000]);return {totals,products,at:now};
  },
  async paymentPolicy(){const [row]=await execute('SELECT sep_enabled,zibal_enabled FROM payment_policy WHERE id=1');return {sep:!!row?.sep_enabled,zibal:!!row?.zibal_enabled};},
  async savePaymentPolicy(actor,input){
    if(!input||typeof input.sep!=='boolean'||typeof input.zibal!=='boolean')fail('وضعیت درگاه معتبر نیست');
    return transaction(async con=>{
      await require('../admin/access.cjs').requireOwner(con,actor);
      await con.execute('SELECT id FROM payment_policy WHERE id=1 FOR UPDATE');
      await con.execute('UPDATE payment_policy SET sep_enabled=?,zibal_enabled=? WHERE id=1',[input.sep,input.zibal]);
      await con.execute('INSERT INTO admin_audit(id,actor_id,target_id,action,reason,details,request_id,created_at) VALUES(?,?,NULL,?,?,?,?,?)',[randomUUID(),actor,'payment-gateways','تغییر اجازهٔ شروع پرداخت',JSON.stringify({sep:input.sep,zibal:input.zibal}),randomUUID(),Date.now()]);
      return {ok:true};
    });
  },
  async adminOverview(from) {
    const results = await Promise.all([
      execute(
        "SELECT COUNT(*) total,SUM(phone_verified) verified,SUM(created_at>=FROM_UNIXTIME(?/1000)) recent,(SELECT COUNT(*) FROM referrals WHERE created_at>=?) referred FROM users",
        [from,from],
      ),
      execute(
        `SELECT COUNT(*) total,SUM(d.slot<>3 AND JSON_UNQUOTE(JSON_EXTRACT(d.pub,'$.resume.status'))='published' AND COALESCE(c.suspended,0)=0 AND COALESCE(c.publication_blocked,0)=0) resumes,SUM(JSON_UNQUOTE(JSON_EXTRACT(d.pub,'$.links.status'))='published' AND COALESCE(c.suspended,0)=0 AND COALESCE(c.publication_blocked,0)=0) links FROM ${documents} d LEFT JOIN admin_controls c ON c.user_id=d.user_id LEFT JOIN owner_user_settings o ON o.user_id=d.user_id WHERE (d.slot=3 AND ${subscribed}) OR (d.slot<>3 AND ((${customQuota} AND (${quotaValue} IS NULL OR JSON_UNQUOTE(${quotaValue})='null')) OR (CASE WHEN d.slot<3 THEN d.slot ELSE d.slot-1 END)<=(CASE WHEN ${customQuota} THEN CAST(JSON_UNQUOTE(${quotaValue}) AS UNSIGNED) ELSE (CASE WHEN ${subscribed} THEN 2 ELSE 1 END)+(CASE WHEN CAST(JSON_UNQUOTE(JSON_EXTRACT(o.settings,'$.extraSubdomain')) AS CHAR) IN ('true','1') THEN 1 ELSE 0 END) END)))`,
        [Date.now(),Date.now()],
      ),
      execute(
        "SELECT COUNT(*) total,SUM(status='accepted') accepted,SUM(status='failed') failed,SUM(verified_at IS NOT NULL) verified,MIN(created_at) started FROM otp_events WHERE created_at>=?",
        [from],
      ),
      execute("SELECT COALESCE(SUM(balance_units),0) balance FROM wallets"),
      execute(
        "SELECT COUNT(*) total,COALESCE(SUM(-delta_units),0) spent FROM wallet_transactions WHERE delta_units<0 AND reference LIKE 'purchase:%' AND created_at>=?",
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
  async adminList(kind, { page, q, from, status, filters:inputFilters }) {
    const query=require('../admin/search.cjs').search(q),allowedFields={users:['role','plan','min','max','status'],pages:['status'],payments:['provider','min','max','status'],transactions:['direction','min','max','ref'],purchases:['ref','min','max'],otp:['status'],audit:[]}[kind]||[];
    if(Object.keys(query.fields).some(field=>!allowedFields.includes(field)))fail('این ویژگی برای جست‌وجوی فهرست انتخاب‌شده معتبر نیست');
    if(query.fields.ref&&this.adminFindCode){const product=await this.adminFindCode(query.fields.ref);if(product?.kind==='catalog')query.fields.ref=product.key;}
    const f=require('../admin/filters.cjs').filters({...inputFilters,...query.fields});
    if(query.fields.status){const allowed={users:['active','suspended'],pages:['published','draft'],payments:['creating','pending','verifying','paid','review','failed','reversed','cancelled','expired'],otp:['accepted','pending','failed','verified']}[kind]||[];if(!allowed.includes(query.fields.status))fail('وضعیت جست‌وجو برای این فهرست معتبر نیست');status=query.fields.status;}
    const sources = {
      users: {
        table:
          "users u JOIN profiles p ON p.user_id=u.id LEFT JOIN wallets w ON w.user_id=u.id LEFT JOIN admin_controls c ON c.user_id=u.id",
        fields:
          "u.id,u.phone,u.phone_verified,u.created_at,p.name,p.first_name,p.last_name,COALESCE(w.balance_units,0) balance_units,COALESCE(c.suspended,0) suspended,EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) is_admin",
        search: "CONCAT_WS(' ',u.id,u.phone,p.name,p.first_name,p.last_name)",
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
          "t.id,t.user_id,t.delta_units,t.balance_units,t.label,t.reference,t.product_ref,t.created_at,u.phone,p.name",
        search: "CONCAT_WS(' ',t.id,t.user_id,t.reference,t.product_ref,u.phone,p.name,t.label)",
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
        fields: "o.id,o.user_id,o.provider,o.amount_toman,o.status,o.rrn,o.trace,o.last_error,o.attempts,o.it_rate,o.credit_units,o.created_at,o.updated_at,u.phone,p.name",
        search: "CONCAT_WS(' ',o.id,u.phone,p.name,o.provider,o.status,o.rrn,o.trace,o.amount_toman)",
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
        search: "CONCAT_WS(' ',a.id,a.actor_id,a.action,a.reason,p.name,a.target_id)",
        date: "a.created_at",
        order: "a.created_at DESC,a.id",
      },
    };
    const s = sources[kind];
    if (!s) fail("بخش پیدا نشد", 404);
    if(query.after!==undefined&&!s.date)fail('این فهرست تاریخ ثبت مستقلی برای جست‌وجو ندارد');
    const words=query.words,where=[],params=[];let exactCode=false;
    for(let i=words.length-1;i>=0;i--){const found=this.adminFindCode?await this.adminFindCode(words[i]):null;if(!found)continue;words.splice(i,1);exactCode=true;const expression=found.kind===kind?({users:'u.id',pages:"CONCAT(d.user_id,':',d.slot)",payments:'o.id',transactions:'t.id',audit:'a.id'})[kind]:found.kind==='users'?({pages:'d.user_id',payments:'o.user_id',transactions:'t.user_id',purchases:'a.user_id'})[kind]:found.kind==='catalog'?({purchases:'a.ref',transactions:'t.product_ref'})[kind]:null;if(found.kind==='users'&&kind==='audit'){where.push('(a.actor_id=? OR a.target_id=?)');params.push(found.key,found.key);}else if(expression){where.push(expression+'=?');params.push(found.key);}else where.push('1=0');}
    for(const word of words){where.push(`REPLACE(REPLACE(${s.search},'ي','ی'),'ك','ک') LIKE ? ESCAPE '='`);params.push('%'+word.replace(/[=%_]/g,v=>'='+v)+'%');}
    if(!where.length)where.push('1=1');
    if(['audit','payments','transactions','purchases'].includes(kind)&&f.archive!=='all'&&(f.archive||!exactCode)){const idExpr=({audit:'a.id',payments:'o.id',transactions:'t.id',purchases:"CONCAT(a.user_id,':',a.ref)"})[kind];where.push((f.archive==='archived'?'':'NOT ')+'EXISTS(SELECT 1 FROM admin_archives z WHERE z.kind=? AND z.record_id='+idExpr+')');params.push(kind);}
    if (s.date && (kind !== "users"||f.after!==null||query.after!==undefined)) {
      where.push(`${s.date}>=?`);
      params.push(Math.max(f.after??0,query.after??0,f.after===null&&f.before===null&&query.after===undefined&&!exactCode?from:0));
    }
    if(s.date&&f.before!==null){where.push(`${s.date}<=?`);params.push(f.before);}
    if(s.date&&query.before!==undefined){where.push(`${s.date}<=?`);params.push(query.before);}
    if(kind==='users'){
      if(f.verified){where.push('u.phone_verified=?');params.push(f.verified==='yes'?1:0);}
      if(f.role){where.push("(CASE WHEN EXISTS(SELECT 1 FROM owner_accounts WHERE user_id=u.id) THEN 'owner' WHEN EXISTS(SELECT 1 FROM admin_accounts WHERE user_id=u.id) THEN 'admin' WHEN EXISTS(SELECT 1 FROM support_accounts WHERE user_id=u.id) THEN 'support' ELSE 'user' END)=?");params.push(f.role);}
      if(f.plan){where.push((f.plan==='free'?'NOT ':'')+"EXISTS(SELECT 1 FROM account_access a WHERE a.user_id=u.id AND "+(['q','h','y'].includes(f.plan)?'a.ref=?':"a.ref LIKE 'subscription:%'")+" AND a.expires_at>?)");if(['q','h','y'].includes(f.plan))params.push('subscription:'+f.plan);params.push(Date.now());}
    }
    if(kind==='payments'&&f.provider){where.push('o.provider=?');params.push(f.provider);}
    if(kind==='transactions'&&f.direction)where.push('t.delta_units'+(f.direction==='credit'?'>0':'<0'));
    if(kind==='transactions'&&f.ref){where.push('t.product_ref=?');params.push(f.ref);}
    if(kind==='pages'&&query.fields.status){where.push("(JSON_UNQUOTE(JSON_EXTRACT(d.pub,'$.resume.status'))=? OR JSON_UNQUOTE(JSON_EXTRACT(d.pub,'$.links.status'))=?)");params.push(query.fields.status,query.fields.status);}
    if(kind==='purchases'){
      if(f.ref){where.push('a.ref=?');params.push(f.ref);}
      if(f.access==='permanent')where.push('a.expires_at IS NULL');
      else if(f.access){where.push('a.expires_at'+(f.access==='active'?'>?':'<=?'));params.push(Date.now());}
    }
    const amount=({users:'COALESCE(w.balance_units,0)',payments:'o.amount_toman',transactions:'ABS(t.delta_units)',purchases:'a.price_units'})[kind];
    if(amount)for(const [key,operator]of [['min','>='],['max','<=']])if(f[key]!==null){where.push(amount+operator+'?');params.push(f[key]*(kind==='payments'?1:2000));}
    if (kind === "otp" && status) {
      if(status==='verified')where.push('verified_at IS NOT NULL');else{where.push("status=?");params.push(status);}
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
    const order=f.sort==='oldest'?s.order.replaceAll('DESC','ASC'):f.sort==='name'&&['users','pages','transactions','payments','purchases'].includes(kind)?'p.name,'+s.order:['highest','lowest'].includes(f.sort)&&amount?amount+(f.sort==='highest'?' DESC,':' ASC,')+s.order:s.order;
    const rows = await execute(
      `SELECT ${s.fields} FROM ${s.table} WHERE ${clause} ORDER BY ${order} LIMIT ${f.pageSize} OFFSET ${f.pageSize * (page - 1)}`,
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
      pageSize: f.pageSize,
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
      if(['credit','delete-account'].includes(action))await require('../admin/access.cjs').requireOwner(con,actor);
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
          ||(['suspend','delete-account'].includes(action)&&JSON.stringify(details.restrictionInput||{publicReason:null,until:null})!==JSON.stringify({publicReason:input.publicReason??null,until:input.until??null}))
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
          details.notice=await require('./account-notices.cjs').recordNotice(con,actor,user,action,input);details.restrictionInput={publicReason:input.publicReason??null,until:input.until??null};
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
        if(['suspend','restore'].includes(action)){details.notice=await require('./account-notices.cjs').recordNotice(con,actor,user,action,input);details.restrictionInput={publicReason:input.publicReason??null,until:input.until??null};}
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
        const [[manager]]=await con.execute('SELECT user_id FROM admin_accounts WHERE user_id=?',[id]);if(manager)await require('../admin/access.cjs').requireOwner(con,actor);
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
