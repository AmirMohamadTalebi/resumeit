# Prompt for the designer assistant: ResumeIt share images

Copy everything below the line into your design assistant.

---

**Role:** You are a senior brand and social-media designer. Produce production-ready raster images for ResumeIt (resumeit.ir), a Persian (Farsi), right-to-left résumé and link-page builder for Iranian job seekers.

**Deliverables — 19 images (11 + 6 + 2), all 1200×630 px, sRGB, exported as optimized JPG (quality ~82) except where noted, each under 100 KB:**

1. `og/resume-vista.jpg`, `og/resume-satiar.jpg`, `og/resume-glacier.jpg`, `og/resume-campus.jpg`, `og/resume-mono.jpg`, `og/resume-journal.jpg`, `og/resume-terminal.jpg`, `og/resume-spotlight.jpg`, `og/resume-blueprint.jpg`, `og/resume-sunroom.jpg`, `og/resume-shabtab.jpg` — one Open Graph card per résumé template (11).
2. `og/links-frost.jpg`, `og/links-cocoa.jpg`, `og/links-graphite.jpg`, `og/links-midnight.jpg`, `og/links-paper.jpg`, `og/links-sunset.jpg` — one per link-page theme (6).
3. `share-default-resume.png` and `share-default-links.png` — two **default** share images used when a user has not uploaded their own picture; these must look good for *any* person, so they carry no name or photo. PNG, 1200×630, under 150 KB each.

**What each template card must show** (these cards appear when someone pastes a sample link into Telegram, WhatsApp or Instagram):
- A clean mock-up of that template's first screen (a stylised résumé or link page with placeholder shapes and a fake Persian name such as «نیلوفر کریمی» and title «طراح رابط کاربری»), using that template's real palette.
- The Persian template name in large Vazirmatn Bold, e.g. «ویستا», plus the small line «نمونهٔ قالب رزومه در رزومیت» (or «نمونهٔ صفحهٔ لینک» for link themes).
- The ResumeIt wordmark small in a corner. No URLs, no QR codes, no prices.

**Template palettes (use exactly):**
- vista (ویستا): bg #0c1117, surface #131b25, text #f5f7fa, accents #9bf27d and #85d3ef
- satiar (ساتیار): bg #001035, surface #142b56, text #ffffff, accents #fe8b45 and #905bf5
- glacier (یخچال): bg #eef4f7, surface #ffffff, ink #1d2c36, accents #52788d and #a47248
- campus (پردیس): bg #faf4ee, ink #3b2a1d, accents #875a36 and #52788d
- mono (تک‌رنگ): bg #f5f6f7, ink #111417, accent #111417 and #52788d
- journal (دفترچه): bg #f7f3ec, surface #fffdf9, ink #2e2a24, accents #8a5f3c and #3d5c6f (serif feel)
- terminal (ترمینال): bg #10181e, surface #17232b, ink #e6eef2, accents #7fd1b9 and #d2ae89
- spotlight (نورافکن): bg #1f1710, surface #2b2016, ink #fbf1e6, accents #e0a56f and #97b5c5
- blueprint (نقشه): bg #16304a, surface #1d3d5c, ink #eaf3fb, accents #8fd0ff and #f2c48d
- sunroom (آفتاب‌گیر): bg #fdf6ec, surface #ffffff, ink #3b2a1d, accents #c07a3d and #52788d
- shabtab (شب‌تاب): bg #0b141b, surface #14222d, ink #eef4f7, accents #f0bd52 and #8ec5d6
- links-frost (شبنم): gradient #d9e9f0 → #f4f9fb → #f2e6da, ink #1d2c36, glass buttons
- links-cocoa (کاکائو): gradient #f2e6da → #faf4ee, solid brown buttons #875a36
- links-graphite (گرافیت): bg #f3f5f6, outlined #111417 buttons
- links-midnight (نیمه‌شب): gradient #10181e → #1d3d5c, translucent white buttons
- links-paper (کاغذ): bg #f7f3ec, white buttons with #e5dac7 border
- links-sunset (غروب): gradient #f6dcb8 → #e4cdb6 → #97b5c5, dark rounded buttons

**Brand rules for the two default images:**
- Mood: calm, trustworthy, warm — icy blue (#d9e9f0, #97b5c5), off-white (#faf4ee) and warm brown (#875a36), with a single gold accent (#e2a03a) used sparingly. Persian RTL layout, Vazirmatn font only.
- `share-default-resume.png`: a stylised résumé page (avatar circle, name bar, skill chips, two experience rows) made of soft rounded shapes, with the headline «رزومهٔ آنلاین من» and the wordmark. Do not draw a real face.
- `share-default-links.png`: a stylised phone-width link page with four rounded link buttons and a round avatar, headline «همهٔ لینک‌هایم در یک صفحه» and the wordmark.
- Optionally include our mascot, the white fluffy cat «فندق» (Fandogh), small and in a corner, in the same soft 3D style as the existing art in `dist/brand/fandogh/` — never covering the content.

**Technical requirements:**
- Keep all important content inside the central safe area (about 1000×500) because Telegram and WhatsApp crop the edges.
- Text must stay legible at 300 px wide (thumbnail size) — contrast ≥ 4.5:1.
- Right-to-left text alignment; Persian digits where numbers appear.
- No photos of real people, no logos of other companies, no stock-photo textures.
- Flat/soft-shadow style; avoid heavy gradients and noise so JPG sizes stay small.

**Output:** a zip with the files above in the folder structure shown (`og/…`), plus a short note on any font or colour decision you changed.
