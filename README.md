# Skiddio (Next.js)

AI-assisted task & schedule manager, converted from the original HTML/CSS/JS project to Next.js (App Router, plain JavaScript).
Same Supabase backend, same features, same styles.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Production: `npm run build && npm start`

### Supabase settings

The project URL and publishable key live in `.env.local` (already filled in with the values from your old `js/supabase.js`).
`.env.example` shows the format. `.env.local` is git-ignored, so on another machine / on your host (e.g. Vercel) set:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

The database policies are unchanged: `supabase/policies.sql`.

In the Supabase dashboard, set the **Site URL / redirect URL** to your deployed address. Confirmation emails land on `/`,
which forwards them to `/dashboard` so people end up signed in.

## Routes

| Route | What it is |
|---|---|
| `/` | Homepage |
| `/dashboard` | Sign in / sign up, then the app (checklist, calendar, notes, settings) |

## Structure

```
app/
  layout.js               Page metadata + theme script (no dark-mode flash)
  page.js                 Homepage
  dashboard/page.js       Renders <SkiddioApp />
  globals.css             Your styles.css, unchanged (+ a few classes that replace old inline styles)
components/
  SkiddioApp.jsx          Session, tasks, settings, rescheduler, drag-and-drop saving (was js/app.js)
  AuthCard.jsx            Sign in / sign up
  Sidebar.jsx             Navigation, theme toggle, logout
  ChecklistView.jsx       Add-task form, task list, summary card
  SkiddioCalendar.jsx     Month / week / day calendar with drag-and-drop (was js/calendar.js)
  NotesView.jsx           Notes + drawing canvas (was js/notes.js)
  SettingsModal.jsx       Working hours + buffer
  TaskEditDialog.jsx / ScheduleDetailsDialog.jsx / ConflictDialog.jsx
  home/                   HomeNav, AuthLinkForwarder
hooks/useTheme.js         Light / dark theme
lib/
  rescheduler.js          AutoRescheduler engine (logic unchanged)
  supabase.js             Supabase client (reads .env.local)
  tasks.js                Shared helpers (dates, times, row -> task)
supabase/policies.sql
```

## Notes on the conversion

- `js/ notes.js` (the file with a leading space in its name) was **not** converted: `index.html` never loaded it, only `js/notes.js`.
  If you meant to use that version (it tracks unsaved changes), tell me and I'll switch the notes over to it.
- The schedule-details dialog in the old project read an element (`schedule-details-note-text`) that didn't exist in the HTML, so
  opening details for a schedule with a note would throw. That is fixed here.
- The theme is saved only when you press the toggle, so first-time visitors follow their system setting.
- Moving the calendar forward a month from the 31st no longer skips a month.
