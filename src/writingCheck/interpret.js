// src/writingCheck/interpret.js
import { SCORE_MAX } from './constants.js';

// 軸の数値だけを見せても意味が読み取れないので、日本語の一文に畳んで添える。
// ここは API を呼ばない純粋なルールベース。スコアの言い換えであって、
// AI が書いたかどうかの判断ではない。
//
// 文言は軸の定義（constants.js の lowPhrase / highPhrase / warnLow）に持たせてある。
// ここに文章の種類ごとの分岐を書くと、軸を足すたびに2か所直すことになるため。
const LOW = SCORE_MAX / 3;           // 1.0
const HIGH = (SCORE_MAX * 2) / 3;    // 2.0
const VERY_HIGH = (SCORE_MAX * 5) / 6; // 2.5
const LOW_CONFIDENCE = 0.3;

export function interpret(scores, axes) {
  const values = axes.map((axis) => ({ axis, entry: scores?.[axis.key] }));
  if (values.every(({ entry }) => !entry)) return '';

  const parts = [];
  const warnings = [];

  for (const { axis, entry } of values) {
    if (!entry) continue;

    // 「AI的」側の軸は、はっきり高いときだけ言及する。中くらいで指摘すると
    // 型どおりに書けている文章を不必要に疑うことになる。
    const highThreshold = axis.direction === 'AI的' ? VERY_HIGH : HIGH;

    if (axis.lowPhrase && entry.score < LOW) parts.push(axis.lowPhrase);
    else if (axis.highPhrase && entry.score >= highThreshold) parts.push(axis.highPhrase);

    if (axis.warnLow && entry.score < LOW) warnings.push(axis.warnLow);
  }

  // 軸が6つあるので、該当を全部並べると一文が読めない長さになる。
  // axes の定義順（人間側の軸が先）に3つまで拾う。
  let text = parts.length > 0 ? `${parts.slice(0, 3).join('、')}。` : '各軸とも中間で、際立った特徴はない。';
  for (const warning of warnings) text += ` ${warning}`;

  const confidences = values.map(({ entry }) => entry?.confidence).filter((c) => c != null);
  if (confidences.length > 0 && Math.min(...confidences) < LOW_CONFIDENCE) {
    text += ' ただし判定の信頼度が低い。';
  }

  return text;
}

// 順位の言い換え。1件だけ試したときに「1人中1位」と出ても意味がないので、
// 母数が小さいうちは順位を出さない。
const MIN_COHORT = 5;

export function rankLabel(rank, total) {
  if (rank == null || total < MIN_COHORT) return null;
  if (rank <= total * 0.25) return `上位${Math.round((rank / total) * 100)}%`;
  if (rank >= total * 0.75) return `下位${Math.round(((total - rank + 1) / total) * 100)}%`;
  return '中位';
}
