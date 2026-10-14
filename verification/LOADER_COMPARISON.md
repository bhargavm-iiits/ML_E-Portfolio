# Loading screen: reference comparison

The loading screen was rebuilt from `Loading_Reference_Pack.zip` (`loading.md` and 100 extracted frames) and the uploaded video `gemini_generated_video_40d269a1.mp4`. `loader-comparison.jpg` puts 18 reference frames beside the rebuild at the same timestamps.

## How the captures were made

The rebuild ran in seek mode, which evaluates the timeline at an exact time, at 1280 × 720 in headless Chromium with SwiftShader. A temporary loader-only test page was used and is not shipped. Reference frame *n* corresponds to t = (n − 1) / 10 s.

## Matched beats

| Time (s) | Reference | Rebuild |
|---|---|---|
| 0–1.5 | Exploded vertical stack, side modules, axial energy pulse, 0% → 1% | Ten-layer stack plus CPU board, silver side modules, axial filament with strands, loops and side beams; the percentage follows the recorded trace |
| 1.5–3.7 | Camera rises to a high three-quarter view; four diagnostic bars fill; reticle arcs; 12% → 64% | The same camera move; four bracketed bars fill (in normal use they are capped by real task progress); reticle arcs |
| 3.7–4.2 | CPU glows | Heat spreader and boards glow |
| 4.2–5.4 | Routed traces burst out with 45° and 90° turns | 30 routed tubes revealed along their length, with travelling pulses |
| 5.4–6.0 | Vertical boards close in with glowing edges; armour enters from the frame edges | Four vertical PCBs swing in with edge glow; armour plates, straps and curved corner shells appear off-frame |
| 6.0–6.5 | Ignition; vertical traces rise and fall | A short bloom peak; 40 vertical traces jog at 45° |
| 6.5–7.3 | Armour seats; close-up | Every armour piece is seated by 7.3 s, which is also the hold pose if the page is not ready |
| 7.3–7.9 | Pull-back; iris closes; top and bottom plates seat; 100% | The same, with the circuit traces on the armour lighting up |
| 8.0–8.8 | Two expanding scan rings and a light burst | Two glowing rings, ticks, a sweep arc and a soft radial burst |
| 9.0–10 | HUD frame draws in; status rows and telemetry | HUD draws in; FPS, draw calls, triangles, DPR and load time are real measurements |

## Known differences

- The video is AI-generated, so its parts change shape from shot to shot. The rebuild uses one consistent assembly; geometry, PCB textures and traces are procedural and do not copy the pixels.
- The reference armour is bent sheet metal; the rebuild uses flat plates, straps and four curved corner shells.
- The reference shows more traces on the closed cube's top and bottom bands.
- The star mark in the reference's bottom-right corner is the video generator's watermark and is not reproduced.
- The "Skip animation" button is not in the video. It was added for accessibility.
- Real-GPU frame rate is unmeasured; under SwiftShader the timeline runs slower than real time, because the frame step is capped at 50 ms.

## Behaviour checks (headless Chromium)

| Scenario | Result |
|---|---|
| Page ready after 4 s | The percentage only rises, shows 100 only after ready and after 7.4 s of timeline, then the loader exits and is removed |
| Page ready after 30 s, watchdog off | Holds at 99% at t = 7.32 until ready, then plays the scan and HUD and exits |
| Skip clicked while not ready | Jumps to the hold pose and shows "Preparing interface"; exits as soon as the page is ready |
| WebGL disabled | SVG fallback; exits on ready; no page errors |
| Reduced motion | SVG fallback with a short fade |
| Full page without WebGL | `main`, header and footer are inert and `aria-busy` while loading and released afterwards; the session flag is set; the hero is visible |
| 390 × 844 and 320 × 640 | Meter, skip button and HUD fit; the camera dollies out for portrait screens |
| Bloom artefact | A roughness map drove some metal texels to minimum roughness, overflowing the half-float buffer as a white block; roughness maps were removed (normal maps kept) |
