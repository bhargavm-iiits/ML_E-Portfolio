# Realism revision — 13 October 2026

This record supersedes the original procedural-scene description in VERIFICATION.md.

## Result

The primary scene now uses the actual supplied **New_3** pre-rendered 3D film, controlled by reversible native scrolling. It preserves the source hardware, glass, circuitry, lighting, shadows, exploded layers and verification corridor. The website overlays readable resume-grounded DOM content. The original procedural Three.js scene remains a media-failure fallback.

The primary scene is pre-rendered footage, not freely orbitable real-time geometry. The original burned navigation and left-hand copy are masked; framing and readable website copy are adapted. The footage is illustrative, not a live inference service. The contact core is a crop of the original ending.

## Executed checks

- npm syntax checks pass for app, cinematic controller, live fallback, data, SVG art and local server.
- Source asset encoded at 1280 × 720 / 24 fps, H.264 CRF 18, every frame a keyframe, faststart, audio removed. Encoded video is 11,028,091 bytes and 10 seconds long.
- Local server range request `bytes=1000-1999`: HTTP 206, `Content-Range: bytes 1000-1999/11028091`, body length 1,000.
- Local native seeking reaches the exploded chapter at approximately 3.32 seconds and the corridor chapter at approximately 7.65 seconds.
- Pause control freezes the observed media time at 3.32289 seconds across two separate observations. Resume and reverse chapter navigation return toward the assembled pose.
- Inspected the realistic desktop hero, exploded layers, gate corridor and mobile hero. At 390 px, document width remains inside the viewport; object framing was adjusted to remove duplicate burned navigation and center the cube.
- Authenticated hosted video initially failed reliable direct-source seeking. Fixed by fetching the local asset into a Blob URL; this avoids dependence on host media-range behavior. Pending fetch is aborted and Blob URL revoked on disposal.
- Verified the hosted Blob media reaches 3.323217 seconds with readyState 4 after selecting exploded layers. Browser warning/error log query returned an empty array.
- Corrected desktop masking to clip the actual 16:9 video element rather than its letterboxed container.
- Delivery verification passes: all 60 embedded images resolve, 240 frame samples retain 8 fps spacing, and four resume downloads still match their original PDF hashes.

## Final publication

- URL: https://bhargav-intelligence-portfolio.superolm64.chatgpt.site
- Audience remains owner-private.
- Source commit: `72541a75706d9ecfbcb13af9c518b01202b84a5a`.
- Saved version: `appgprj_6ace5a102ff48191b8a32d5a65c6c000~appgver_bebaa2a307d88191be8abfdaba2f5fda`.
- Deployment: `appgdep_6ace75a193308191aff1122f314d1847`.
- Native result: **succeeded**.

Master prompt and source-provenance metadata explain the new implementation. Original user videos and resume PDFs remain unchanged.

## Coverage limits

No claim of full pixel-for-pixel page reconstruction, recovered original 3D models, arbitrary camera orbit, a full accessibility audit, cross-browser performance, or exact measured animation easing. Reduced-motion handling and failure fallbacks are implemented; OS preference changes and GPU failure were not forced. The supplied 720p source determines the scene's maximum original detail.
