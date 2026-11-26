# Repository Agent Guide

## Project

This is a static HTML/CSS/JavaScript escape-room application with Supabase authentication and data storage. It also includes Node.js test files and a Python puzzle verifier.

## Commands

- Install: no npm dependencies are required.
- Test: `npm test`
- Full validation: `npm run check`
- Local server: `npm run serve`
- Puzzle verification: `python tools/verify_bank.py`

## Validation rules

- Run `npm run check` after JavaScript, puzzle, auth, or adaptive-logic changes.
- Keep all puzzle IDs unique and preserve category-level coverage in `js/puzzles.json` (add the matching fix to `tools/fixes.json`; use `{obj}` and `{objfile}` in title, story and file).
- Do not weaken copy/paste or integrity logging checks when changing `game-room.html`.
- Treat local Supabase failures as safe failures: redirect unauthenticated users and restore page visibility.
- Do not expose Supabase service-role secrets in browser code.

## Change workflow

- Make surgical changes on a feature branch.
- Verify behavior with the smallest relevant test first, then run `npm run check`.
- For UI changes, test desktop and narrow mobile layouts and include the URL and console status.
- Summarize the diff and explain the why, not only the what, before committing.