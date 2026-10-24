export const TOP_SCORES_SIZE = 10;

function cleanEntry(entry) {
  const score = Math.floor(Number(entry?.score));
  if (!Number.isFinite(score) || score <= 0) {
    return null;
  }
  const streak = Math.max(0, Math.floor(Number(entry.streak)) || 0);
  return {
    id: entry.id == null ? null : String(entry.id),
    score,
    streak,
    date: typeof entry.date === 'string' ? entry.date : null
  };
}

// Highest first; an older entry stays ahead of a newer one with the same score.
export function normalizeTopScores(raw, { bestScore = 0, bestStreak = 0 } = {}) {
  const list = (Array.isArray(raw) ? raw : []).map(cleanEntry).filter(Boolean);
  if (!list.length && bestScore > 0) {
    // Players from before the list existed keep their best score as #1.
    list.push({ id: null, score: bestScore, streak: bestStreak, date: null });
  }
  return list.sort((a, b) => b.score - a.score).slice(0, TOP_SCORES_SIZE);
}

// Adds a finished run and returns its rank (1-based), or 0 if it did not make the list.
// A run that ended, was continued and ended again replaces its own earlier entry.
export function insertScore(list, entry) {
  const clean = cleanEntry(entry);
  const others = list.filter((item) => clean?.id == null || item.id !== clean.id);
  if (!clean) {
    return { list: others, rank: 0 };
  }
  let index = others.findIndex((item) => clean.score > item.score);
  if (index === -1) {
    index = others.length;
  }
  const next = [...others.slice(0, index), clean, ...others.slice(index)].slice(0, TOP_SCORES_SIZE);
  return { list: next, rank: index < TOP_SCORES_SIZE ? index + 1 : 0 };
}

// Rank the live score would take among the scores at the start of the run (1-based, 0 = below them).
export function liveRank(topScores, score) {
  const index = topScores.findIndex((value) => score > value);
  return index === -1 ? 0 : index + 1;
}
