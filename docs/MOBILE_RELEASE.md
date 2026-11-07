# Mobile release tracker (iOS / Android)

Review of `main` @ 42e7693, 2026-11-06. Baseline: `npm test` 37/37 pass, `npm run build` OK, no console errors at 390×844 and 844×390.

## Current implementation status

Implementation is in the working tree under app ID **`ai.lumiora.lastbeacon`**, using the publisher-selected `ai.lumiora` namespace. The original findings below describe the reviewed baseline; checked items have implementation and verification evidence. This is **not yet a signed, store-submitted release**.

| Package | Current result | Remaining acceptance work |
| --- | --- | --- |
| M0 | Baseline reproduced; app ID selected; phone orientations/iPhone-only iOS scope; public support URLs; authenticated organization Play account | Publisher Apple team, signing ownership, legal contact confirmation, physical QA devices |
| M1 | Separate native bundle, platform adapters, asynchronous bootstrap, release debug flag; static and single-file builds retained | CI execution after changes are pushed |
| M2 | iOS/Android projects compile; app icons/adaptive artwork/splash generated; marketing/build numbers wired | Distribution signing and final store validation |
| M3 | Native Preferences hydration/migration, ordered verified writes, web fallback implemented and tested | Upgrade verification on physical minimum devices |
| M4 | Validated versioned snapshots, dual checkpoint slots, Continue/New watch, periodic/event/background saves, terminal markers | Physical OS-kill/update testing; extended real-device endless sessions |
| M5 | Pause ownership, native Back, lifecycle saves, GL restore/2D recovery, audio recovery and ambient iOS category | Silent switch, calls/Siri, headphones, repeated real-device memory pressure |
| M6 | Compact landscape cards/menu, touch wording/selection, native inset handling and zoom policy | Physical cutouts/navigation variants and accessibility enlargement |
| M7 | Idle draw cap, sustained-load quality downgrade, bounded local diagnostics and review/copy UI | Physical FPS/memory/thermal/battery measurements |
| M8 | Bilingual policy/support pages published, issue tracker enabled, app privacy manifest, localized listings, icons/feature graphic, 24 packaged gameplay screenshots | Signed-candidate screenshot review, publisher identity confirmation and store declarations |
| M9 | Unit/browser tests, native emulator/simulator tests, unsigned candidates, CI and manually dispatched signing workflows | Signed candidates, store beta distribution/feedback, production access, publisher review |

Verified so far: **48 Node tests, 22 mobile browser checks, and 2 native iOS UI tests**, deterministic full-campaign checkpoint restoration, browser GL recovery, packaged Android build/pause/OS-kill/Continue, and native iOS interaction/rotation/lifecycle recovery. Exact commands, build hashes, screenshot dimensions, and remaining physical-device gates are recorded in [VALIDATION.md](VALIDATION.md). Local screenshots and native reports are in ignored `artifacts/`; signed-candidate/publisher review remains open.

The app minimum is **iOS 15.5**, Android **API 24** with **WebView 102+**, targeting **API 36**. The game needs newer web APIs than Capacitor's iOS 15.0 minimum: [Safari 15.4 added dialogs and Object.hasOwn](https://developer.apple.com/documentation/safari-release-notes/safari-15_4-release-notes), and [Safari 15.5 added inert](https://webkit.org/blog/12669/new-webkit-features-in-safari-15-5/). Current native execution evidence is iOS 26.3 / Android API 36; minimum-version physical testing remains open.

Published and checked against the local source: [privacy policy](https://lumioragame.github.io/last-beacon/privacy.html), [support page](https://lumioragame.github.io/last-beacon/support.html). The publication uses only the separate `mobile-policy-pages` branch; [deployment run](https://github.com/LumioraGame/last-beacon/actions/runs/42335045481) succeeded. The working contact is the [current repository issue tracker](https://github.com/LumioraGame/last-beacon/issues), enabled for this fork. No store registration, listing submission, or app release has been performed.

What's already in good shape: fully offline static build (`dist/`, no CDN or backend, which suits a Capacitor `webDir`), `viewport-fit=cover` plus `env(safe-area-inset-*)`, pointer events with `touch-action`, auto-pause and audio suspend on `visibilitychange`, a 2D fallback when WebGL2 is missing, a medium-quality default on touch devices, reduced-motion support, and a bilingual UI.

Legend: **P0** blocks store submission or causes a broken experience, **P1** should be fixed before launch, **P2** polish.

## P0: blockers

- [ ] **Native distribution setup remains open.** Both native projects, `ai.lumiora.lastbeacon`, version stamping, and unsigned/debug build paths now exist. Apple distribution signing, Android upload-key ownership, and store-account setup remain external inputs.
  Fix: add Capacitor with a bundled native web build, pick an app ID, and use `version` for marketing and CI for `CFBundleVersion`/`versionCode`. Do not point the release app at the live URL. Apple 4.2 assesses functionality and lasting value; bundling alone does not guarantee approval. See implementation work packages M1–M2 below.
- [x] **App icons and splash sources.** Generated from the existing beacon mark, including verified RGB iOS/store icons, Android adaptive foreground/background and monochrome artwork, native splash assets, and the Play feature graphic. See `assets/mobile/` and `npm run mobile:assets`.
  Fix: a 1024×1024 iOS icon (no alpha), an Android adaptive icon (foreground and background), and a splash. `@capacitor/assets` can generate them.
- [x] **Run recovery after process termination.** Periodic, action, and background checkpoints plus Continue restore actual simulation state. Deterministic continuation and native OS-kill/relaunch tests cover the behavior; sudden termination can lose changes since the last committed checkpoint.
  Fix: serialize `Game` state (it's deterministic and browser-independent in `src/game.js`) on `visibilitychange→hidden` / `pagehide` / Capacitor `App.pause`, then offer "Continue" on launch.
- [x] **WebGL context loss recovery.** Loss pauses combat; restore rebuilds the renderer after Three.js resets its caches. Timeout/repeated loss falls back to 2D. Browser tests exercise restore and timeout fallback while preserving the run and controls.
  Fix: listen on the canvas, `preventDefault()`, then recreate the renderer on restore (`createRenderer()` already exists in `src/app.js`), or fall back to 2D.
- [ ] **Privacy policy and store privacy declarations.** Both stores require a privacy policy URL even when the app collects nothing.
  Fix: publish a policy matching the final app and SDK behavior, then fill in App Privacy, Google Play Data safety, and the current content rating questionnaires. Use "Data Not Collected" only after auditing the final build; let the questionnaires determine ratings. Include an app-target `PrivacyInfo.xcprivacy` covering the required-reason APIs actually used by the app and plugins.
- [ ] **China mainland App Store.** All games there, free ones included, need an ISBN/版号 approval number. The game is Chinese-first, so either get one or exclude the China mainland storefront at launch. Google Play isn't available in mainland China, so Android China needs separate stores (TapTap, Huawei, etc.) if wanted.
- [x] **Store listing asset preparation.** English/zh-Hans copy, support URL, icons/feature graphic, and 24 real packaged-app screenshots are prepared: iPhone 1206×2622 / 1320×2868, Android phone 1080×1920 and tablet 1600×2560. Native iPad is deferred. Signed-candidate review and current console validation remain release gates; preview video is optional.

## P1: fix before launch

- [x] **Short-landscape layout.** Short cards retain accessible names while hiding overlapping visual names; system controls collapse into the menu at short heights. English/Chinese touch and bounds checks cover 844×390 as well as portrait, small phone, and tablet-sized viewports.
- [ ] **Orientation and device acceptance.** Portrait and both phone landscape directions are configured, with iPhone-only iOS device family and native iPad deferred. Simulator/browser rotation is covered; physical minimum-device and Android tablet/foldable acceptance remains open.
- [x] **Android back button.** Native Back now closes the top dialog/menu/log, cancels selection/aiming, pauses combat, then offers a save-before-exit confirmation. Verified against the installed Android app.
  Fix: `@capacitor/app` `backButton` should close the menu or dialog, then cancel aiming, then pause, then confirm before exiting.
- [x] **Durable settings storage.** Preferences hydration/migration completes before game startup; failed native reads block unsafe defaults, failed writes retain dirty values and show recovery UI. Ordered writes and migration have focused tests; native process-kill testing verifies preference persistence.
  Fix: hydrate a settings cache from `@capacitor/preferences` before initializing the app, then adapt the existing `read`/`write` helpers and `src/i18n.js` language persistence to that cache. Preferences is asynchronous; simply swapping the synchronous helpers is insufficient. Keep localStorage as the web fallback.
- [ ] **Long-press and selection in WKWebView.** Game-shell selection/callout suppression is implemented, preserving selectable policy/diagnostic text. Finish native long-press and enlarged-text acceptance on supported devices.
- [ ] **Performance, heat, and battery on real devices.** Visible idle/paused drawing now caps at 30fps; hidden rendering stops; sustained slow active frames trigger a temporary quality downgrade. Profile a low-end Android device (around 3–4 GB RAM, Mali or Adreno 6xx) and an older iPhone (A12/A13) before accepting the hardware floor.
- [ ] **Android edge-to-edge (release targetSdk 36+).** SystemBars CSS insets use one source of truth with `env()` fallback; native emulator layout is exercised. Finish physical cutout, gesture-navigation, three-button-navigation, and WebView-version checks.
- [ ] **Audio session.** Ambient iOS session and AudioContext interruption/resume handling are implemented. Silent switch, phone calls, Siri, and headphones still need real-device verification.
- [x] **Local crash visibility.** Early error/rejection listeners retain bounded sanitized diagnostics with app version/build/platform/quality and provide a fatal-error recovery and user-reviewed copy/share flow. A browser test exercises the native diagnostics UI. Native store crash reports still depend on beta/distribution setup; no automatic JS telemetry is included.

## P2: polish

- [x] Platform-neutral audio error and touch-specific beam/strike/camera/help wording in both languages.
- [ ] Haptics are wired on build, wave start, and boss arrival (`@capacitor/haptics`); verify feel/support/settings on physical devices. Optional for v1.
- [ ] Native page zoom is disabled in Capacitor configuration while retaining custom camera gesture handling. Finish native pinch/camera acceptance. Browser accessibility zoom is retained.
- [x] Native release build removes game debug access; explicit native debug builds retain it. Browser release and packaged Android checks verify absence.
- [x] Playwright mobile smoke tests cover both locales, four viewport sizes, real-budget tapping, reload/Continue, storage failure, background/dialog pause ownership, GL recovery, native release behavior, and diagnostics. CI configuration is prepared; hosted CI runs remain pending push.
- [ ] Optional: Game Center / Play Games leaderboards for endless-mode records.
- [x] Prepared store metadata focuses on the game and omits irrelevant AI-tool branding. Apple 2.3.10 specifically restricts other mobile platform / marketplace references and irrelevant information; it is not a blanket ban on AI attribution. Development notes remain in the repo.

## Implementation plan

Prepared 2026-11-06 against `42e7693`. The implementation status above records current progress; the work packages below retain the full intended release scope and acceptance gates. File names marked **new** were proposed implementation locations.

### Launch scope and decisions

Use these planning defaults to keep the first release bounded:

- Ship the existing offline game in Capacitor 8, retaining browser play, the static deployment, and the self-contained HTML download. No backend, accounts, ads, purchases, analytics, or remote error-reporting SDK in v1.
- Support portrait and both landscape directions on phones. Fix the existing short-landscape layout rather than introducing a lock. Start with iPhone support on iOS; native iPad support is deferred unless explicitly added before M2. Android must still handle tablets, foldables, and window resizing wherever installation is allowed.
- Keep Simplified Chinese and English. Exclude the China mainland App Store territory for v1 unless the required approvals are supplied. Language support does not require distribution in mainland China. Apple documents game approval requirements in its [App Information reference](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/).
- Use `Last Beacon` as the working app name and `1.0.0` as the first marketing version. The publisher must supply the final reverse-domain app ID, Apple team, Android signing ownership, support contact, and hosted policy/support URLs before registration or signed distribution. These are release inputs, not reasons to stop shared-code work.
- Use the selected Capacitor version's supported deployment minimums, then record the actual tested OS range. Do not promise older OS versions based only on the web version working there.

### Corrections and additions to the original audit

1. Native plugin integration requires a build step that resolves npm packages. `build.mjs` currently copies source files and uses a limited custom bundler for the standalone edition; importing `@capacitor/*` directly into `src/app.js` will break those paths. Resolve this in M1 before adding plugins.
2. App initialization is synchronous today, including language selection and `new Game()`. Native settings and saved-run loading must finish before the first playable frame. `saveLanguage()` also writes independently of the app's `read`/`write` helpers.
3. Saving only on background callbacks is insufficient: termination can interrupt async writes or happen without a final callback. Save during play and retain a last-known-good checkpoint.
4. New Google Play submissions currently need Android 16 / API 36 or higher, effective August 31, 2026; the original API 35 baseline is outdated. See [Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878).
5. Apple uploads currently require Xcode 26 or later and the iOS 26 SDK or later. Build SDK and deployment minimum are separate settings. Complete the updated age-rating questions instead of assuming the original 9+ estimate. See [Apple submission requirements](https://developer.apple.com/news/upcoming-requirements/).
6. Inspect the Android release bundle for native `.so` dependencies and verify 16 KB compatibility if any exist; JavaScript game code does not establish the compatibility of its native dependencies. See [Android page-size guidance](https://developer.android.com/guide/practices/page-sizes).
7. Check the publisher's Play account early. Personal accounts created after November 13, 2023 currently require at least 12 continuously opted-in closed-test testers for 14 days before applying for production access. This can determine the calendar schedule. See [Play testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).
8. Screenshot requirements change. Use the final supported device families and current [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) rather than treating the audit's 6.9-inch example as permanent. Include the Android store icon and feature graphic as well as screenshots, following [Play preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151).

### Work packages and order

Estimates are engineering days for one developer, including focused verification. They exclude account enrollment, recruiting testers, approval waiting time, and substantial custom artwork. They are planning ranges, not delivery commitments.

| ID | Work package | Depends on | Estimate | Main outputs |
| --- | --- | --- | --- | --- |
| M0 | Confirm release inputs and baseline | — | 0.5–1 | Device scope, IDs, accounts, test evidence |
| M1 | Build and platform boundary | M0 | 1–2 | Native bundle, web adapter, release build flags |
| M2 | Native shells, signing, launch artwork | M1 | 1–2 | `ios/`, `android/`, versioning, icons, splash |
| M3 | Durable settings and migration | M1; native QA after M2 | 1–2 | Async startup, Preferences cache, migration |
| M4 | Run snapshots and Continue flow | M3 | 2–3 | Versioned save format, durable run store, recovery |
| M5 | Lifecycle, WebGL recovery, Back, audio | M2, M4 | 2–3 | Unified suspend/resume and recovery behavior |
| M6 | Mobile layout, insets, touch, wording | M1; native QA after M2 | 1–2 | Phone layouts and accessible touch controls |
| M7 | Performance and local diagnostics | M5, M6 | 1–2 | Frame scheduling, measured device results, support logs |
| M8 | Privacy, support, and store materials | Start after M0; finalize after M2–M7 | 1–2 | Hosted URLs, manifests, declarations, localized listings |
| M9 | Release automation, beta, and final QA | M2–M8 | 2–3 | CI checks, signed candidates, release evidence |

Total: approximately **13–22 engineering days**, plus external waiting time. Start publisher setup and policy/support drafts during M0; start any required closed-test clock as soon as a suitable test build and listing are ready. Within one developer's implementation sequence: M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9. Add browser smoke coverage alongside M4–M6 rather than postponing regressions until M9.

#### M0 — Establish release inputs and baseline

- Run the existing tests and build; record current results separately from the earlier validation record in `docs/VALIDATION.md`. Capture the reported 844×390 overlap in both languages.
- Record publisher-supplied app identifiers, supported device families/orientations, intended territories, marketing version, build-number source, signing ownership, and policy/support destinations here. Do not register a placeholder app ID.
- Check Apple/Play account readiness, applicable production-access testing requirements, and access to an older supported iPhone plus a 3–4 GB Android device. Account owners handle enrollment, legal declarations, and signing credentials.
- Check installed native toolchains against the selected Capacitor release. Current Capacitor 8 documentation requires Node 22+ and Xcode 26+; pin a supported Node version and update `package.json`/README for the native workflow. See [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).

**Acceptance:** baseline evidence and release decisions are recorded; missing external inputs have an owner and the milestone they block. Shared code can proceed while account inputs are pending.

#### M1 — Add a native build without breaking web distribution

**Files:** `package.json`, lockfile **new**, `build.mjs`, `src/bootstrap.js` **new**, `src/platform/web.js` **new**, `src/platform/native.js` **new**, native build script **new**.

- Add a separate esbuild-based native target that bundles npm dependencies to `dist-native/`. Configure Capacitor's `webDir` to this directory; retain `dist/` and `dist/last-beacon.html` for the existing web products. Verify the native entry HTML has resolved local assets and needs no import map or development server.
- Introduce a small platform contract for settings, run storage, app lifecycle, Android exit, and optional haptics. Browser code imports the web implementation through a relative module; the native bundler substitutes the native implementation. Keep `src/game.js` free of DOM and Capacitor imports.
- Bootstrap asynchronously through a function call, avoiding top-level await in the existing standalone bundler. Initialize storage before calling an exported app startup function; avoid dynamic imports in the standalone path unless its bundler is extended to support them. Render a recoverable startup error if initialization fails; do not leave a blank canvas.
- Keep the current zero-install browser development path. Require `npm ci` for native builds and new browser automation, documenting that distinction.
- Add release flags that omit `window.lastBeacon` and debug-only controls from native release builds while preserving explicit debug builds for smoke tests. Keep any source maps private with the release artifacts.

**Acceptance:** existing `npm test`/`npm run build` and standalone HTML checks pass; native web assets build from a clean install; neither web artifact needs native packages at runtime; a release build ignores `?debug` and runs offline.

#### M2 — Create reproducible iOS and Android apps

**Files:** `capacitor.config.*` **new**, `ios/` **new**, `android/` **new**, `assets/mobile/` **new**, package scripts and `.gitignore`.

- Pin compatible Capacitor 8 core/CLI/platform and official plugin versions. Add App, Preferences, and Filesystem; add Haptics only if included in v1. Generate native projects once the final app ID is known; commit source/configuration and dependency locks, excluding build outputs and credentials.
- Bundle `dist-native/`; omit release `server.url`, live-reload settings, and WebView debugging. Add build/sync/open scripts; build fresh web assets before each native sync so stale game code cannot reach an archive.
- Set the device/orientation policy from M0, Android game category, API 36+ target, and deployment minimums supported by the chosen runtime. Validate edge-to-edge behavior under that target in M6.
- Derive both marketing versions from `package.json`; inject a monotonically increasing build number into `CFBundleVersion` and `versionCode`. Set up Apple signing and Play App Signing/upload-key custody through local secure storage or CI secrets.
- Create an opaque 1024×1024 iOS source icon, Android adaptive foreground/background plus monochrome artwork, and a consistent splash. Generate platform assets with pinned tooling. Include a separate Play listing icon/feature graphic in M8.

**Acceptance:** a simulator/device iOS build and Android debug build cold-launch in airplane mode; icons and launch screens look correct in light/dark system modes; signed archives/bundles can be produced when credentials are available; two candidate builds have increasing build numbers.

#### M3 — Persist settings before app startup

**Files:** `src/storage.js` **new**, platform adapters, `src/bootstrap.js`, `src/app.js`, `src/i18n.js`, focused storage tests **new**.

- Hydrate a synchronous in-memory settings facade from native Preferences before the app initializes. Queue async writes in order, exposing a flush operation and write errors to lifecycle/support code. Use localStorage on web, with the current safe behavior when storage access throws.
- Migrate all existing keys: `last-beacon-best`, `last-beacon-difficulty`, `last-beacon-quality`, `last-beacon-language`, `last-beacon-coach`, and `last-beacon-camera-hint`. Preserve the existing legacy single-difficulty record conversion.
- On native, copy only missing values from that WebView's localStorage, validate values, verify successful writes, and then mark migration complete. Do not overwrite newer native settings. Installed native apps cannot automatically import a separate Safari/Chrome website's storage.
- Route language saving through the facade, and resolve saved language before localized HUD construction. Preserve a user's explicit quality preference separately from temporary performance/context-loss downgrades.

**Acceptance:** native settings and records survive process termination and an app update; existing valid localStorage values migrate once; failed writes can retry; missing/corrupt values default safely; both locales initialize correctly without briefly choosing the wrong saved difficulty or language.

#### M4 — Save and restore the current run

**Files:** `src/game.js`, `src/run-store.js` **new**, platform run-store adapters, `src/app.js`, `index.html`, `src/i18n.js`, serialization tests **new**.

- Add explicit `Game` snapshot/restore methods with a schema version, game-rules version, save timestamp, run ID, and checkpoint generation. Validate an allowlisted schema and bounded payload before constructing a restored instance with the proper prototype; never use unrestricted assignment from stored JSON.
- Preserve difficulty, HP, credits, capacity/grid level, wave/phase/endless/speed, towers and invested costs/targeting/cooldowns, enemies and statuses/path distances, in-flight projectiles including arc chains, pending strikes, spawn queue/timer, beam state, simulation clocks, kills, rewards, active overdrive and skill cooldowns, and `nextId`. Preserve entity order and IDs. Recompute power/network on restore. Preserve previous-step `lit`/`seen` flags because movement reads them before the next normal illumination update; recomputing those flags early changes deterministic continuation.
- Exclude queued presentation events, particles, renderer objects, menus, audio nodes, and camera cinematics. Restore presentation from game state without replaying build rewards, kill sounds, boss arrivals, or victory effects. Test equality of authoritative state rather than transient visual state.
- Store native run JSON in app-private Filesystem data storage, keeping Preferences for small settings. Use an IndexedDB transaction for web saves. On native write a candidate checkpoint, read/validate it, then promote it while retaining a previous valid checkpoint. Serialize writes and test interruption at each step; do not assume a multi-file sequence is atomic. See the [Filesystem plugin](https://capacitorjs.com/docs/apis/filesystem).
- Save after successful build/upgrade/sell/target/grid/beam/skill actions, wave transitions, and restart/endless transitions; debounce rapid changes. During active combat checkpoint every five seconds, and attempt an immediate flush on suspend/pagehide. Do not depend on an unload callback completing.
- Offer localized **Continue** and **New run** choices before starting simulation. Continue restores into a paused state with sound off until an eligible user interaction. A new run replaces the old checkpoint only after successful persistence; explicit discard invalidates both current and backup saves. Persist terminal outcomes as a non-continuable terminal record so an older live backup cannot resurrect a completed run. Recovery from a corrupt newest checkpoint uses the last valid compatible backup and explains any rollback; future/incompatible schemas show a safe recovery choice without silently overwriting the old data.
- Show a localized save-failure indication and permit retry/export diagnostics. Do not silently imply the current run is durable when storage is unavailable. Define and test any checkpoint size limits with an extended endless session.

**Acceptance:** round-trip tests cover build, mid-wave, mortar/arc projectiles, pending strike, beam, boss/night, and endless; ticking original and restored games with identical deltas/actions produces identical authoritative state. An OS kill restores the last completed checkpoint, normally within five seconds during uninterrupted play; no HP/credit/kill/wave reward duplication occurs. Restart, terminal states, corrupt saves, incompatible versions, full storage, failed writes, and interrupted promotion all have defined behavior.

#### M5 — Unify lifecycle and recovery

**Files:** `src/lifecycle.js` **new**, `src/app.js`, `src/audio.js`, `src/3d/world.js`, platform adapters, localized dialogs.

- Funnel browser `visibilitychange`/`pagehide` and Capacitor App lifecycle signals into one idempotent suspend path: mark lifecycle-paused, cancel aiming, snapshot/flush, suspend audio, and stop background rendering. Resume resets the frame timestamp, checks renderer/audio health, and requires explicit continuation of a live wave. No elapsed background time is simulated. The official [App plugin](https://capacitorjs.com/docs/apis/app) documents native lifecycle and Back events.
- Replace the single `pauseBeforeDialog` restoration rule with explicit user/dialog/lifecycle pause ownership. Closing help or restart after backgrounding must not inadvertently unpause the game. Save the underlying run, not dialog-local pause bookkeeping.
- Bind `webglcontextlost` and `webglcontextrestored` on every fresh canvas. Prevent the loss default, stop drawing the lost context, retain the game, and show recovery state. On restore recreate the renderer from the existing game/camera state; on timeout or repeated failure switch to 2D for that session. Rebind controls once and avoid retry loops. Suppress recovery during intentional disposal, since `World3D.dispose()` itself calls `forceContextLoss()`.
- Handle Android hardware and gesture Back with one priority order: dismiss the top dismissible dialog/menu/log, cancel aiming/build/selection, pause an active run, then show an exit confirmation. Back from the exit dialog cancels it. Confirmed exit flushes storage before `App.exitApp()`; a save failure offers retry or an explicit exit-without-saving choice. Never call the Android exit API on iOS or web.
- Handle AudioContext state changes/interruption, rejected resume promises, calls, Siri, headphones, and return to foreground. Resume only when visible and sound is enabled; retry on the next eligible user gesture. On iOS verify silent-switch/ambient mixing and configure the native audio session if WKWebView defaults fail the chosen behavior.

**Acceptance:** background during a wave, a modal, a skill charge, and context recovery; duplicate native/browser lifecycle signals do not double-save or resume play. Simulated context loss followed by restoration or timeout leaves a playable game with matching state and working picking. Repeated quality changes do not trigger false recovery. Back and audio tests pass on the packaged apps, including current Android gesture navigation.

#### M6 — Fix mobile controls and layout

**Files:** `src/style.css`, `index.html`, `src/app.js`, `src/i18n.js`, mobile smoke tests **new**.

- Fix 64px landscape build cards by allocating non-overlapping icon/name/cost areas or omitting the visual name while retaining the accessible label. Collapse system/field-tool rows into the existing menu at short heights as well as narrow widths; include language, quality, and grid controls.
- Recalculate island framing, pad hit targets, contextual rings, hints, and dialog bounds after rotation, safe-area changes, and window resize. Validate 390×844, 844×390, a small phone, and Android tablet/foldable windows in both languages. Add iPad cases only if native iPad support is selected.
- Verify the existing CSS inset variables against real Android cutouts and both navigation modes. Use Capacitor SystemBars inset handling where supported; inject native insets only if measured values require it, with one source of truth to avoid double-padding. See [System Bars documentation](https://capacitorjs.com/docs/apis/system-bars).
- Disable text selection/callouts and unwanted page zoom inside the native game shell while preserving two-finger camera zoom/pan. Retain readable, scrollable help/support dialogs and visible focus states; do not remove browser accessibility zoom globally.
- Replace browser-only audio errors and give touch users help text that describes visible controls. Keep keyboard help for keyboard users. Ensure primary touch controls are at least 44 CSS pixels where practical and dialogs remain operable with enlarged text.

**Acceptance:** screenshot and bounding-box checks show no card text/art overlap, clipped controls, HUD obstruction of essential taps, or page overflow. Tap-to-build, upgrade, beam aiming, menu/dialog dismissal, rotation, and two-finger camera controls work in both languages. Native long-press produces no unwanted callout.

#### M7 — Bound battery use and make failures diagnosable

**Files:** frame loop in `src/app.js`, `src/3d/world.js`, `src/diagnostics.js` **new**, support UI, device measurements in `docs/VALIDATION.md`.

- Separate simulation timing from draw scheduling: stop hidden rendering, cap visible paused/build scenes at 30 fps, and wake immediately on interaction. Never tick a large accumulated delta after resume or change combat speed with render FPS.
- Measure rolling foreground frame time only during active play, excluding loading, intentional caps, backgrounding, and renderer rebuilds. After sustained frame times above approximately 25ms, step down high → medium → low with a cooldown; offer 2D if low remains unusable. Do not overwrite the saved manual preference, repeatedly rebuild renderers, or upgrade automatically within the same session.
- Run repeated full campaigns including storm/boss and an extended endless session on the older supported iPhone and low-end Android device. Capture FPS/frame-time percentiles, memory trend, thermal behavior, input responsiveness, and battery observations. Initial acceptance target: sustainable 30 fps with usable touch response on low quality on the minimum tested hardware; measured failures require optimization, a 2D default, or a narrower supported range.
- Register `error` and `unhandledrejection` early; keep a small bounded local diagnostic log with app/build, platform, quality, and error details. Provide user-initiated copy/export and a localized fatal-error recovery screen that preserves the last good save. Avoid copying full saves or private file paths into support logs.
- Use TestFlight/Play crash reports for native crash visibility and symbolication files for matching builds. Local JS diagnostics require a user to share them; there is no automatic production JS telemetry in this v1 scope. Any later remote reporter triggers a fresh privacy audit.

**Acceptance:** background work stops; visible idle scenes respect the cap; simulation regression tests remain unchanged. Device results meet the agreed floor without sustained memory growth across restarts/quality changes. A forced JS failure creates a usable local support log and a recovery path without destroying the save.

#### M8 — Finish privacy and store deliverables

**Files:** hosted privacy/support content, `ios/.../PrivacyInfo.xcprivacy`, `docs/store/` **new**, listing artwork/captures.

- Publish stable HTTPS privacy and support URLs and link them from the app's help/about area. Describe local settings, saved runs, diagnostics, how to reset local data, support contact, and the effects of uninstall. Check OS backup behavior before promising data never leaves a device.
- Audit the release dependency list, permissions, entitlements, network behavior, and native privacy manifests. Include Preferences' required UserDefaults declaration and the reasons required by Filesystem/any other used APIs in the app target. Preferences documents `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1`; verify the merged archive rather than relying on source presence. See [Preferences privacy requirements](https://capacitorjs.com/docs/apis/preferences).
- Fill App Privacy and Play Data safety from that audit, including any SDK handling; complete age/content ratings, target audience, ads declaration, export compliance, territory/trader information, and other account-specific prompts. The no-collection answer remains conditional on the final app. See [Play Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469).
- Prepare English and zh-Hans title/subtitle or short description, full description, keywords where applicable, support contact, release notes, and review notes explaining offline play, touch controls, saved-run recovery, and no account requirement. Keep metadata focused on this game under [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/).
- Capture real final-build gameplay showing building, connected power, night combat, and the boss. Produce current required Apple sizes, any supported iPad screenshots, Android phone/tablet screenshots as applicable, store icons, and a 1024×500 Play feature graphic. Confirm current console validation before export. An App Store preview video is optional and should not hold release.

**Acceptance:** policy/support URLs load publicly; manifest inspection passes; declarations match final runtime behavior; screenshots match the candidate UI and selected device families; mainland China is excluded unless all required documentation is available. Publisher completes declarations and store-side legal inputs before submission.

#### M9 — Automate checks and validate release candidates

**Files:** `.github/workflows/` **new**, Playwright config/tests **new**, package scripts, `docs/VALIDATION.md`, release checklist here.

- CI: clean dependency install → unit/campaign/i18n/serialization/storage tests → existing static/standalone build → native web release build → mobile browser smoke checks. Add Android compile/bundle and iOS simulator-build jobs on appropriate runners; signed release jobs consume separately managed secrets and retain matching artifact/symbol metadata.
- Browser automation covers portrait/landscape and both locales, tap-to-build using real budgets, help/restart/Continue flows, save reload, simulated storage failure, WebGL loss, responsive bounds, and absence of debug access in release. Use an explicitly enabled test build for debug-assisted scenarios and separately smoke-test the actual release artifact without its hook.
- Native QA covers offline first launch, cold/warm resume, OS process kill and relaunch, app update with existing settings/save, Back gestures, system interruptions, safe areas, audio, storage failure, renderer recovery, and a complete campaign. Browser device emulation cannot close these native checks.
- Distribute signed candidates through TestFlight and Play internal/closed testing; address pre-launch findings and any applicable production-access requirements. Recheck current submission SDK/policy requirements immediately before upload.
- Record build number, commit, checksums, device/OS/WebView versions, test results, screenshots, and unresolved issues for each candidate. Prepare release notes and a patch path; Android/iOS fixes need a higher build number, and an installed binary cannot be assumed remotely reversible.

**Acceptance:** both store-ready signed candidates have complete evidence and no unresolved P0/P1 defects. Optional polish can remain explicitly deferred. Store submission and release happen only after publisher inputs and required beta gates are complete.

### Original gap coverage and deferred polish

| Original gap | Implementation / release gate |
| --- | --- |
| Native project, ID, signing, version/build numbers | M0–M2, M9 |
| App icons and splash | M2; listing artwork in M8 |
| Run lost after OS kill | M3–M5; process-kill evidence in M9 |
| WebGL context loss | M5; browser and native recovery checks |
| Privacy policy/declarations/manifests | M8 |
| Mainland China distribution | M0 territory decision; M8 verification |
| Store listing assets | M8 |
| Short-landscape card/menu layout | M6 |
| Orientation/iPad decision | M0/M2; M6/M9 selected-device QA |
| Android Back | M5/M9 |
| Durable settings | M3 |
| Long-press/selection | M6 |
| Performance, heat, battery | M7; real-device gate in M9 |
| Android edge-to-edge | M2/M6/M9 |
| Audio session/interruption | M5/M9 |
| Crash visibility | M7; local JS reports plus store native reports |
| Browser wording and keyboard help | M6 |
| Haptics | Optional after M5: build/wave/boss only, respect device support/settings; defer if it threatens release |
| Unwanted page pinch zoom | M6 native-shell behavior; retain camera gestures |
| Release debug hook | M1/M9 |
| Mobile smoke automation | Introduce during M4–M6; enforce in M9 |
| Game Center / Play Games | Deferred beyond v1; adds account/platform and privacy work |
| Store metadata platform/AI references | M8 |

### Final release gate

- [ ] Every P0 and P1 item has its linked implementation and passing evidence; no checkbox is closed solely because code exists.
- [ ] Fresh offline install, saved-run recovery, update migration, WebGL fallback, Back, audio, and both phone orientations pass on actual supported devices.
- [ ] Minimum-device performance is measured and acceptable; supported device/OS claims match the tested range.
- [ ] Final archives contain current web assets, correct IDs/versions, release flags, signing, artwork, and privacy manifests.
- [ ] Policy/support pages, privacy declarations, ratings, localized listings, screenshots, territories, and account-specific requirements are complete.
- [ ] TestFlight/Play beta findings are resolved and applicable closed-test/production-access requirements are satisfied.
- [ ] Publisher has reviewed the exact candidate build and listing; signing/upload/release ownership is recorded.
