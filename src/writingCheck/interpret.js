// src/writingCheck/interpret.js
import { AXES, SCORE_MAX } from './constants.js';

// 4軸の数値だけを見せても意味が読み取れないので、日本語の一文に畳んで添える。
// ここは API を呼ばない純粋なルールベース。スコアの言い換えであって、
// AI が書いたかどうかの判断ではない。
const LOW = SCORE_MAX / 3;        // 1.0
const HIGH = SCORE_MAX * 2 / 3;   // 2.0
const VERY_HIGH = SCORE_MAX * 5 / 6; // 2.5
const LOW_CONFIDENCE = 0.3;

export function interpret(scores) {
  const value = (key) => scores?.[key]?.score ?? null;
  const specificity = value('lecture_specificity');
  const reflection = value('personal_reflection');
  const formulaic = value('formulaic_style');
  const accuracy = value('content_accuracy');

  if (specificity == null) return '';

  const parts = [];

  if (specificity < LOW) parts.push('授業固有の内容にほとんど触れていない');
  else if (specificity >= HIGH) parts.push('授業で扱った具体的な内容に触れている');

  if (reflection < LOW) parts.push('自分の経験への言及がほぼない');
  else if (reflection >= HIGH) parts.push('自分の理解の変化や既習内容に触れている');

  if (formulaic >= VERY_HIGH) parts.push('文体が整いすぎている');
  else if (formulaic < LOW) parts.push('文体に崩れがあり口語が混じる');

  let text = parts.length > 0 ? `${parts.join('、')}。` : '各軸とも中間で、際立った特徴はない。';

  // 正確さは AI 検出とは別の話だが、誰が何を誤解しているかは教員に直接役立つ。
  if (accuracy != null && accuracy < LOW) {
    text += ' 内容に誤りが目立つため、理解の確認が必要。';
  }

  const confidences = AXES.map((axis) => scores?.[axis.key]?.confidence).filter((c) => c != null);
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
