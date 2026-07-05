# DockTodo

A local-first task workbench for freelancers. It runs entirely in your
browser — no server, no account, no dependencies. Your data lives in
`localStorage` and never leaves your machine.

## Run it

Open `index.html` in any modern browser, or serve the folder with any static
file server. It works fully offline.

## Features

- Views: Today, Next 7 days, Calendar, Inbox, All, Completed
- Custom lists (rename, recolor, delete) and custom filters
- Full month calendar
- Start dates, due dates and reminders — a system notification fires when
  permission is granted, with an in-page toast fallback otherwise
- Repeat tasks (daily / weekdays / weekly / monthly): completing one archives
  a finished copy and rolls the task forward to its next cycle
- Tags with `#tag` quick-add syntax and a sidebar tag view
- Global search across titles, notes, checklist items, tags and list names
- Priority, notes, checklist items and checklist reminders
- Estimated / actual pomodoro counts and a focus timer
- Completion rate, overdue and pomodoro stats
- Per-task history log
- Light and dark themes
- Bilingual interface (English / 中文) — English is the source of truth
- Local export (clipboard / JSON file) and import (merge or replace)

## Language

The interface defaults to English. Switch to 中文 from Settings (the gear icon
in the rail). English is the source of truth; the Chinese strings are kept in
sync key-by-key in `assets/i18n.js`.

## Project layout

- `index.html` — markup
- `assets/i18n.js` — UI strings (en + zh) and locale formatting
- `assets/data.js` — storage key, default data, sanitizers, persistence
- `assets/app.js` — views, rendering and event wiring
- `assets/styles.css` — styles

Zero build step, zero runtime dependencies — clone and open.
