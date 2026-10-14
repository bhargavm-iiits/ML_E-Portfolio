# Vercel deployment

Requested project name: `bhargavm-ml`.
Target production alias: `bhargavm-ml.vercel.app`, subject to availability in the signed-in Vercel account. This is a deployment target, not a claim that the site is already live there.

Repository: https://github.com/bhargavm-iiits/ML_E-Portfolio
Production branch: `main`.

The shared loading/landing cube fix was merged through PR #1, merge commit `158d082d06dbfd711d736c62a56160265375bcb8`.

## Build configuration

The project can use either repository root or `portfolio` as its Vercel Root Directory. Both contain an appropriate `vercel.json`:

| Root Directory | Build Command | Output Directory |
|---|---|---|
| Repository root | `npm --prefix portfolio run check && npm --prefix portfolio test` | `portfolio/dist` |
| `portfolio` | `npm run check && npm test` | `dist` |

Framework preset: Other (`framework: null`). Install Command: skipped (`installCommand: ""`), because dependencies are already vendored and the source requires no installation. No environment variables or backend functions are needed. Never deploy the repository root as the static output; it includes reference analysis and delivery archives. `.vercelignore` also excludes those from root-level CLI uploads.

Local validation: the configured build commands passed syntax checks and all four loader controller tests. The build output already contains the working index.html, scripts, CSS, local Three.js/GSAP/Lenis modules, HDR/materials, models and resume PDFs.

## Required production verification

After deploying, confirm Vercel reports Ready, inspect its returned production URL and assign the requested alias only if available. Verify that `landing-loader.js`, the studio HDR, GLB models and resume downloads respond successfully. Open the site and inspect the loading-to-landing transition, same cube identity, normal scrolling and mobile layout. Only after those checks should the production URL be reported as live.

Deployment authentication is pending: the browser was not signed in to Vercel. Automatic approval review denied its Google authentication flow because use of a Google account had not been specifically authorized. The user was asked to sign in manually in the Vercel tab. Do not circumvent that authentication decision or claim a deployment succeeded before Vercel confirms it.
