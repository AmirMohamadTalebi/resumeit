/* QR poster: the page's QR inside a framed card that also advertises ResumeIt — the person's photo, name and title,
   a caption, the address and a «make yours free at resumeit.ir» strip. Three layouts (portrait with the code in the
   middle, square and wide with the code beside the text) and three colourways, drawn on a canvas and saved as PNG. */
(() => {
  'use strict';
  const RI = window.RI, esc = RI.esc;
  const LAYOUTS = { portrait: [1080, 1350, 'عمودی', 'وسط'], square: [1080, 1080, 'مربع', 'کنار'], wide: [1500, 900, 'افقی', 'کارت'] };
  const THEMES = {
    night: { label: 'شب', bg: ['#0b141b', '#1b3242'], ink: '#ffffff', soft: '#b9ccd7', accent: '#f0bd52', strip: '#f0bd52', stripInk: '#1b2a33', logo: '#ffffff', stars: true },
    cream: { label: 'کرم', bg: ['#fbf4e8', '#f1dfc0'], ink: '#1b2a33', soft: '#5b6f7c', accent: '#c7883a', strip: '#1b3242', stripInk: '#ffffff', logo: '#1b3242' },
    clean: { label: 'روشن', bg: ['#ffffff', '#eef4f7'], ink: '#14232d', soft: '#56707e', accent: '#3d8c9c', strip: '#14232d', stripInk: '#ffffff', logo: '#14232d' }
  };
  const font = (w, px) => w + ' ' + px + 'px Vazirmatn, Vazir, Tahoma, sans-serif';
  const load = src => new Promise(res => { if (!src) return res(null); const im = new Image(); if (/^https?:/.test(src) && !src.startsWith(location.origin)) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const round = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const fit = (c, text, max) => { let t = String(text || ''); if (c.measureText(t).width <= max) return t; while (t && c.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
  const tint = (img, color) => { const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const c = cv.getContext('2d'); c.drawImage(img, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, cv.width, cv.height); return cv; };

  function draw(cv, s, a) {
    const [W, H] = LAYOUTS[s.layout], t = THEMES[s.theme], c = cv.getContext('2d');
    cv.width = W; cv.height = H; c.direction = 'rtl';
    const g = c.createLinearGradient(0, 0, W * .4, H); g.addColorStop(0, t.bg[0]); g.addColorStop(1, t.bg[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // Ambient: a glow, two orbit rings and (at night) a scatter of stars.
    const glow = c.createRadialGradient(W * .85, H * .1, 0, W * .85, H * .1, W * .7); glow.addColorStop(0, t.accent + '40'); glow.addColorStop(1, t.accent + '00'); c.fillStyle = glow; c.fillRect(0, 0, W, H);
    c.strokeStyle = t.accent + '55'; c.lineWidth = 3; c.beginPath(); c.ellipse(W * .9, H * .12, W * .32, W * .32, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = t.accent + '2a'; c.lineWidth = 2; c.beginPath(); c.ellipse(W * .9, H * .12, W * .45, W * .45, 0, 0, Math.PI * 2); c.stroke();
    if (t.stars) { let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 70; i++) { c.fillStyle = i % 9 ? 'rgba(255,255,255,' + (.25 + rnd() * .6) + ')' : t.accent; c.beginPath(); c.arc(rnd() * W, rnd() * H, rnd() * 2.2 + .6, 0, Math.PI * 2); c.fill(); } }
    // Frame.
    c.strokeStyle = t.accent + '66'; c.lineWidth = 4; round(c, 26, 26, W - 52, H - 52, 46); c.stroke();

    const side = s.layout !== 'portrait', pad = s.layout === 'square' ? 70 : 90, hasFace = s.person && a.avatar;
    // The ResumeIt strip runs along the bottom; everything else sits above it.
    const sh = side ? 84 : 96, sy = H - pad - sh + (side ? 10 : 20);
    const qrSize = s.layout === 'portrait' ? 480 : s.layout === 'square' ? 400 : 500;
    const qx = side ? pad + 30 : (W - qrSize) / 2, qy = side ? Math.max(100, (sy - qrSize) / 2) : !s.person ? 330 : hasFace ? 470 : 400;
    // QR plate with gold corner brackets.
    c.save(); c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = 50; c.shadowOffsetY = 18; c.fillStyle = '#ffffff'; round(c, qx - 34, qy - 34, qrSize + 68, qrSize + 68, 40); c.fill(); c.restore();
    c.imageSmoothingEnabled = false; if (a.qr) c.drawImage(a.qr, qx, qy, qrSize, qrSize); c.imageSmoothingEnabled = true;
    c.strokeStyle = t.accent; c.lineWidth = 10; c.lineCap = 'round'; const L = 70, o = 58;
    [[qx - o, qy - o, 1, 1], [qx + qrSize + o, qy - o, -1, 1], [qx - o, qy + qrSize + o, 1, -1], [qx + qrSize + o, qy + qrSize + o, -1, -1]].forEach(([x, y, dx, dy]) => { c.beginPath(); c.moveTo(x, y + dy * L); c.lineTo(x, y); c.lineTo(x + dx * L, y); c.stroke(); });
    if (a.mark) { const m = 92; c.fillStyle = '#ffffff'; round(c, qx + qrSize / 2 - m / 2 - 10, qy + qrSize / 2 - m / 2 - 10, m + 20, m + 20, 26); c.fill(); c.drawImage(a.mark, qx + qrSize / 2 - m / 2, qy + qrSize / 2 - m / 2, m, m); }

    // Text column: the whole width in portrait, the side beside the code otherwise.
    const sq = s.layout === 'square', colR = W - pad, colL = side ? qx + qrSize + (sq ? 100 : 120) : pad, colW = colR - colL, cx = side ? colR : W / 2;
    c.textAlign = side ? 'right' : 'center'; c.textBaseline = 'alphabetic';
    let y = side ? qy - 20 : 80;
    if (a.logo) { const lh = side ? 54 : 60, lw = lh * a.logo.width / a.logo.height; c.drawImage(a.logo, side ? colR - lw : (W - lw) / 2, y, lw, lh); y += lh + (side ? 56 : 40); }
    if (s.person) {
      const r = side ? (sq ? 52 : 60) : 56;
      if (hasFace) { const ax = side ? colR - r : W / 2, ay = y + r; c.save(); c.beginPath(); c.arc(ax, ay, r, 0, Math.PI * 2); c.clip(); const sc = Math.max(2 * r / a.avatar.naturalWidth, 2 * r / a.avatar.naturalHeight), w = a.avatar.naturalWidth * sc, h = a.avatar.naturalHeight * sc; c.drawImage(a.avatar, ax - w / 2, ay - h / 2, w, h); c.restore(); c.strokeStyle = t.accent; c.lineWidth = 6; c.beginPath(); c.arc(ax, ay, r + 5, 0, Math.PI * 2); c.stroke(); y += 2 * r + 50; }
      else y += 50;
      c.fillStyle = t.ink; c.font = font(800, sq ? 44 : 50); c.fillText(fit(c, a.name, colW), cx, y); y += sq ? 46 : 50;
      if (a.title) { c.fillStyle = t.soft; c.font = font(500, sq ? 26 : 30); c.fillText(fit(c, a.title, colW), cx, y); }
      y += side ? 80 : 0;
    } else y += 50;
    // Caption and address under the code (portrait) or down the text column.
    let cy = side ? y : qy + qrSize + 100;
    c.fillStyle = t.ink; c.font = font(800, sq ? 31 : 36); c.fillText(fit(c, a.caption, colW), cx, cy); cy += 34;
    c.font = font(600, 28); const host = a.url.replace(/^https?:\/\//, ''), uw = Math.min(colW, c.measureText(host).width + 64), ux = side ? colR - uw : (W - uw) / 2;
    c.fillStyle = t.accent + '26'; round(c, ux, cy, uw, 62, 31); c.fill(); c.strokeStyle = t.accent + '88'; c.lineWidth = 2; c.stroke();
    c.fillStyle = t.ink; c.textAlign = 'center'; c.direction = 'ltr'; c.fillText(fit(c, host, uw - 40), ux + uw / 2, cy + 42); c.direction = 'rtl'; c.textAlign = side ? 'right' : 'center';
    // The ResumeIt strip.
    const sw = W - 2 * pad, sx = pad;
    c.fillStyle = t.strip; round(c, sx, sy, sw, sh, sh / 2); c.fill();
    c.fillStyle = t.stripInk; c.font = font(800, side ? 27 : 31); c.textAlign = 'right';
    c.fillText(fit(c, 'تو هم رزومه و صفحهٔ لینک رایگان بساز', sw - (side ? 250 : 290)), sx + sw - 40, sy + sh / 2 + 11);
    c.textAlign = 'left'; c.direction = 'ltr'; c.font = font(800, side ? 28 : 32); c.fillText('resumeit.ir', sx + 40, sy + sh / 2 + 11); c.direction = 'rtl';
  }

  RI.qrPoster = async ({ image, url, kind }) => {
    const p = RI.C().profile || {}, s = { layout: 'portrait', theme: 'night', person: true };
    const caption = kind === 'links' ? 'همهٔ لینک‌هایم در یک صفحه؛ اسکن کن' : 'اسکن کن و رزومه‌ام را ببین';
    const modal = RI.modal({ title: 'کارت QR صفحه', size: 'lg', body: '<div class="qrp"><div class="qrp-stage" data-qrp-stage><canvas data-qrp-canvas role="img" aria-label="پیش‌نمایش کارت QR برای ' + esc(url) + '"></canvas><i class="qrp-scan" aria-hidden="true"></i></div>' +
      '<div class="qrp-side"><p class="qrp-lead">کارت آماده برای چاپ، استوری یا امضای ایمیل؛ کد همان‌جا اسکن می‌شود و رزومیت هم معرفی می‌شود.</p>' +
      '<fieldset class="qrp-set"><legend>چیدمان</legend><div class="qrp-opts" data-qrp-group="layout">' + Object.entries(LAYOUTS).map(([id, [w, h, label, where]]) => '<button type="button" data-v="' + id + '" aria-pressed="' + (id === s.layout) + '"><i class="qrp-shape" style="--w:' + w + ';--h:' + h + '"></i><b>' + label + '</b><small>کد در ' + where + '</small></button>').join('') + '</div></fieldset>' +
      '<fieldset class="qrp-set"><legend>رنگ</legend><div class="qrp-opts qrp-opts--swatch" data-qrp-group="theme">' + Object.entries(THEMES).map(([id, t]) => '<button type="button" data-v="' + id + '" aria-pressed="' + (id === s.theme) + '"><i style="background:linear-gradient(135deg,' + t.bg[0] + ',' + t.bg[1] + ');box-shadow:inset 0 0 0 3px ' + t.accent + '"></i><b>' + t.label + '</b></button>').join('') + '</div></fieldset>' +
      '<label class="qrp-switch"><input type="checkbox" data-qrp-person checked><span></span>عکس، نام و عنوان من</label>' +
      '<div class="qrp-actions"><button type="button" class="btn btn--primary" data-qrp-save>' + RI.icon('download') + 'دریافت PNG</button>' + (navigator.canShare ? '<button type="button" class="btn btn--soft" data-qrp-share>' + RI.icon('external') + 'فرستادن</button>' : '') + '<a class="btn btn--ghost" href="' + esc(image) + '" download="resumeit-' + kind + '-qr.png">' + RI.icon('download') + 'فقط کد</a></div><p class="qrp-url" dir="ltr">' + esc(url) + '</p></div></div>', actions: [] });
    const root = modal.body, cv = root.querySelector('[data-qrp-canvas]'), stage = root.querySelector('[data-qrp-stage]');
    stage.classList.add('is-loading');
    await document.fonts?.ready;
    const [qr, avatar, logoRaw, mark] = await Promise.all([load(image), load(RI.avatarOf?.(p)), load('/brand/resumeit-logo-v1.png'), load('/brand/resumeit-mark-v1.png')]);
    const assets = { qr, avatar: p.avatar ? avatar : null, mark, name: p.name || RI.state.account.name || '', title: p.title || '', caption, url };
    const paint = () => {
      assets.logo = logoRaw ? tint(logoRaw, THEMES[s.theme].logo) : null;
      try { draw(cv, s, assets); } catch { assets.avatar = null; draw(cv, s, assets); }
      stage.dataset.layout = s.layout; stage.classList.remove('is-swap'); void stage.offsetWidth; stage.classList.add('is-swap');
    };
    paint(); stage.classList.remove('is-loading');
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-qrp-group] button');
      if (b) { const group = b.parentElement.dataset.qrpGroup; s[group] = b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); paint(); }
    });
    root.querySelector('[data-qrp-person]').addEventListener('change', e => { s.person = e.target.checked; paint(); });
    const blob = () => new Promise((res, rej) => { try { cv.toBlob(b => b ? res(b) : rej(new Error('تصویر ساخته نشد')), 'image/png'); } catch { assets.avatar = null; draw(cv, s, assets); cv.toBlob(b => b ? res(b) : rej(new Error('تصویر ساخته نشد')), 'image/png'); } });
    const name = () => 'resumeit-' + kind + '-qr-' + s.layout + '-' + s.theme + '.png';
    root.querySelector('[data-qrp-save]').addEventListener('click', async () => {
      try { const href = URL.createObjectURL(await blob()), a = document.createElement('a'); a.href = href; a.download = name(); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(href), 4000); RI.toast('کارت QR ذخیره شد', { kind: 'success' }); }
      catch (err) { RI.toast(err.message, { kind: 'error' }); }
    });
    root.querySelector('[data-qrp-share]')?.addEventListener('click', async () => {
      try { const file = new File([await blob()], name(), { type: 'image/png' }); if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'صفحهٔ من در رزومیت', text: url }); else await navigator.share({ title: 'صفحهٔ من در رزومیت', url }); }
      catch (err) { if (err?.name !== 'AbortError') RI.toast(err.message, { kind: 'error' }); }
    });
    return modal;
  };
})();
