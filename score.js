// One scoring formula for the report page and the dashboard.
// 20 per solved puzzle (max 80) + time bonus (max 20, escaped games only)
// - 3 per hint - 2 per wrong SUBMIT (capped at 20). Test runs never cost points.
const PAR_SEC = 900;
const RANKS = [[90,'S','MASTER CODER'],[75,'A','SENIOR DEBUGGER'],[60,'B','JUNIOR DEBUGGER'],[40,'C','ROOKIE'],[0,'D','NEEDS PRACTICE']];

// rows saved before the "kind" column existed count as submits
function submitsOf(subs) { return subs.filter((x) => (x.kind || 'submit') === 'submit'); }

function scoreOf(s, subs) {
  const bad = submitsOf(subs).filter((x) => !x.is_correct).length;
  const bonus = s.result === 'won' ? Math.round(20 * s.time_left_sec / Math.max(1, s.time_total_sec)) : 0;
  const raw = s.solved_count * 20 + bonus - s.hints_used * 3 - Math.min(20, bad * 2);
  return Math.max(0, Math.min(100, raw));
}
function rankOf(score) { return RANKS.find((r) => score >= r[0]); }