# Copilot Instructions

- Use the commands documented in `AGENTS.md`.
- Make precise changes and preserve existing browser behavior.
- Before completing work, run `npm run check`.
- For visual tasks, include:
  - The target page and relevant element
  - Desktop and narrow-mobile verification
  - Console errors
  - A short before/after behavior summary
- For authentication changes, verify logged-out, valid-session, and network-error paths.
- For puzzle changes, update tests and run `python tools/verify_bank.py`.
- Do not commit secrets or generated data.
