# WOTFit — Session History

Last updated: 2026-11-09

## Project

- Path: `C:\Users\tj2ng\My-Repo\WorkOutTracker`
- App: WOTFit by Ken Kanfix, a PWA workout tracker
- Stack: Vite 8, React 19, TypeScript 7, Tailwind CSS v4, Dexie 4, vite-plugin-pwa, Capacitor 8
- Storage: on-device IndexedDB only; no accounts or cloud sync

## Current status

- Core workout tracking is functional; lint and builds pass.
- PWA is live at `https://kenkanfix.github.io/wotfit/`; user confirmed access on 2026-11-07.
- Play privacy policy: `https://kenkanfix.github.io/wotfit/privacy.html`.
- GitHub Pages deploys the production build from the `gh-pages` root; `main` contains the app source and does not publish directly.
- Android release AAB/APK are built and signed from the current source.
- Play production upload is pending written Play support confirmation on personal vs organization account type.
- Current app icon retained; face-swap previews are only in `icon-previews/` and are not used by the app.

## Features implemented

- Start, resume, finish, and discard workout sessions.
- Log weight, reps, and sets per exercise; sets are saved to IndexedDB immediately.
- Rest timer with skip/+5 seconds, sound, vibration, notifications, and screen wake lock.
- Double-progression suggestions based on completed session history.
- Goal-based plan generation with equipment, experience level, and calisthenics progressions.
- Exercise library with 70 movements and bodyweight ladders.
- Smart Plan editing: swap, remove, or add exercises before starting or saving.
- History screen with completed strength sessions, HIIT sessions, and set details.
- Settings for goal, experience, equipment, units, sound, notifications, install, export, and reset.
- PWA manifest, service worker, install prompt support, and Capacitor configuration.
- JSON export of settings, exercises, workouts, saved plans, sets, and HIIT sessions from Settings.
- Default rest of 20 seconds with 5-second adjustments and per-exercise overrides.
- Named workout plans that can be saved, started, or added to an active session.
- Larger animated exercise preview opened from workout, plan, and HIIT screens.
- HIIT timer with Auto, Custom, and Ladder modes, a 10-second pre-start countdown, 112px active timer, transition warning sound, and voice announcements for upcoming intervals.
- Ladder HIIT builds ascending then descending exercise rungs with fixed or 1:N rest:work recovery.
- Dark and light appearance modes persisted in settings.

## Session 2026-11-05 — Icon and Start-button fixes

1. Replaced the generated dumbbell icons with the user-supplied `GymKenKanfixIcon.png`.
   - Generated optimized PNGs for `pwa-192x192`, `pwa-512x512`, `pwa-maskable-512x512`, `apple-touch-icon` (180), and `favicon` (64).
   - Updated `index.html` and the PWA `includeAssets` list to use `favicon.png`.
   - Removed `public/favicon.svg`.
2. Fixed the Start button doing nothing on a phone.
   - Cause: the dev server was opened over plain HTTP, so the page was not a secure context and `crypto.randomUUID()` was unavailable.
   - Fix: added `src/lib/id.ts` with a secure-context-safe UUID fallback using `crypto.getRandomValues`, and replaced all `crypto.randomUUID()` calls in `src/lib/workout.ts`.
   - Verified the full workflow against the LAN URL in an insecure context.
3. Started the dev server for phone testing and confirmed LAN access.
4. Saved this session history.

## Session 2026-11-07 — PWA deployment, Android release, Play prep

1. Fixed PWA base-path handling for GitHub Pages.
   - Added `npm run build:pages` (`vite build --base=/wotfit/`).
   - Manifest now uses relative `scope: './'` and `start_url: './'`; resolves to `/wotfit/` on Pages and `/` under Capacitor.
   - Replaced absolute asset paths with `${import.meta.env.BASE_URL}...` in `AboutSheet.tsx`, `HomeScreen.tsx`, `ExerciseGraphic.tsx`, and `feedback.ts`.
   - `index.html` favicon and Apple touch icon are relative.
2. Added and deployed the privacy policy.
   - `public/privacy.html` covers local-only storage, no tracking, deletion, security, children, third-party services, and contact.
   - Linked from `AboutSheet.tsx`; verified back link and live URL.
3. Deployed the PWA to GitHub Pages.
   - Repo: `https://github.com/KenKanfix/wotfit`; Pages source: `gh-pages` root with `.nojekyll`.
   - Verified live manifest, service worker at `/wotfit/sw.js` with scope `/wotfit/`, exercises, privacy page, and app render with no console errors.
   - `gh` auth has `gist`, `read:org`, and `repo` scopes; no `workflow` scope, so avoid GitHub Actions.
4. Rebuilt and verified the Android release.
   - Commands: `npm run build` → `npx cap sync android` → `.\gradlew.bat bundleRelease --no-daemon --console=plain` → `.\gradlew.bat assembleRelease --no-daemon --console=plain`.
   - AAB: `android/app/build/outputs/bundle/release/app-release.aab`; `jar verified`.
   - APK: `android/app/build/outputs/apk/release/app-release.apk`; v2 signature verified.
   - Cert SHA-256: `33:B3:12:EF:60:3B:D2:E1:DC:79:CB:AB:19:D8:EF:BA:B4:D0:86:9F:EB:2F:55:9C:E4:23:C2:ED:94:FB:46:B1`; back up the keystore.
   - Package `io.github.kenkanfix.wotfit`, versionCode 1, versionName 0.1.0, minSdk 24, target/compile 36.
5. Prepared Play Store submission.
   - Assets in `play-store/`: icon, feature graphic, and four phone screenshots.
   - Category `Health & Fitness`; target audience `13+`; include “not a medical device” disclaimer.
   - Do not claim “no health features”; declare `Health and fitness → Activity and fitness`.
   - Play account is personal. The official policy is ambiguous for health/fitness apps; the recommended path is written Play support confirmation (or organization conversion).
   - If a personal account was created after 2023-11-13, production also requires 12 testers opted in continuously for 14 days.
   - User chose “Contact Play support”; ready-to-send support request was provided. User must submit it and retain the reply.
6. Reviewed the requested icon face swap.
   - `Trung-icon.jpg` is 3072×3072 and contains the main central face.
   - Generated previews in `icon-previews/` only; no app icon files were changed.
   - User decided to keep the current app icon for now.

## Session 2026-11-07 — Rest, saved plans, larger preview, theme

1. Changed default rest from 120 to 20 seconds and the adjustment step from 15 to 5 seconds.
   - `src/lib/rest.ts`: `DEFAULT_REST_SECONDS = 20`, `REST_STEP_SECONDS = 5`, `MIN_REST_SECONDS = 5`.
   - Added Dexie version 5 migration: stored default rest of 120 is moved to 20; existing custom overrides are retained.
   - Rest timer quick-add button now adds 5 seconds.
2. Added saved named workout plans.
   - New `SavedPlan` and `SavedPlanItem` types; new `savedPlans` Dexie table.
   - `src/lib/plans.ts` handles save, delete, and start/add-to-session.
   - Plan screen can name and save the current generated plan, then start it later or add it to an active session.
   - JSON export now includes saved plans.
3. Added a larger exercise media viewer.
   - Tap the expand icon on exercise graphics in Workout, Plan, and active HIIT screens.
   - Opens a portal modal with a larger animated WebP exercise preview; closes via outside tap, close button, or Escape.
   - No standalone video files exist in the app; the existing two-frame exercise animation is what expands.
4. Added dark/light appearance switching.
   - `Settings.theme` with a Dexie version 5 migration; toggle in Settings → Preferences.
   - Light mode overrides Tailwind CSS zinc/brand variables via `[data-theme="light"]`.
   - Theme is stored in localStorage for flash-free startup and updates the browser theme-color/status-bar meta tags.
5. Verified with `npm run lint` and `npm run build`; both pass.
   - Deployed to GitHub Pages; the live bundle includes saved plans and the appearance toggle.
   - For Android, use `npm run build` before `npx cap sync android`.

## Session 2026-11-07 — Core exercise expansion

1. Added eight bodyweight core movements: Crunch, Bicycle crunch, Reverse crunch, Dead bug, Superman, Side plank, Russian twist, and Mountain climber.
   - Added technique cues for each movement.
   - Added two-frame WebP illustrations under `public/exercises/`.
2. Verified search results and image loading with a headless Chrome flow.
   - Searching `crunch` returns Crunch, Bicycle crunch, Reverse crunch, and Cable crunch.
   - Searching `superman` returns Superman and the 640x427 preview loads.
   - `npm run lint` and `npm run build:pages` pass.

## Session 2026-11-07 - Smart Plan editing and Frog sprawl kick

1. Added `Frog sprawl kick` to the exercise library.
   - Bodyweight plyometric movement, intermediate level, 8-15 reps, 60-second default rest.
   - Primary quads and glutes; secondary core, shoulders, and calves.
   - Added two-frame 640x427 WebP illustrations and a technique cue.
2. Added editing controls to Smart Plan.
   - Each planned exercise can be swapped or removed.
   - `Add exercise` opens the existing searchable exercise picker.
   - `Reset` restores the generated plan; `Shuffle` starts a fresh generated plan.
   - Edited plans can still be saved, started, or added to an active session.
3. Added a back button from Settings to Smart Plan when Settings was opened via the Plan screen's Edit action.
4. Verified with `npm run lint`, `npm run build:pages`, and a headless Chrome flow covering swap, add, remove, reset, and Frog sprawl kick search.

## Session 2026-11-08 - HIIT timer feedback and countdown

1. Enlarged the active HIIT countdown from `text-7xl` to `text-8xl` with tight line height; verified at 96px with no horizontal overflow.
2. Added a 10-second pre-start countdown.
   - Starting a session now shows `Get ready` with the first exercise and counts down before the first work interval.
   - Voice: `Start your watch. First up: <exercise>.`
   - At three seconds remaining: `Get ready. <exercise> in 3 seconds.`
   - At zero: plays the work cue and announces `Go: <exercise>.`
   - Pause/resume holds and resumes the countdown; Skip starts the first interval immediately.
3. Added a distinct three-note warning sound for the last three seconds of each rest interval.
4. Added voice announcements:
   - At work start: `Go: <exercise>.`
   - At rest start: `Break. Next up: <next exercise>.`
   - Three seconds before the next interval: `Get ready. <next exercise> in 3 seconds.` or `Break in 3 seconds.`
   - Final interval: `Final 3 seconds.`
5. Moved HIIT announcements into `useHiitTimer` so they continue while the user is on another tab.
6. Verified with `npm run lint`, `npm run build:pages`, and headless Chrome tests covering the countdown, 96px timer, pause/resume/skip during countdown, rest/work announcements, both warning announcements, and the warning/rest audio cues.

## Session 2026-11-09 - HIIT history, larger timer, and Ladder mode

1. Persisted completed HIIT sessions to a new Dexie `hiitSessions` table (schema version 6).
   - Saved on finish from `App.tsx` via `saveHiitSession()` in `src/lib/hiitHistory.ts`.
   - Stored mode, work/rest settings, rest ratio, ladder steps, rungs, total time, and interval detail.
   - Added HIIT sessions to History alongside completed strength workouts, with expandable details and delete.
   - Added `hiitSessions` to the Settings JSON export.
2. Increased the active HIIT timer from 96px to 112px (`text-[7rem]`) with a 96px fallback below 360px width.
3. Added Ladder as a third HIIT mode.
   - Uses the selected exercises in order as steps.
   - Builds ascending rungs `[1]`, `[1,2]`, ... `[1..N]`, then descending rungs `[2..N]`, ... `[N]`.
   - Every exercise in a rung runs for the configured work time; rest follows each rung.
   - Rest can be fixed seconds or `1:N` rest:work based on the rung's total work time.
   - A 3-step ladder produces 5 rungs; a 6-step ladder produces 11 rungs.
4. Verified with `npm run lint`, `npm run build:pages`, and headless Chrome tests covering:
   - Ladder preview counts, fixed/ratio rest summaries, and 112px timer with no overflow.
   - Saving a finished ladder session to History and persistence after reload.
   - The exact 3-step ladder sequence: `[1]`, `[1,2]`, `[1,2,3]`, `[2,3]`, `[3]`.

## Important build/deploy notes

- Android must be built from the root-base `dist`: run `npm run build` before `npx cap sync android`.
- Do not run `npx cap sync android` against a Pages `dist` containing `/wotfit/` assets.
- The local `dist/` may be either build; run `npm run build:pages` before Pages deploys or `npm run build` before Android syncs.
- To trigger Pages after source changes: `gh api --method POST repos/KenKanfix/wotfit/pages/builds`.
- PowerShell may render the manifest title’s em dash as mojibake; the file is valid UTF-8 with `U+2014`.

## Key files

- `src/App.tsx`: app shell, tab routing, rest timer, active workout wiring
- `src/lib/workout.ts`: start/finish/discard workout, add exercises/sets
- `src/lib/id.ts`: UUID helper with non-secure-context fallback
- `src/lib/progression.ts`: double-progression logic
- `src/lib/recommend.ts`: goal/equipment/level plan builder
- `src/lib/history.ts`: history queries and progress insights
- `src/lib/hiitHistory.ts`: save/delete completed HIIT sessions
- `src/data/exercises.ts`: exercise library and progression groups
- `src/db.ts`: Dexie schema, defaults, seeding
- `src/hooks/useRestTimer.ts`, `src/hooks/useHiitTimer.ts`, `src/hooks/useWakeLock.ts`: rest/HIIT/wake-lock behavior
- `src/lib/feedback.ts`, `src/lib/speech.ts`: HIIT audio cues and voice announcements
- `src/components/ExercisePicker.tsx`, `RestTimerBar.tsx`, `BottomNav.tsx`
- `src/screens/HomeScreen.tsx`, `WorkoutScreen.tsx`, `HiitScreen.tsx`, `PlanScreen.tsx`, `HistoryScreen.tsx`, `SettingsScreen.tsx`
- `vite.config.ts`: PWA manifest and asset configuration
- `public/`: generated PWA, Apple, and favicon images
- `GymKenKanfixIcon.png`: source image for all app icons
- `capacitor.config.ts`: native wrapper configuration

## Verification performed

- `npm run lint` passes.
- `npm run build` passes.
- PWA icon assets return HTTP 200 and have the expected dimensions.
- Playwright flow against the LAN URL (`http://192.168.0.160:5173`, insecure context) passes:
  - Start empty workout
  - Add exercise
  - Complete a set and start rest timer
  - Skip rest timer
  - Finish workout
  - View workout in History with saved set detail
  - Generate and shuffle a plan
  - Switch to calisthenics and confirm bodyweight exercises
- `window.isSecureContext` is `false` on the LAN URL and `crypto.randomUUID` is undefined, confirming the fallback path is exercised.

### 2026-11-07

- Live PWA manifest returns HTTP 200; manifest and installability error lists are empty.
- Service worker registers at `/wotfit/sw.js` with scope `/wotfit/`; app renders with no console errors.
- Android AAB passes `jar verified`; APK passes `apksigner verify` (v2); certificate SHA-256 matches.
- AAB/APK contain root-base assets, the privacy email, and the back link.

## Known limitations and next steps

- Play production upload is blocked pending written Play support confirmation on personal vs organization account type.
- No Android device/emulator is available for on-device runtime testing.
- History is device-local. Export exists; import/restore is not implemented.
- The current app icon is retained; unused face-swap previews are in `icon-previews/` and can be deleted.
- Automated tests are ad-hoc Playwright scripts in the temp directory, not checked into the repo.
- iOS native project is not generated; requires macOS/Xcode.

## Commands

```powershell
npm run dev -- --host 0.0.0.0 --port 5173
npm run lint
npm run build
npm run build:pages
npm run preview
npx cap sync android
cd android; .\gradlew.bat bundleRelease --no-daemon --console=plain
cd android; .\gradlew.bat assembleRelease --no-daemon --console=plain
gh api --method POST repos/KenKanfix/wotfit/pages/builds
```
