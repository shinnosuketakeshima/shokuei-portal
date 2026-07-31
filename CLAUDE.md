# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page internal portal for the 十文字学園女子大学 食物栄養学科 (Jumonji University, Food & Nutrition department). Staff use it to view notices/calendar, submit concurrent-work ("兼務/兼業") approval requests, and submit a large-format printer request — each submission is saved to Firestore and simultaneously generates a filled-in Word/Excel document for the user to download and route by email/paper. All UI text and data are in Japanese.

## Commands

```
npm run dev       # start Vite dev server
npm run build     # production build to dist/
npm run preview   # preview the production build locally
npm run lint      # ESLint (flat config, eslint.config.js)
firebase deploy   # deploy dist/ to Firebase Hosting (project: jumonji-shokuei-portal)
```

There is no test suite/framework configured in this repo.

## Architecture

**Almost the entire application lives in `src/App.jsx`** (~1200 lines, no TypeScript). It defines `Sidebar`, `Header`, `NoticeArea`, `ConcurrentWorksList`, `GeneralWorksList`, `ConcurrentWorkForm`, `GeneralConcurrentWorkForm`, and `Dashboard` as local components, plus the `BrowserRouter`/`Routes` setup, all in one file. `src/PrinterForm.jsx` is the one form pulled into its own file. When making changes, expect to work within this single-file structure rather than looking for a components directory.

**Backend is Firestore only, no auth.** `src/firebase.js` initializes Firebase with a hardcoded client config (this is the normal public web-SDK config, not a secret) and exports `db`. There are two collections:
- `concurrent_works` — both request forms write here, disambiguated by an `applicationType` field (`'part-time'` for the non-part-time-lecturer form vs `'general'` for the general concurrent-work form). List views (`ConcurrentWorksList`, `GeneralWorksList`) query this same collection and filter/render differently based on that field.
- `notices` — read-only feed shown in `NoticeArea`, ordered by `createdAt desc`.

`firestore.rules` currently allows open read/write to everyone (`allow read, write`) — this is a known, explicitly-marked temporary state (see the TODO comment in the file), not an oversight to silently "fix" without checking with the user first.

**Document generation pattern**: each form, on submit, first writes to Firestore, then fetches a template from `public/` and fills it in client-side before triggering a download via `file-saver`:
- Word output (`template.docx`, `template-general.docx`) uses `docxtemplater` + `pizzip`, with custom delimiters `【...】` (not the default `{...}`) — matching the placeholder style baked into those template files. Dates are hand-converted to Reiwa-era Japanese format before being injected.
- Excel output (`template-printer.xlsx`, in `PrinterForm.jsx`) uses `exceljs` and writes directly to hardcoded cell addresses (e.g. `ws.getCell('F13').value = ...`) matching a fixed spreadsheet layout — there are no named ranges, so the cell/field mapping only makes sense by looking at the actual template file.

If a template's layout changes, the corresponding cell refs / delimiter placeholders must be updated in lockstep, in both directions.

**Deployment**: GitHub Actions auto-deploys on every push to `main` (`.github/workflows/firebase-hosting-merge.yml`) and builds a PR preview channel for pull requests (`firebase-hosting-pull-request.yml`), both via `firebase deploy` under Firebase project `jumonji-shokuei-portal`. There's no staging gate — merging to `main` ships to production.

**Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin (not a PostCSS config), themed in `src/index.css` using `@theme` custom properties.

## Things to be aware of

- The Dashboard (`App.jsx`, `Dashboard` component) hardcodes real CMS admin login credentials directly in the rendered UI (as an internal-staff convenience card). This is intentional per the app's purpose (unauthenticated internal-only portal), but treat it as sensitive content — don't casually copy it elsewhere or expose it outside this internal context.
- `docs/concurrent_work_application/*.md` contain the original design/implementation notes and Q&A for the concurrent-work forms — useful background if extending those forms, but not necessarily in sync with the current code.
- Root-level files `document.xml`, `original_document.xml`, `output.docx`, `test_docx.js`, and the `.docx`/`.xlsx` files under `src/` are leftover artifacts from reverse-engineering the docx/xlsx templates; they aren't part of the running app.
- `scratch/` holds ad-hoc one-off scripts, not part of the build.
- `.agents/skills/` and `skills-lock.json` are an auto-installed Firebase "agent-skills" bundle (Genkit/Firebase reference docs for AI agents), not project-specific conventions.
- `GEMINI.md` instructs Gemini CLI to think and respond in Japanese; there is no equivalent instruction file for Claude, so default behavior applies unless the user says otherwise.
