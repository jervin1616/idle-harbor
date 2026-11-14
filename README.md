# Idle Harbor
Cozy idle tycoon. TypeScript + Vite, plain HTML/CSS, Capacitor later.

```bash
npm install
npm run dev     # play at the URL it prints
npm test        # game logic + pacing tests
npm run build   # production build in dist/
```
Balance numbers: `src/config.ts`. Design: `DESIGN.md`. Art credits: `src/assets/README.md`.

## Android (needs Android Studio on your Mac)
```bash
npm install
npm run android:open     # builds the web app, syncs it into android/, opens Android Studio
```
Then press Run in Android Studio (emulator or a USB phone). Ads use Google's TEST ids until you change
`ADMOB` in `src/config.ts` and the `admob_app_id` in `android/app/src/main/res/values/strings.xml`.
The app id `com.risingtidedigital.idleharbor` (capacitor.config.ts) cannot change after the first Play upload.
