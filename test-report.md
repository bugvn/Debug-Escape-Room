# REMEDIATE test report

Run: 2026-11-27 12:51:47 UTC  
Command: `node tools/run-tests.js`

## Summary

| Level | What it checks | Tests | Passed | Failed | Skipped |
| --- | --- | ---: | ---: | ---: | ---: |
| Unit | one function or module at a time (scoring, adaptive rules, anti-cheat, analytics, lesson gate rules) | 56 | 55 | 1 | 0 |
| Integration | modules working together (account + level + lecture gate, puzzle bank + rules + scoring) | 21 | 21 | 0 | 0 |
| System | the whole site end to end without a browser (pages, files, links, full player journey, real Python puzzle check) | 36 | 36 | 0 | 0 |
| **Total** | | **113** | **112** | **1** | **0** |

## Unit tests

| ID | Test | File | Result |
| --- | --- | --- | --- |
| UNI-001 | bank: unique ids, every category x level covered, valid fields | adaptive.test.js | PASS |
| UNI-002 | tag -> category | adaptive.test.js | PASS |
| UNI-003 | applyVariant forces text input for Type puzzles, pyLiteral makes valid python | adaptive.test.js | PASS |
| UNI-004 | accuracy counts submits only | adaptive.test.js | PASS |
| UNI-005 | clean fast win moves up one level | adaptive.test.js | PASS |
| UNI-006 | top level stays at top, bottom level stays at bottom | adaptive.test.js | PASS |
| UNI-007 | slow, hint-heavy or sloppy win stays | adaptive.test.js | PASS |
| UNI-008 | very low accuracy or leaving early moves down | adaptive.test.js | PASS |
| UNI-009 | left after solving most puzzles with good accuracy stays | adaptive.test.js | PASS |
| UNI-010 | weak categories need 2 misses, worst first, runs ignored | adaptive.test.js | PASS |
| UNI-011 | room: 4 distinct puzzles, all from the asked level when the bank has enough | adaptive.test.js | PASS |
| UNI-012 | room: weak categories are always included, capped by weakSlots | adaptive.test.js | PASS |
| UNI-013 | room: tops up from the nearest level when a level is short | adaptive.test.js | PASS |
| UNI-014 | room: puzzles from the last room are not repeated | adaptive.test.js | PASS |
| UNI-015 | room: every object gets a puzzle, themed on the object that was clicked | adaptive.test.js | PASS |
| UNI-016 | theming: {obj} and {objfile} are filled in, plainTitle drops the token | adaptive.test.js | PASS |
| UNI-017 | room: a weak category gets a puzzle one level easier | adaptive.test.js | PASS |
| UNI-018 | weak categories expire once the player gets them right | adaptive.test.js | PASS |
| UNI-019 | perfect instant escape is 100 | score.test.js | PASS |
| UNI-020 | no time bonus at or over par | score.test.js | PASS |
| UNI-021 | half of par gives half the bonus | score.test.js | PASS |
| UNI-022 | left room gets no time bonus | score.test.js | PASS |
| UNI-023 | hints cost 3 each | score.test.js | PASS |
| UNI-024 | wrong submits cost 2 each, capped at 20 | score.test.js | PASS |
| UNI-025 | test runs never cost points | score.test.js | PASS |
| UNI-026 | rows saved before the kind column count as submits | score.test.js | PASS |
| UNI-027 | score never goes below 0 | score.test.js | PASS |
| UNI-028 | ranks | score.test.js | PASS |
| UNI-029 | copy, paste, cut, drop and big inserts are strikes | integrity.test.js | PASS |
| UNI-030 | right-click and devtools keys are logged but free | integrity.test.js | PASS |
| UNI-031 | leaving the window only costs a strike after the grace time | integrity.test.js | PASS |
| UNI-032 | developer-tools shortcuts are recognised, normal typing is not | integrity.test.js | PASS |
| UNI-033 | typing one character is fine, a long one-shot insert is not | integrity.test.js | PASS |
| UNI-034 | descriptive helpers match hand-checked values and ignore nulls | analytics.test.js | PASS |
| UNI-035 | rows from Supabase / CSV are cleaned, in-progress games dropped, no group column needed | analytics.test.js | PASS |
| UNI-036 | csv parser handles quotes, commas and blank lines | analytics.test.js | PASS |
| UNI-037 | analyze: one group, kpis, per-room means and SDs are hand-checkable | analytics.test.js | PASS |
| UNI-038 | first-attempt success and attempts per puzzle come from the submits | analytics.test.js | PASS |
| UNI-039 | first room vs last room: improved / same / dropped use a 5 point band | analytics.test.js | PASS |
| UNI-040 | weakest topic per player needs 2+ submits in a topic | analytics.test.js | PASS |
| UNI-041 | rule check re-runs js/adaptive.js on the logged submits and finds a wrong next level | analytics.test.js | PASS |
| UNI-042 | room level and starting level filters narrow every number | analytics.test.js | PASS |
| UNI-043 | sample data: 30 players, 3 rooms each, repeatable, rules agree with the log | analytics.test.js | PASS |
| UNI-044 | insights are descriptive: no significance claims, no control group, empty data does not crash | analytics.test.js | PASS |
| UNI-045 | report CSV has mean, SD and n columns and no control column | analytics.test.js | PASS |
| UNI-046 | integrity rows are cleaned; a free event is not a strike | analytics.test.js | PASS |
| UNI-047 | excluding flagged games removes them from every number | analytics.test.js | PASS |
| UNI-048 | analysis without any integrity data still works and says so | analytics.test.js | PASS |
| UNI-049 | new account (never saw a lesson) must see the lesson at any level | progress.test.js | PASS |
| UNI-050 | same level again: no lesson, straight to the game | progress.test.js | PASS |
| UNI-051 | moving up a level brings the lesson back | progress.test.js | PASS |
| UNI-052 | moving down a level does not repeat a lesson they already finished | progress.test.js | PASS |
| UNI-053 | unknown level counts as BEGINNER; higherLevel ignores missing values | progress.test.js | PASS |
| UNI-054 | wiring: game room reads the saved level and enforces the gate; Play buttons use it | progress.test.js | PASS |
| UNI-055 | sql: migration-06 adds both columns, the sync trigger and the sign-up level | progress.test.js | PASS |
| UNI-056 | lessons: one module per level, every lesson complete | progress.test.js | FAIL |

## Integration tests

| ID | Test | File | Result |
| --- | --- | --- | --- |
| INT-001 | INT-01 brand-new account must see the lecture before the first game | integration/account-flow.test.js | PASS |
| INT-002 | INT-02 after finishing the lecture, the same level goes straight to the game | integration/account-flow.test.js | PASS |
| INT-003 | INT-03 old account (already played, lesson marked seen by migration) is not forced to take the lecture | integration/account-flow.test.js | PASS |
| INT-004 | INT-04 moving UP a level brings the lecture back, and the player is now at the new level | integration/account-flow.test.js | PASS |
| INT-005 | INT-05 moving DOWN a level does not repeat a lecture they already finished | integration/account-flow.test.js | PASS |
| INT-006 | INT-06 SAVED LEVEL: next visit keeps Intermediate, not the beginner level picked at sign-up | integration/account-flow.test.js | PASS |
| INT-007 | INT-07 older data without current_level falls back to the latest finished game, then to the sign-up level | integration/account-flow.test.js | PASS |
| INT-008 | INT-08 fixed-level group (adaptive = false) always stays on its start level | integration/account-flow.test.js | PASS |
| INT-009 | INT-09 if migration-06 has not been run, the game is never blocked | integration/account-flow.test.js | PASS |
| INT-010 | INT-10 offline / database error never traps the player: go to the game | integration/account-flow.test.js | PASS |
| INT-011 | INT-11 if saving "lesson finished" fails, the tab remembers it so there is no lesson loop | integration/account-flow.test.js | PASS |
| INT-012 | INT-12 the tab backup belongs to one user: another account on the same browser still sees the lecture | integration/account-flow.test.js | PASS |
| INT-013 | INT-13 every level builds a full room: 4 puzzles, one per bug type, all at that level | integration/level-flow.test.js | PASS |
| INT-014 | INT-14 a room never repeats the puzzles from the previous game when there is another choice | integration/level-flow.test.js | PASS |
| INT-015 | INT-15 a perfect, fast win scores S rank, promotes the player, and triggers the next lecture | integration/level-flow.test.js | PASS |
| INT-016 | INT-16 a slow or sloppy win stays on the same level and needs no new lecture | integration/level-flow.test.js | PASS |
| INT-017 | INT-17 leaving early with little solved moves DOWN, and the lower lecture is not repeated | integration/level-flow.test.js | PASS |
| INT-018 | INT-18 a weak bug type gets an easier puzzle next room; the other three stay at the player level | integration/level-flow.test.js | PASS |
| INT-019 | INT-19 once the weak type is answered correctly again, it stops being weak | integration/level-flow.test.js | PASS |
| INT-020 | INT-20 the level can climb Beginner -> Intermediate -> Advanced over consecutive games, and caps at Advanced | integration/level-flow.test.js | PASS |
| INT-021 | INT-21 the bank has enough puzzles at every level for a room that avoids repeats (2+ per bug type) | integration/level-flow.test.js | PASS |

## System tests

| ID | Test | File | Result |
| --- | --- | --- | --- |
| SYS-001 | folders exist | project.test.js | PASS |
| SYS-002 | all 7 pages are at the root | project.test.js | PASS |
| SYS-003 | sql files exist: schema + migration 01 to 05 | project.test.js | PASS |
| SYS-004 | no loose code left at the root (js, css, sql, tests belong in folders) | project.test.js | PASS |
| SYS-005 | every js/ file compiles | project.test.js | PASS |
| SYS-006 | every inline <script> in every page compiles | project.test.js | PASS |
| SYS-007 | every local src= and href= in every page points to a real file | project.test.js | PASS |
| SYS-008 | require() paths inside js/ and tests/ resolve | project.test.js | PASS |
| SYS-009 | package.json "check" script lists real files | project.test.js | PASS |
| SYS-010 | every id a page script asks for exists in that page (or in the shared header) | project.test.js | PASS |
| SYS-011 | no secret keys in the code (only the public Supabase key may be in the repo) | project.test.js | PASS |
| SYS-012 | puzzle ids are unique | project.test.js | PASS |
| SYS-013 | every puzzle has all its fields | project.test.js | PASS |
| SYS-014 | every category has 2+ puzzles at every level (so rooms can rotate) | project.test.js | PASS |
| SYS-015 | bug lines point at real lines of the code | project.test.js | PASS |
| SYS-016 | every puzzle variant regex matches its own code | project.test.js | PASS |
| SYS-017 | each room object owns a known category | project.test.js | PASS |
| SYS-018 | REAL PYTHON: buggy code fails and the fixed code prints the expected output (24 puzzles) | project.test.js | PASS |
| SYS-019 | every level has a room with 4 objects, a door, and all the art files | project.test.js | PASS |
| SYS-020 | the 4 objects of a room are different things | project.test.js | PASS |
| SYS-021 | every puzzle uses the {obj} / {objfile} tokens | project.test.js | PASS |
| SYS-022 | every puzzle reads right in every room object (no loose tokens, no other room's object) | project.test.js | PASS |
| SYS-023 | js/puzzles.json is valid and is what the game loads | project.test.js | PASS |
| SYS-024 | tools/fixes.json has one fix per puzzle and never ships to the browser | project.test.js | PASS |
| SYS-025 | level promotion par times fit inside the score time window | project.test.js | PASS |
| SYS-026 | the integrity rules text on the analytics page matches integrity.js | project.test.js | PASS |
| SYS-027 | analytics runs end to end on the sample data without errors | project.test.js | PASS |
| SYS-028 | analytics rule check agrees with the real rules on sample data | project.test.js | PASS |
| SYS-029 | every sql file the pages tell the user to run exists | project.test.js | PASS |
| SYS-030 | SYS-01 every page loads (HTTP 200) and has a title | system/site.test.js | PASS |
| SYS-031 | SYS-02 every script, stylesheet and file a page asks for exists | system/site.test.js | PASS |
| SYS-032 | SYS-03 every page-to-page link and button goes to a page that exists | system/site.test.js | PASS |
| SYS-033 | SYS-04 the picture files for all 3 rooms (background + every clickable object + door) exist | system/site.test.js | PASS |
| SYS-034 | SYS-05 the puzzle file the game downloads is valid and matches the bank in memory | system/site.test.js | PASS |
| SYS-035 | SYS-06 every page the player must be logged in for uses the login check | system/site.test.js | PASS |
| SYS-036 | SYS-07 full player journey: sign up, lecture, play, level up, lecture again, play, stay saved | system/site.test.js | PASS |

Browser-only checks (Google sign-in, real Supabase, clicking through the game) are in tests/MANUAL-TEST-CASES.md.
