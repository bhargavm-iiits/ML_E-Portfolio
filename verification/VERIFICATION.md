# Verification record

Checked on 13 October 2026 using the Codex in-app browser on this Windows workspace.

## Passed

- `npm --prefix portfolio run check`: syntax checks for app.js, scene.js, data.js, art.js and serve.mjs.
- `python scripts/verify_delivery.py`: 60 embedded image targets exist; 240 sample records; 80 frames per clip; exact 0.125-second sample spacing; four delivered PDF hashes match their original sources; required website assets present.
- Every non-remote Markdown link in the master prompt resolves locally.
- Local HTTP preview responds 200. Both Three.js modules and all four resume-download URLs respond 200.
- Desktop scene inspected at a 1280 × 800 viewport: assembled cube, exploded layers and forward verification corridor render. Compact assembled core renders in contact.
- Mobile scene inspected at 390 × 844. Copy appears above the 3D object. Mobile disclosure opens, navigation works and menu closes after selecting a link.
- At 320 × 780: document scroll width is 305 CSS px (viewport minus the scrollbar), with no inspected main/section/header/footer/button bounding box extending beyond the viewport. Capability text and tags reflow into the narrow layout.
- All five work filters: AI 4, data 4, ML 3, apps/XR 4, all 8.
- All eight project dialogs open with the correct project title and close using Escape. The accessibility snapshot showed focus restored to the project trigger and only dialog content exposed while the modal was open.
- All four capability selectors update content and their download destination: AI → Bhargav_M_Cog.pdf; data → Resume_DE.pdf; ML → Resume_DS.pdf; apps/XR → Resume_App.pdf.
- Resume selector opens with four distinct PDF links and closes using Escape.
- Approach selection updates the verification caption and corresponding diagram.
- Copy email reports “Email address copied.” after successful clipboard writing.
- Pause control changes to Resume animations and can be toggled back. Both 3D scenes are connected to that state; autonomous render-loop pausing and SVG animation-pausing are implemented.
- Browser warning/error log queries after the final revision and all-project modal checks returned empty arrays.
- Original videos and PDFs remain unchanged; the analysis is written under this workspace.

## Publication

- Audience: owner-private; no public-sharing change requested or applied.
- URL: https://bhargav-intelligence-portfolio.superolm64.chatgpt.site
- Site: `appgprj_6ace5a102ff48191b8a32d5a65c6c000`.
- Published source commit: `66fdcba0cf21cbb6655e8663f22325b76af72c83`.
- Version: `appgprj_6ace5a102ff48191b8a32d5a65c6c000~appgver_1f6bbb0e51dc8191aff4c072135c98ef`.
- Deployment: `appgdep_6ace62e99a64819194d687f646ba9fcf`.
- Native deployment status: **succeeded**, with the URL above.
- Opened the published URL in the in-app browser; the portfolio DOM and 3D canvas loaded. A warning/error log query returned an empty array. Captured `published-hero.jpg` at 1280 × 800, then reset the temporary viewport override.
- Packaging required `TAR_OPTIONS=--force-local` on Windows so Git Bash tar treats the drive-letter path as a local filename. No source or Site identity was replaced.

## Coverage limits

- Reduced-motion CSS and scripted handling were reviewed in source; a real browser/OS preference change was not exercised.
- WebGL initialization/context-loss fallbacks were implemented and reviewed; a GPU/context failure was not forced in the browser.
- Native modal behavior and Escape/focus restoration were checked. This is not a full keyboard-only or screen-reader audit.
- Browser 200% zoom, Safari, Firefox, real touch hardware and high-DPI hardware were not tested. Narrow viewport checks do not substitute for zoom or cross-browser checks.
- No Core Web Vitals, GPU frame-rate benchmark or resource-constrained performance claim is made.
- External GitHub and LinkedIn destinations were extracted from the supplied resumes. Their current remote contents were not audited, and the portfolio makes no new remote-repository claims.
- The website is an original procedural rendering inspired by the references, with vector architecture illustrations. It does not reconstruct the reference generator's exact geometry or every animation. The master prompt explicitly distinguishes extension directions from baseline features.

## Saved screenshots

- `desktop-hero.jpg`: final 1280 × 800 hero and assembled 3D core.
- `published-hero.jpg`: the actual published portfolio at 1280 × 800.
- `desktop-contact.jpg`: final contact and assembled compact core.
- `mobile-390.jpg`: 390 × 844 layout, captured before the final label-size/contact revision; primary mobile composition remains the same.
