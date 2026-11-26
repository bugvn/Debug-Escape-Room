# REMEDIATE: Debug Escape Room

You are locked in a cozy room. The only way out is to fix broken Python.

REMEDIATE is a browser game that teaches debugging. Each room has four objects, and every object hides a short Python program with a bug in it. Fix the code, run it, and the object unlocks. Fix all four and the door opens.

No install needed to play. Python runs right in your browser.

---

## What you will practice

Every puzzle trains one of four kinds of bugs:

| Bug type | What it looks like |
| --- | --- |
| **Index** | Off-by-one mistakes, going past the end of a list, missing dictionary keys |
| **Type** | Mixing text and numbers, like adding `"7"` to `1` |
| **Recursion** | A function that never stops, or never moves toward its stopping point |
| **Scope** | Variables that cannot be seen where you use them, `global` and `nonlocal`, default arguments |

---

## How to play

1. **Sign up or log in.** Pick a player name. Your games are saved to your account.
2. **Take the lesson (optional).** The Lesson page is a short walkthrough of the four bug types. Good warm-up if you are new.
3. **Open the dashboard and start a room.** You begin at the level you picked when you registered.
4. **Click an object in the room.** A puzzle window opens with a short story and some buggy code. The lines that are wrong are highlighted in red.
5. **Edit the code.** Change the code in the editor until the program prints exactly what the story asks for.
6. **Run to test, Submit to answer.**
   - **Run** just shows you what your code prints. It is free, run as much as you like.
   - **Submit** is your real answer. A wrong submit costs points.
7. **Stuck? Use a hint.** Hints start vague and get more specific. They cost points, so try on your own first.
8. **Solve all four objects.** The door opens and you escape.

### Rooms and levels

| Level | Room | Objects |
| --- | --- | --- |
| Beginner | Bedroom | Cactus, Air Conditioner, Teddy Bear, Computer |
| Intermediate | Kitchen | Plant, Cabinet, Pan, Wall Clock |
| Advanced | Living Room | TV, Green Box, Roomba, Laptop |

Each room has one puzzle per bug type, so you will meet Index, Type, Recursion and Scope every time.

### Your answer has to be a real fix

The game does not just compare your printed text. It also re-runs your code on different data and calls your functions with other inputs. So typing `print("the answer")` will not pass, and neither will changing the data to dodge the bug (for example, turning `"7"` into `7` instead of converting it). Fix the actual problem.

Code is limited to 500 characters, which is plenty for any puzzle.

---

## Scoring

Your score goes from 0 to 100 and is shown on your report after each game.

- **+20** for every puzzle you solve (max 80)
- **+ up to 20** time bonus if you escape. The faster you are, the more you get. It shrinks to zero at 15 minutes.
- **-3** for every hint you use
- **-2** for every wrong submit (capped at -20)
- Test runs never cost anything

| Score | Rank |
| --- | --- |
| 90 and up | S, Master Coder |
| 75 to 89 | A, Senior Debugger |
| 60 to 74 | B, Junior Debugger |
| 40 to 59 | C, Rookie |
| below 40 | D, Needs Practice |

---

## The game adapts to you

REMEDIATE watches how you play and adjusts the next room.

**You move up a level** if you escape, with at least 75% of your submits correct, using at most 1 hint, and fast enough:
- Beginner within 5 minutes
- Intermediate within 7 minutes
- Advanced within 10 minutes

**You move down a level** if fewer than 40% of your submits were right, or if you left the room after solving one puzzle or none.

**Otherwise you stay** on the same level.

**Weak spots get extra practice.** If you keep missing one bug type, the next room is more likely to include it, and it will be one level easier so you can build it up. Once you start getting it right, it stops being treated as a weak spot.

Rooms also avoid repeating the puzzles from your last game when they can.

---

## Fair play rules

The room is a focused practice space, so a few things are blocked while you play:

- Copy, cut, paste and drag-and-drop of text
- Right-click menu
- Developer tools shortcuts (F12, Ctrl+Shift+I, and similar)
- Large chunks of text appearing in the editor at once

Leaving the game window for 2 seconds or more (another tab, alt-tab) blurs the room until you return. Pasting, copying, or leaving the window counts as a **strike**. **3 strikes closes the room.**

Short flickers under a second, like a notification popup, are ignored. Right-click and dev-tools keys are blocked but do not cost a strike.

These events are logged to your game record. This is meant as a deterrent and an audit trail, not a perfect lock.

---

## The pages

| Page | What it is |
| --- | --- |
| `index.html` | Landing page |
| `login.html` | Sign up, log in, password recovery |
| `dashboard.html` | Your games, scores, and a button to start a room |
| `lesson.html` | Short lesson on the four bug types |
| `game-room.html` | The escape room itself |
| `test-summary.html` | Your debug report after a game |
| `analytics.html` | Cohort analytics for teachers and researchers (admin accounts only) |

---

## Running it yourself

You need a modern browser and an internet connection (Python, the database client and some styles load from CDNs). To serve the files locally, you need Python 3 or any static file server.

```
npm run serve
```

Then open `http://localhost:4173`.

Use a local server rather than double-clicking the HTML files. The game loads its puzzle bank with `fetch`, which browsers block on `file://` pages.

### Setting up your own database

The game stores accounts and game history in Supabase.

1. Create a Supabase project and put its URL and public (anon) key in `js/supabase-config.js`. Never put a service-role key in this repo.
2. In the Supabase **SQL Editor**, run `sql/schema.sql` once.
3. Then run `sql/migration-01.sql` through `sql/migration-05.sql`, in order.
4. To give someone access to the analytics page, set `is_admin` to `true` on their row in the `profiles` table.

### Checking that everything works

```
npm test          # runs all the tests
npm run check     # syntax checks + tests + real-Python check of every puzzle
```

`npm run check` needs Node.js and Python 3.

---

## Adding puzzles

1. Add a puzzle object to `js/puzzles.json`. Use `{obj}` in the title and story, and `{objfile}` in the file name, so it fits any room.
2. Add its answer to `tools/fixes.json` (this file is never loaded by the browser, so players cannot read it).
3. Run `npm run check`.

Keep enough puzzles in each bug type and level so rooms have something to rotate. The checks will tell you if a combination is too thin.

---

## Troubleshooting

**The room is stuck loading.** Python takes a few seconds to start the first time. If it never finishes, check your internet connection and refresh.

**The page sends me back to login.** Your session expired or could not be read. Log in again. If you unticked "Remember me", closing the tab ends your session.

**My room closed on its own.** You hit 3 strikes from copy/paste or leaving the window. Start a new room.

**I cannot see Cohort Analytics.** That page is for admin accounts only.

---

## Credits

Built as a final project. Pixel art, room scenes and the Cosmic Hearth visual theme are part of the project (see `docs/DESIGN.md`). Python in the browser is powered by [Pyodide](https://pyodide.org), accounts and data by [Supabase](https://supabase.com).
