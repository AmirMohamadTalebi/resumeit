const { readJson } = require("../http/security.cjs");
const { isAdmin,isOwner } = require("./access.cjs");
const { RI } = require("../dashboard/render.cjs");
const { version,displayVersion } = require("../version.cjs");
const started = Date.now();
function adminHandler(database, auth, notifications) {
  return async (req, res, path, origin) => {
    if(path==='/api/catalog'&&req.method==='GET'){
      try{const policy=database.commerceSettings?await database.commerceSettings():require('../owner/settings.cjs').defaults(),price=(ref,p)=>Math.round((policy.prices[ref]??p.price)*policy.rate/2000),minimum=(list,kind)=>Math.min(...list.filter(x=>x.price>0&&!policy.paused.includes(kind+':'+x.id)).map(x=>price(kind+':'+x.id,x)));
        res.setHeader('Cache-Control','no-store');res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({rate:policy.rate,plans:Object.values(RI.PLANS).map(p=>({...p,name:policy.products?.['subscription:'+p.id]?.name||p.name,desc:policy.products?.['subscription:'+p.id]?.desc??p.desc,price:price('subscription:'+p.id,p),paused:policy.paused.includes('subscription:'+p.id)})),templateFrom:minimum(RI.RESUME_TEMPLATES,'rt'),fontFrom:minimum(RI.FONTS,'font')}));
      }catch{res.writeHead(503);res.end();}return true;
    }
    if (path === "/api/changes" && req.method === "GET") {res.writeHead(200,{"Content-Type":"application/json; charset=utf-8"});res.end(JSON.stringify({releases:require('../releases.json')}));return true;}
    if (path === "/api/version" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ version,displayVersion }));
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
      if(req.headers.host!==new URL(origin).host){reply(404,{error:"بخش پیدا نشد"});return true;}
      const user = await auth.account(req);
      if (!user) {
        reply(401, { error: "برای ادامه وارد حساب شوید" });
        return true;
      }
      if (!isAdmin(user)) {
        reply(403, { error: "این بخش فقط برای مدیر است" });
        return true;
      }
      if(req.headers["x-resumeit-owner"] && req.headers["x-resumeit-owner"]!==user.id){reply(409,{error:"حساب فعال عوض شده است؛ این صفحه را دوباره باز کنید"});return true;}
      const ownerPanel=path==='/api/admin/commerce'||path==='/api/admin/catalog/product'||path==='/api/admin/assistant'||path==='/api/admin/assistant/test'||['/api/admin/retention','/api/admin/retention/run'].includes(path)||path==='/api/admin/mail'||path.startsWith('/api/admin/mail/')||/^\/api\/admin\/users\/[a-f0-9-]{36}\/owner-controls$/.test(path);
      const ownerOnly=ownerPanel||['/api/admin/payment-gateways','/api/admin/notification-channels','/api/admin/audit/purge'].includes(path)||/^\/api\/admin\/users\/[a-f0-9-]{36}\/role$/.test(path);
      if((ownerPanel||req.method!=='GET'&&ownerOnly)&&!isOwner(user)){reply(403,{error:'این عملیات فقط برای مالک سایت مجاز است'});return true;}
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
        !["", "accepted", "pending", "failed", "suspended", "active", "creating", "verifying", "paid", "review", "reversed", "cancelled", "expired"].includes(
          status,
        )
      ) {
        reply(400, { error: "فیلتر معتبر نیست" });
        return true;
      }
      const from = Date.now() - days * 86400000;
      const filters=require('./filters.cjs').filters(Object.fromEntries(url.searchParams));
      if (req.method === "GET") {
        if(path==='/api/admin/commerce')reply(200,await database.commerceSettings());
        else if(path==='/api/admin/mail')reply(200,await require('./marketing.cjs').view(database,notifications));
        else if(path==='/api/admin/assistant')reply(200,await require('./assistant.cjs').view(database));
        else if(path==='/api/admin/retention')reply(200,await database.retentionPreview(user.id,Number(url.searchParams.get('before')||Date.now()-90*86400000)));
        else if(/^\/api\/admin\/users\/[a-f0-9-]{36}\/owner-controls$/.test(path))reply(200,{settings:await database.ownerUserSettings(path.split('/')[4]),billing:await database.billing(path.split('/')[4])});
        else if(path==='/api/admin/notification-channels')reply(200,await notifications.adminSettings());
        else if (path === "/api/admin/overview")
          reply(200, await database.adminOverview(from));
        else if (path === "/api/admin/catalog") {
          const bases=[...RI.RESUME_TEMPLATES.map(x=>({...x,ref:'rt:'+x.id})),...RI.LINK_TEMPLATES.map(x=>({...x,ref:'lt:'+x.id})),...RI.FONTS.map(x=>({...x,ref:'font:'+x.id})),...Object.values(RI.PLANS).map(x=>({...x,ref:'subscription:'+x.id}))],codes=new Map((database.adminCodes?await database.adminCodes('catalog',bases):bases).map(x=>[x.ref,x.admin_code]));
          const policy=database.commerceSettings?await database.commerceSettings():require('../owner/settings.cjs').defaults(),items=(list,kind)=>list.map(x=>({...x,...policy.products?.[kind+':'+x.id],ref:kind+':'+x.id,price:policy.prices[kind+':'+x.id]??x.price,paused:policy.paused.includes(kind+':'+x.id)})),sales=database.adminSales?await database.adminSales():null;
          reply(200, {
            templates: items(RI.RESUME_TEMPLATES,'rt').map(x=>({...x,admin_code:codes.get(x.ref)})),
            linkTemplates: items(RI.LINK_TEMPLATES,'lt').map(x=>({...x,admin_code:codes.get(x.ref)})),
            fonts: items(RI.FONTS,'font').map(x=>({...x,admin_code:codes.get(x.ref)})),
            palettes: items(RI.PALETTES,'pal'),
            plans: Object.fromEntries(items(Object.values(RI.PLANS),'subscription').map(x=>[x.id,{...x,admin_code:codes.get(x.ref)}])),
            rate: policy.rate,
            sales,
            ...(isOwner(user)?{policy}:{}),
          });
        }
        else if (path === "/api/admin/health")
          reply(200, {
            version,
            displayVersion,
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
            paymentConfigured: require('../payments/sep.cjs').configuration().enabled||require('../payments/zibal.cjs').configuration().enabled,
            gateways: [{id:'sep',enabled:require('../payments/sep.cjs').configuration().enabled},{id:'zibal',enabled:require('../payments/zibal.cjs').configuration().enabled}],
            paymentPolicy:database.paymentPolicy?await database.paymentPolicy():null,
            limits: require('../auth/limits.cjs').smsLimits(),
            trustProxy: require('../http/client-ip.cjs').trustedHops(),
            notificationChannels:notifications?await notifications.adminSettings():null,
            at: Date.now(),
          });
        else if (/^\/api\/admin\/users\/[a-f0-9-]{36}\/support-role$/.test(path))
          reply(200,await database.supportRole(path.split('/')[4]));
        else if (/^\/api\/admin\/users\/[a-f0-9-]{36}$/.test(path)){
          const id=path.split('/').pop(),restriction=database.accountNotice?await database.accountNotice(id):null,detail=await database.adminUser(id);if(restriction)detail.restriction={reason:restriction.reason,until:restriction.until_at,actorCode:restriction.actor_code,reviewTicket:restriction.review_ticket};
          if(database.adminCodes){[detail.user]=await database.adminCodes('users',[detail.user]);if(detail.documents)detail.documents=await database.adminCodes('pages',detail.documents.map(r=>({...r,id})));}
          detail.user.is_support=database.supportRole?(await database.supportRole(id)).enabled:false;
          if(database.accountRole){const {role}=await database.accountRole(id);detail.user.account_role=role;detail.user.is_owner=role==='owner';detail.user.is_admin=['admin','owner'].includes(role);}
          if(isOwner(user))detail.ownerSettings=database.ownerUserSettings?await database.ownerUserSettings(id):{extraSubdomain:false};
          reply(200,detail);
        }
        else if (
          /^\/api\/admin\/(users|pages|transactions|payments|purchases|otp|audit)$/.test(
            path,
          )
        ){
          const kind=path.split('/').pop(),data=await database.adminList(kind, {
              page,
              q,
              from,
              status,
              filters,
            });
          if(['payments','transactions','purchases'].includes(kind)&&database.adminSales)data.sales=await database.adminSales();
          if(database.adminCodes)data.rows=await database.adminCodes(kind,data.rows);
          reply(200,data);
        }
        else reply(404, { error: "بخش پیدا نشد" });
      } else if(req.method==='POST'&&ownerPanel){
        if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json'){reply(403,{error:'درخواست معتبر نیست'});return true;}
        const input=await readJson(req,65536);
        if(path.startsWith('/api/admin/mail/')){reply(200,await require('./marketing.cjs').post(database,notifications,user,path,input));return true;}
        if(path==='/api/admin/assistant'||path==='/api/admin/assistant/test'){reply(200,path==='/api/admin/assistant'?await database.saveAssistantSettings(user.id,input):await require('./assistant.cjs').test(database,input));return true;}
        reply(200,path==='/api/admin/commerce'?await database.saveCommerceSettings(user.id,input):path==='/api/admin/retention/run'?await database.runRetention(user.id,input):path==='/api/admin/catalog/product'?await database.saveCatalogProduct(user.id,input):await database.ownerControl(user.id,path.split('/')[4],input));
      } else if(req.method==='POST'&&(path==='/api/admin/audit/purge'||/^\/api\/admin\/users\/[a-f0-9-]{36}\/role$/.test(path))){
        if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json'){reply(403,{error:'درخواست معتبر نیست'});return true;}
        const {password,...input}=await readJson(req,4096);
        // Changing who can administer the site needs the acting owner's password, not just a live session.
        if(path!=='/api/admin/audit/purge')await require('../auth/confirm.cjs').confirmPassword(database,user,password);
        reply(200,path==='/api/admin/audit/purge'?await database.purgeAdminAudit(user.id,input):await database.saveAccountRole(user.id,path.split('/')[4],input));
      } else if(req.method==='POST'&&/^\/api\/admin\/users\/[a-f0-9-]{36}\/support-role$/.test(path)){
        if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json'){reply(403,{error:'درخواست معتبر نیست'});return true;}
        reply(200,await database.saveSupportRole(user.id,path.split('/')[4],await readJson(req,4096)));
      } else if(req.method==='POST'&&path==='/api/admin/payment-gateways'){
        if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json'){reply(403,{error:'درخواست معتبر نیست'});return true;}
        reply(200,await database.savePaymentPolicy(user.id,await readJson(req,2048)));
      } else if(req.method==='POST'&&path==='/api/admin/notification-channels'){
        if(req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/json'){reply(403,{error:'درخواست معتبر نیست'});return true;}
        reply(200,await notifications.saveAdminSettings(user.id,await readJson(req,2048)));
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
        const { password, ...input } = await readJson(req);
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
            "edit-profile",
            "delete-account",
          ].includes(input.action)
        ) {
          reply(400, { error: "عملیات، دلیل و شناسهٔ درخواست را کامل کنید" });
          return true;
        }
        input.reason = input.reason.trim();
        if(['credit','delete-account'].includes(input.action)&&!isOwner(user)){reply(403,{error:'شارژ دستی و حذف دائمی حساب فقط برای مالک سایت مجاز است'});return true;}
        if(['credit','delete-account'].includes(input.action))await require('../auth/confirm.cjs').confirmPassword(database,user,password);
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
      if (!error.status) require("../http/log.cjs").logFailure("admin", req, error);
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
