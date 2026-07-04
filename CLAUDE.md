# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A department portal for 食物栄養学科 (Food and Nutrition Department) at 十文字学園女子大学. Faculty use this to submit concurrent-work approval requests (兼務申請), and the app generates pre-filled Word/Excel documents for download.

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

There are no automated tests.

## Architecture

**Single-page app** — all UI lives in `src/App.jsx` (one large file) plus `src/PrinterForm.jsx`. React Router handles client-side routing; Firebase Hosting rewrites all paths to `index.html`.

### Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `Dashboard` | Links, notices, calendar placeholder |
| `/application` | `ConcurrentWorkForm` | 非常勤講師 application form |
| `/application-general` | `GeneralConcurrentWorkForm` | General concurrent-work form |
| `/application-printer` | `PrinterForm` | Large color printer request |
| `/applications-list` | `ConcurrentWorksList` | Lists part-time lecturer entries |
| `/general-list` | `GeneralWorksList` | Lists general concurrent-work entries |

### Firebase

- **Firestore** (`src/firebase.js`): single collection `concurrent_works` stores all submissions. `applicationType` field distinguishes `'part-time'` (非常勤講師) from `'general'` (一般兼務). Notices are in the `notices` collection.
- **Project**: `jumonji-shokuei-portal` (asia-northeast1)
- Firebase config is hardcoded in `src/firebase.js` (public-facing, intentional).

### Security model

**This is a public repo and the Firebase Web config is public — `firestore.rules` is the ONLY access control. Do not weaken it.**

- `concurrent_works` holds personal/employment data. Rules: `create` is public but validated (`applicationType` must be `part-time`/`general`, `createdAt` must equal the server timestamp); `read`/`delete` require Firebase Auth (`request.auth != null`); `update` is denied.
- Submission forms stay public (no login). The two list pages (`ConcurrentWorksList`/`GeneralWorksList`) are wrapped in `AdminGate` (email/password Firebase Auth) and must never fetch without an authenticated user.
- Reviewer accounts are created manually in the Firebase console (Authentication → Email/Password). There is no public sign-up.
- **Never hardcode or render credentials** (CMS logins, passwords, tokens) anywhere in the app or repo — both are public.

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
