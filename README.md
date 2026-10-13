# Bhargav M — Engineering intelligence

The finished deliverables are:

- **[MASTER PROMPT.md](MASTER%20PROMPT.md)** — approximately 8,000 words of source-grounded design, content, 3D geometry, scroll choreography, interaction and implementation instructions; 20 motion studies with 60 embedded reference images.
- **[Reference gallery](reference-analysis/index.html)** — all 240 frames sampled at 8 fps, nine chronological contact sheets, twenty motion boards and forty close-ups.
- **[Website source](portfolio/)** — a runnable portfolio with a detailed live Three.js hardware model, physical glass and metal, local studio HDR lighting, reversible scroll-controlled layers and camera travel, eight project breakdowns, role filters, evidence diagrams, four resume downloads and contact.
- **[Verification record](verification/VERIFICATION.md)** — executed checks and remaining coverage limits.
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

## Fidelity

The website uses live, custom 3D geometry throughout its introduction and contact section. No video or extracted reference image is embedded in production. CC0 studio HDR and metal textures are downloaded from Poly Haven and ambientCG; local attribution is in `portfolio/dist/assets/live-3d/credits.json`. The uploaded clips guide the visual language, but their original 3D models were not available. The result is a detailed reconstruction, with resume-grounded content, rather than a claim of pixel-identical source recovery.
