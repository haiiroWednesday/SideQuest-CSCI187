# Home screen launch: acceptance evidence

The production entry point now declares a same-origin web app manifest and 192/512 px PNG icons with SideQuest's existing maroon, cream and gold clock motif. The 512 px artwork leaves its foreground within the maskable safe area. The launch starts at Discover; the application is online-only. No service worker, new credential persistence, offline mutation queue, or cached private schedules are introduced.

## Automated checks

- `app/tests/publishing.manifest.test.ts`: manifest identity, launch scope, icon dimensions and production static HTTP behavior (MIME, security headers, ETag).
- `app/e2e/publishing.spec.ts`: actual browser image decoding and absence of service-worker registrations in a clean browser context.

## Required deployed acceptance (not yet performed)

| Device | Procedure | Expected |
| --- | --- | --- |
| iPhone Safari | Open the exact tested HTTPS release; Share → Add to Home Screen; open icon | SideQuest name/icon, Discover opens, correct safe-area layout |
| Android Chrome | Open the release; use the available install or Add to Home screen action; open icon | SideQuest name/icon, standalone launch where supported |
| Both | Open the map, save and remove a test plan, background and resume | Same behavior as the browser, no duplicate plans |
| Both | Lose connectivity, reopen, restore connectivity | No fabricated current event data or queued private writes; browser/app recovery is clear |
| Both | Sign in using an approved test account, close and reopen | Normal memory-only sign-in policy; no unexpected persisted tokens |

Record tester, device/browser version, tested commit, deployed URL, screenshots and actual results. An installation menu is browser-dependent; the manifest is not evidence that real-device installation succeeded. Do not claim offline support or award of the publishing point from these checks alone. Keep deployment flags unchanged until the release is approved.
