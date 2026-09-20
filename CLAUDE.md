# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A department portal for 食物栄養学科 (Food and Nutrition Department) at 十文字学園女子大学. Faculty use this to submit concurrent-work approval requests (兼務申請), and the app generates pre-filled Word/Excel documents for download. It also hosts an assistant-request log (助手室依頼台帳) for collaborative tracking.

## Commands

```bash
npm run dev       # Start dev server (Vite, http://localhost:5173)
npm run build     # Production build → dist/
npm run preview   # Preview the production build locally
npm run lint      # ESLint check
```

### Deploy to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Deploy Cloud Functions

```bash
firebase deploy --only functions
```

Deployed manually from a developer machine, **not** from CI — the GitHub Actions workflows deploy hosting only, and the TypeSafe API key must not be exposed to CI.

There are no automated tests. GitHub Actions auto-deploys on push to `main` and builds PR preview channels.

## Architecture

**Single-page app** — most UI lives in `src/App.jsx` plus `src/PrinterForm.jsx`, `src/AssistantRequestPage.jsx` (helpers under `src/assistantRequests/`) and `src/WritingCheckPage.jsx` (helpers under `src/writingCheck/`). React Router handles client-side routing; Firebase Hosting rewrites all paths to `index.html`.

One Cloud Function lives in `functions/` — everything else is client-side.

### Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `Dashboard` | Links, notices, calendar |
| `/application` | `ConcurrentWorkForm` | 非常勤講師 application form |
| `/application-general` | `GeneralConcurrentWorkForm` | General concurrent-work form |
| `/application-printer` | `PrinterForm` | Large color printer request |
| `/applications-list` | `ConcurrentWorksList` | Lists part-time lecturer entries |
| `/general-list` | `GeneralWorksList` | Lists general concurrent-work entries |
| `/assistant-requests` | `AssistantRequestPage` | 助手室依頼台帳 (create / edit / export) |
| `/writing-check` | `WritingCheckPage` | 提出物 記述チェック (admin-only; upload → analyze → export) |

### Firebase

- **Firestore** (`src/firebase.js`): `concurrent_works` stores 兼務 submissions (`applicationType`: `'part-time'` | `'general'`). `notices` holds the notice feed. `assistant_requests` holds the collaborative assistant-request log.
- **Project**: `jumonji-shokuei-portal` (asia-northeast1)
- Firebase config is hardcoded in `src/firebase.js` (public-facing, intentional).

### Security model

**This is a public repo and the Firebase Web config is public — `firestore.rules` is the ONLY access control. Do not weaken it.**

- `concurrent_works` holds personal/employment data. Rules: `create` is public but validated (`applicationType` must be `part-time`/`general`, `createdAt` must equal the server timestamp); `read`/`delete` require Firebase Auth (`request.auth != null`); `update` is denied.
- Submission forms stay public (no login). The two list pages (`ConcurrentWorksList`/`GeneralWorksList`) are wrapped in `AdminGate` (email/password Firebase Auth) and must never fetch without an authenticated user.
- Reviewer accounts are created manually in the Firebase console (Authentication → Email/Password). There is no public sign-up.
- `assistant_requests` allows open read/write by design (shared worklog: requesters add, assistants update status) — keep this scoped to that collection only.
- `notices` is public read, client writes denied.
- Everything else is denied.
- **Never hardcode or render credentials** (CMS logins, passwords, tokens) anywhere in the app or repo — both are public.
- The TypeSafe API key lives **only** in a Cloud Functions secret. Never put it in the client, in `.env`, or in a `VITE_*` variable — Vite inlines those into `dist/`, which is published.

### 提出物 記述チェック (`/writing-check`)

Admin-only tool that reads a UNIPA/manaba submission export (`.xlsx`), scores each essay on four rubric axes via the TypeSafe JEV model, and shows the results next to manaba's own `AI疑いスコア`/`AI判定` columns.

- **`api.typesafe.ai` is origin-allowlisted** and rejects browser requests (`400 Disallowed CORS origin`). All calls go through the `analyzeSubmission` callable in `functions/index.js` (region `asia-northeast1`), which requires `request.auth` so only signed-in reviewers can spend the API key.
- `src/firebase.js` exports `functions` with the region pinned. Omitting the region silently targets `us-central1`.
- **Only the essay body is sent.** `src/writingCheck/anonymize.js` strips names, student IDs and contact details first; names are matched as 姓+名 as a unit — never a standalone surname, which would corrupt ordinary words (e.g. a roster entry `原 和美` turning 「原理」 into 「［氏名］理」).
- Rubric definitions live server-side in `functions/questions.js` so clients cannot substitute their own prompts. `SCORE_MAX` is duplicated in `src/writingCheck/constants.js` — keep both in sync.
- **Nothing is written to Firestore.** Results stay in memory and leave only via the xlsx export, so `firestore.rules` needs no changes.
- The UI must never show a binary "AI 作成" verdict. The composite is labelled 要確認度（参考） and is a sort key for human review, not a judgement.

### Document generation

After a form submit, the app fetches a template from `public/` and fills it client-side:

| Template | Used by | Library |
|---|---|---|
| `public/template.docx` | `ConcurrentWorkForm` | docxtemplater (PizZip) |
| `public/template-general.docx` | `GeneralConcurrentWorkForm` | docxtemplater (PizZip) |
| `public/template-printer.xlsx` | `PrinterForm` | ExcelJS |

- **Docxtemplater delimiters**: `【field】` (not the default `{{field}}`).
- Dates in Word documents are converted to 和暦 (Reiwa era): year = `getFullYear() - 2018`.
- For periodic schedules, `day`/`startTime`/`endTime` are passed; for irregular schedules, `specificDates` carries the free-text frequency string.
- If a template file is missing (404), document generation is skipped silently and the Firestore write still succeeds.

### Styling

Tailwind CSS v4 via the `@tailwindcss/vite` plugin — no `tailwind.config.js` needed. Color scheme: blue-900 headers for 非常勤 flows, amber/amber-700 for general 兼業, violet for printer.

### Other notes

- `docs/concurrent_work_application/*.md` and `docs/superpowers/` hold design/implementation notes.
- `scratch/` holds ad-hoc scripts, not part of the build.
- `.agents/skills/` and `skills-lock.json` are an auto-installed Firebase agent-skills bundle, not project-specific conventions.
