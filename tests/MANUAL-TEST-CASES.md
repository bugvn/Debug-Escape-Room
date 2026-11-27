# Manual test cases (browser + real Supabase)

The automated tests (`npm run test:report`) cannot click in a browser or talk to your real Supabase project.
Run these by hand once, fill in **Actual** and **Pass?**, and screenshot anything that fails.
How: `npm run serve`, open http://localhost:4173, and run `sql/migration-06.sql` in Supabase first.

Tester: __________  Date: __________  Browser: __________

## A. Sign-up, login, lecture gate

| ID | Steps | Expected | Actual | Pass? |
| --- | --- | --- | --- | --- |
| M-01 | Create a NEW account, pick **Beginner**, press Play | Lecture page opens first (banner "WELCOME! READ THE BEGINNER LESSONS FIRST"). No "SKIP TO GAME" button. 5 lessons (Basics + 4). | | |
| M-02 | In M-01, click through every lesson, press **START GAME** | Game room opens at the Beginner room (bedroom). | | |
| M-03 | Log out, log in again, press Play | Goes straight to the game. No lecture. | | |
| M-04 | Create a NEW account, pick **Intermediate**, press Play | Lecture shows the **Intermediate** module only (4 lessons), then the kitchen room. | | |
| M-05 | New account, type `game-room.html` straight into the address bar | You are sent to the lecture first, not the game. | | |
| M-06 | Existing account that already played before this update, press Play | Goes straight to the game (not forced to take the lecture). Lessons still open from "Review Lessons". | | |
| M-07 | "Continue with Google" with a new Google account, press Play | Consent box appears, then the lecture first. | | |
| M-08 | Wrong password on login | Clear error message, stays on login page. | | |

## B. Saved level

| ID | Steps | Expected | Actual | Pass? |
| --- | --- | --- | --- | --- |
| M-09 | Beginner account: escape fast (under 5 min, 0-1 hints, mostly right submits) | Report page shows win. Toast next time says Intermediate. | | |
| M-10 | After M-09, press Play | **Lecture appears again** with banner "NEW LEVEL: INTERMEDIATE", Intermediate lessons only, no skip. | | |
| M-11 | Finish that lecture, start the game, then **close the tab mid-game** | Nothing breaks. | | |
| M-12 | Next day (or next browser session), log in, press Play | Still **Intermediate** (kitchen), not Beginner. No lecture again. | | |
| M-13 | Play Intermediate and leave the room after solving 0-1 puzzles | Next game is Beginner, and **no lecture** (already seen). | | |
| M-14 | Open lesson page by hand (Review Lessons) on an Intermediate account | Level tabs BEGINNER / INTERMEDIATE appear. Clicking a tab switches the module. | | |

## C. Game and report

| ID | Steps | Expected | Actual | Pass? |
| --- | --- | --- | --- | --- |
| M-15 | Click an object, press RUN on buggy code | Output or error shown, no points lost. | | |
| M-16 | Submit a wrong fix, then a right fix | Wrong costs 2 points, right unlocks the object. | | |
| M-17 | Use a hint | Hint appears, hint counter goes down. | | |
| M-18 | Solve all 4 objects | Door opens, escape screen, then report page with score and rank. | | |
| M-19 | Try to paste code in the editor | Paste blocked, integrity strike counted. | | |
| M-20 | Switch tab for 3+ seconds, come back | Room blurred while away, strike counted. 3 strikes closes the room. | | |
| M-21 | Open Dashboard after 2+ games | Game history, score trend, accuracy and mistake breakdown match what you played. | | |

## D. Database checks (Supabase -> SQL Editor)

Run after M-09. Replace the email.

```sql
-- D-1: the trigger copied the level to the profile
select p.current_level, p.difficulty as signup_level, p.lesson_seen_level,
       (select next_level from game_sessions g where g.user_id = p.id and g.next_level is not null order by g.created_at desc limit 1) as last_game_next_level
from profiles p where p.id = (select id from auth.users where email = 'you@example.com');
-- expected: current_level = last_game_next_level, signup_level unchanged

-- D-2: old accounts were marked as having seen the lecture
select count(*) as played_but_lecture_unseen from profiles p
where lesson_seen_level is null and exists (select 1 from game_sessions g where g.user_id = p.id);
-- expected: 0

-- D-3: new sign-ups start with current_level = chosen level
select player_name, difficulty, current_level, lesson_seen_level from profiles order by created_at desc limit 5;
-- expected: current_level = difficulty; lesson_seen_level is null until the lecture is finished
```

| ID | Check | Expected | Actual | Pass? |
| --- | --- | --- | --- | --- |
| M-22 | D-1 | current_level matches last finished game | | |
| M-23 | D-2 | 0 rows | | |
| M-24 | D-3 | new accounts start at the picked level, lecture not yet seen | | |