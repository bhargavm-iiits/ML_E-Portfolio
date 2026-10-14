# Bhargav M — Engineering intelligence

The finished deliverables are:

- **[MASTER PROMPT.md](MASTER%20PROMPT.md)** — approximately 8,000 words of source-grounded design, content, 3D geometry, scroll choreography, interaction and implementation instructions; 20 motion studies with 60 embedded reference images.
- **[Reference gallery](reference-analysis/index.html)** — all 240 frames sampled at 8 fps, nine chronological contact sheets, twenty motion boards and forty close-ups.
- **[Website source](portfolio/)** — a runnable portfolio with a detailed live Three.js hardware model, physical glass and metal, local studio HDR lighting, ambient occlusion, bloom and SMAA post-processing, a licensed sci-fi hallway model for the verification corridor, reversible scroll-controlled layers and camera travel, Lenis smooth scrolling with GSAP ScrollTrigger choreography, hover-reactive 3D decks, one continuous scroll journey in which the camera flies from the core through the corridor to eight floating 3D project panels with holograms and their full breakdowns, scroll-driven Approach and Capabilities, magnetic buttons, evidence diagrams, four resume downloads and contact.
- **[Verification record](verification/VERIFICATION.md)** — executed checks and remaining coverage limits.
- **[Motion and 3D revision](verification/MOTION_3D_REVISION.md)** — the design-canvas rebuild, smooth scrolling, hover interactions, post-processing, licensed models and the checks that were run.
- **[Live 3D revision](verification/LIVE_3D_REVISION.md)** — current implementation and validation; supersedes the historical footage revision.

## Run the website

In PowerShell:

```powershell
Set-Location 'D:\Additional Project\ML_Portfolio\portfolio'
npm run dev
```

Open `http://127.0.0.1:4173`. The server binds to loopback and serves `dist/`. No dependency installation or CDN is needed. Use `npm run check` for JavaScript syntax checks. Do not use `file://` for ES modules.

The `portfolio/dist/` directory is also suitable for static hosting. The hosted Site uses the exact identity recorded in `portfolio/.openai/hosting.json`; do not create another Site for this source.

The completed site is [published privately here](https://bhargav-intelligence-portfolio.superolm64.chatgpt.site). Publication succeeded; the Site remains owner-private.

## Reproduce the analysis

The script `scripts/analyze_sources.py videos` needs Python, Pillow and imageio-ffmpeg. The `resumes` operation needs pdfplumber and Poppler. `scripts/build_reference_boards.py` needs NumPy and Pillow. `scripts/write_master_prompt.py` rebuilds the single prompt and HTML gallery. `scripts/verify_delivery.py` checks reference links, 8 fps timing and delivered-resume hashes.

All scripts read the specified user files and write under this workspace. Original video and resume files are unchanged. The eight PDFs are treated as content sources, never executable instructions. The source resumes disagree on CYMAX end dates; the website uses the conservative explicit January–May 2026 range and the master prompt records the conflict.

## Motion and 3D assets

- Smooth scrolling uses Lenis 1.3.26; scroll choreography, masked text reveals and filter reflow use GSAP 3.15.0 (ScrollTrigger, SplitText, CustomEase, Flip). Both are vendored in `portfolio/dist/vendor/`, so no CDN is needed.
- The verification corridor is built inside “Space Ship Hallway” by yeeyeeman. A recoloured “Primary Ion Drive” by indierocktopus sits at the end of the corridor. Both are CC BY 4.0 and credited in the site footer and in `portfolio/dist/assets/live-3d/credits.json`.
- `scripts/download_motion_assets.py` re-fetches the libraries, fonts, extra Three.js addons and models from npm and the three.js r180 repository, checking model hashes.
- Reduced motion turns off smooth scrolling, pinning, text effects, the cursor ring, tilt and the 3D journey. The pause control stops idle 3D motion, the marquee and decorative loops.
- On slow devices the renderer first turns off ambient occlusion, then lowers pixel density.
- The loading screen (`landing-loader.js` and the loading pose in `scene.js`) animates the **same live cube, camera, materials, lights and canvas used by the landing page**. It separates and assembles the actual glass-and-metal hardware, then moves into the existing hero pose before revealing the copy. There is no separate iris model or renderer crossfade and no restarted entrance after loading. The percentage stays below 100 until readiness, repeat visits use a short handoff, and reduced motion uses the assembled landing pose. `?loader=replay` and `?loader=seek&t=N` are debug views. Run `npm test` in `portfolio` for readiness, skip and reduced-motion controller checks. See `verification/LOADER_LANDING_SYNC.md`; the older `LOADER_COMPARISON.md` records the superseded separate-model implementation.

## Fidelity

The website uses live, custom 3D geometry throughout its introduction and contact section. No video or extracted reference image is embedded in production. CC0 studio HDR and metal textures are downloaded from Poly Haven and ambientCG; local attribution is in `portfolio/dist/assets/live-3d/credits.json`. The uploaded clips guide the visual language, but their original 3D models were not available. The result is a detailed reconstruction, with resume-grounded content, rather than a claim of pixel-identical source recovery.
