---
name: remediate-validation
description: Validate this static escape-room app after code or puzzle changes.
---

# Remediate Validation

Use this workflow for implementation changes in this repository:

1. Run `npm test`.
2. If JavaScript, auth, puzzle, or browser behavior changed, run `npm run check`.
3. For UI changes, serve the app with `npm run serve`, open `http://127.0.0.1:4173/index.html`, and verify desktop and narrow-mobile layouts.
4. Check the browser console for runtime errors and verify Play Now redirects appropriately.
5. When puzzle bank or grading code changes, explain and pass `python tools/verify_bank.py`.
6. Finish with `git diff --check` and `git --no-pager diff --stat`.
