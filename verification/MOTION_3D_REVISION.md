# Motion and 3D revision

This revision applies the approved design canvas to the live site and adds smooth scrolling, scroll choreography, hover interactions, post-processing and two licensed 3D models. It supersedes the visual sections of `LIVE_3D_REVISION.md`; the content and truthfulness rules in `MASTER PROMPT.md` are unchanged.

## What changed

- **Layout and type** follow the design canvas: Geist / Geist Mono (vendored), stage-chip architecture on project cards, a node-based evidence flow in Approach, a résumé download card in Capabilities, and a two-column project dialog with flow, sketch, facts, decision and scope.
- **Scrolling**: Lenis inertial scroll synchronised with GSAP ScrollTrigger. The intro journey scrubs the live 3D scene, the Approach section pins while its three steps advance, the timeline rail fills with scroll, the connecting statement lights word by word, and a marquee reacts to scroll speed and direction. Project cards lean slightly with scroll speed. The 3D camera banks and the lens split widens slightly with scroll speed, settling to zero at rest.
- **Reveals**: masked line reveals on section headings, character reveals on the hero and contact headlines, decoding eyebrow labels, clipped card entrances and Flip-animated filter reflow.
- **Hover**: trailing cursor ring with an “OPEN” state over projects (fine pointers only), magnetic primary buttons, 3D card tilt with a pointer-following highlight, a signal that travels along each card's stage chips, rolling button labels, hover-lit 3D decks with a label tooltip, and contact letters that lift near the pointer.
- **3D**: GTAO ambient occlusion, bloom limited to emissive surfaces, SMAA, and a final grade (vignette, grain, chromatic split). The verification corridor is built inside “Space Ship Hallway” (yeeyeeman, CC BY 4.0). A recoloured “Primary Ion Drive” (indierocktopus, CC BY 4.0) sits at the end as a decorative destination. Both are credited in the footer and in `portfolio/dist/assets/live-3d/credits.json`.
- **Resilience**: the renderer drops ambient occlusion, then pixel density, when frames average over about 29 ms. The CSS core fallback remains for missing WebGL.

## Scroll-only projects (follow-up)

At the user's request, the project grid, its filters and the separate project breakdown dialog were removed. Selected Work is now one continuous scroll sequence:

- **Desktop (≥ 1024 × 620):** the section pins and each project slides up over the previous one; the previous card shrinks, darkens and blurs. Each card's name rises letter by letter, its stage chips light in order, and its notes, sketch and facts arrive as you scroll. Scrolling back reverses everything. An index rail and progress meter at the bottom jump to any project.
- **Mobile and short screens:** cards stick and pile up as you scroll, each revealing as it arrives.
- Every card carries the full breakdown that used to be in the dialog: flow, illustrative sketch, stack, three "inside the system" facts, engineering decision, evidence and scope, the repository link and the source PDFs.
- Capabilities now pins too; the four disciplines advance with scroll.
- This departs from the master prompt's filter and dialog requirements by explicit user request.

Follow-up checks: the deck pins at 1280 × 720, 1440 × 900 and 1920 × 1080 with all eight projects in order and no clipped content. Index jumps land on the right project, and inactive cards are inert. At 390 px the deck stacks. Capabilities pins and reaches the fourth discipline. The mobile menu, reduced motion and 320 px have no overflow, and the 3D scene still loads both models with no console errors.

## One continuous 3D journey (second follow-up)

Following the user's reference video, the projects are no longer a page section. The intro journey now runs about 13 viewports of scroll: core → exploded layers → lime verification corridor → through the ion drive (with a brief fade) → a dark gallery where eight glass project panels float in 3D → a warp of streaking circuit lines into Approach.

- `gallery.js` builds each panel from the project data: number, category, name, flow chips, the illustrative sketch and the stack, drawn to a canvas texture. Each panel has a holographic emblem on a pedestal: a check-stack for FixProof, documents and a seal for ClaimBridge, a cell grid for Excel-to-App, an eye for OpthaMiss, a waveform for Vox-Align, a route over a grid for Alipiri AR, card stacks for StickerMe and a leaf for Plant Disease Detection. Dust, small cubes and a floor grid add depth.
- The camera holds at each panel, then glides to the next with a slight pull-back. Hovering a panel tilts it toward the pointer and shows a label.
- Readable copy stays in the DOM: as each panel arrives, its name rises letter by letter, followed by the summary, the three facts, the decision, the evidence and scope, the repository link and the sources. On screens under 860 px tall and on phones, the facts and notes sit behind an "Inside the system" toggle.
- A fourth chapter, WORK, was added to the journey HUD, with an index rail that jumps to any project. `#work` links land at the gallery.
- With reduced motion, or if the 3D cannot run, the projects appear as a normal list of cards below the hero.
- An orbit graphic scrubs around the Approach heading.

## Loader and entrance (third follow-up)

- Loading screen (`loader.js`, `loader-parts.js`): rebuilt to follow the uploaded loading reference pack and video beat by beat. It is a 10-second timeline evaluated from absolute time, so every frame can be reproduced exactly. The beats are an exploded processor stack, an energy pulse, diagnostic bars, routed traces, ignition, armour assembly, the iris closing, a ring scan and the HUD. The display stays at or below 99% until the page's readiness promise resolves, holding an assembled pose meanwhile. Skip appears after 1 s and Escape also skips. A watchdog fires at 15 s, and repeat visits in the same session get a quick replay. Reduced motion or missing WebGL uses an SVG fallback. The page is inert and `aria-busy` while loading. Frame-by-frame comparison: `verification/LOADER_COMPARISON.md` and `loader-comparison.jpg`.
- 3D entrance: the camera swoops in from a high wide angle, the glass shells close in, and two shockwave rings ripple across the floor. A light sheen then crosses the hero title.
- Project panels print in: each face is revealed top to bottom behind a glowing lime scan line as the camera approaches. Panels already passed stay printed, and scrolling back reverses it.
- The model credits line moved behind a "Credits" button in the footer. The CC BY 4.0 licence requires visible attribution, so it stays reachable there and in `credits.json`.

## Executed checks

All checks ran in headless Chromium (Playwright 1.56) against `npm run dev` on 127.0.0.1:4173.

| Check | Result |
|---|---|
| `npm run check` | Passes |
| Console errors, failed requests and HTTP ≥ 400 at 1280 × 720 with WebGL (SwiftShader) | None |
| Both GLB models load (`data-models` on the canvas) | “Space Ship Hallway” and “Primary Ion Drive” |
| Hero, exploded layers and corridor screenshots after settling | Rendered as intended |
| Filter “AI engineering” | 4 of 8 shown (FixProof, ClaimBridge, Excel-to-App, Vox-Align); status text updates |
| Project dialog opened from the keyboard, next/previous, Escape | Opens, navigates, closes; focus returns to the trigger |
| Résumé selector | Four distinct PDFs, each HTTP 200 |
| Mobile menu at 390 × 844: open, Escape | `aria-expanded` toggles; focus returns to the toggle |
| Horizontal overflow at 1280, 390 and 320 px | 0 px |
| Reduced motion | No Lenis, no `motion` class, journey collapses to one screen, extra chapter copy hidden |
| WebGL disabled | CSS core fallback shown; contact canvas hidden; all DOM motion runs |

## Limits

- Frame rate was not measured on real GPUs. SwiftShader renders about one frame per 3 s here, so performance on ordinary laptops and phones is untested; the adaptive quality step is the safeguard.
- No screen-reader session or 200% zoom pass was run.
- Animation timing was judged from settled screenshots, not recorded video.
- Repository links come from the supplied PDFs and were not re-verified.
