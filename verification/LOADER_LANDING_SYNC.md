# Loader and landing cube synchronization

The uploaded 49.17-second screen recording was sampled at 10 fps: 492 images, 0.0–49.1 seconds. All chronological sheets were inspected; the handoff was examined at full resolution. The baseline repository examined was `f8ddce7` on `main` in `bhargavm-iiits/ML_E-Portfolio`.

At 10.7–10.9 seconds in the recording, the green iris loader is blended over a separate cyan/glass landing cube. Around 11.2 seconds the landing scene darkens and its entrance starts again; displaced shell panels settle until about 14 seconds. These are three separate visual phases rather than one continuous assembled object.

The code confirmed the cause: `loader.js` created a separate WebGLRenderer, RoomEnvironment and `buildAssembly` from `loader-parts.js`. `scene.js` created another renderer, studio HDR environment and `makeHardware` from `hardware.js`. `app.js` called `scene.playIntro()` after the loader was disposed, resetting camera/opacity/shell entrance tracks.

## Changes

- The normal loader now uses `landing-loader.js`: a HUD/timeline over the main canvas, with no new 3D scene, mesh builder or renderer. Old standalone loader/iris geometry modules were removed.
- `scene.setLoadingPose(t)` animates the existing hardware decks, glass cartridges and PCB faces. Actual landing geometry, textures, HDR, light rig, tone mapping and floor remain the source of truth throughout.
- The assembly closes by 7.35 seconds. From 8.1 to 9.5 seconds it moves into the hero position and camera pose. At completion the camera is `(6.5,3.9,11.8)` and the core position is `(2.3,0,0)` on desktop—the same values before and after overlay removal. Portrait uses the existing portrait hero pose.
- Copy reveal starts once the cube is seated in its final pose. Overlay removal does not replace the canvas, dispose the cube, restart scene animation or perform another shockwave/camera entrance.
- Texture/HDR readiness and a successful first frame gate the transition. Optional corridor models no longer block the first landing view. Scroll and underlying controls remain locked while loading; normal navigation resumes afterwards.
- Shared-cube identity is exposed as `#scene[data-core-id]` for QA. Two canvases exist while loading and afterwards: main plus contact, with no extra loader canvas.

## Verification performed

- `npm run check`: all shipped JavaScript entrypoints passed syntax checks.
- `npm test`: four controller tests passed—readiness hold, skip before ready, reduced motion and changed motion preference. Tests assert that the loader never disposes the landing scene and calls reveal/finish/exit once.
- `git diff --check`: passed.
- Browser inspection at 1280 × 720: loading pose, final loading pose, skip handoff and complete normal timeline. No console errors or warnings observed. At exit the loader is removed, `aria-busy` and inert attributes are cleared, and the camera/core coordinates stay at the hero values.
- Browser inspection at 390 × 844: the same glass/circuit hardware is visible during loading; no document horizontal overflow. At 320 × 844 the before/after `data-core-id` matched, proving the core instance survives overlay removal. An existing offscreen timeline reveal extended the document by 5 px; its horizontal motion is now clipped within the timeline.

Full screen-reader coverage, cross-browser GPU performance and throttled network tests are not certified. The controller tests use a fake DOM/clock to test behavior; GPU appearance was inspected separately in the real browser. Historical reference comparison records describe the old iris loader and should not be read as the current implementation.
