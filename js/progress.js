// LEVEL PROGRESS + LESSON GATE. Pure functions (no page code, no database) so node --test can check them.
// Loaded before js/supabase-config.js on every page that sends the player to the game.
//
// A player has to read the lesson module before playing when they have never seen it, or when their level
// is higher than the highest level whose lesson they have already finished. Moving DOWN a level never
// brings the lesson back (they already saw that material).

const LEVEL_ORDER = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

// 0, 1, 2 for a real level. -1 for null / unknown (for seenLevel: "never saw any lesson").
function levelRank(level) { return LEVEL_ORDER.indexOf(level); }

// the higher of two levels; ignores a missing or unknown one
function higherLevel(a, b) { return levelRank(b) > levelRank(a) ? b : a; }

// level = where the player is now, seenLevel = highest lesson level they finished (null = none yet)
function lessonDue(level, seenLevel) {
  const now = Math.max(0, levelRank(level));   // unknown level counts as BEGINNER
  return now > levelRank(seenLevel);
}

if (typeof module !== 'undefined') module.exports = { LEVEL_ORDER, levelRank, higherLevel, lessonDue };