// src/writingCheck/scoring.js
import { SCORE_MAX } from './constants.js';
import { interpret, rankLabel } from './interpret.js';

// サーバーが返す score は 0〜SCORE_MAX の実数（段の間に落ちることがある）。
export function normalize(score) {
  return score / SCORE_MAX;
}

/**
 * 並べ替え用の合成指標「要確認度（参考）」。0〜1。
 * AI 利用の確率ではない。文章の種類ごとの重み（mode.weights）で合成しているだけ。
 */
export function reviewScore(answers, weights) {
  let total = 0;
  for (const { key, weight, invert } of weights) {
    const answer = answers?.[key];
    if (!answer) return null;
    const value = normalize(answer.score);
    total += weight * (invert ? 1 - value : value);
  }
  return total;
}

/**
 * 解析結果を表示・書き出し用の行に畳む。元の行データ（氏名など）と突き合わせる。
 * @param {object} mode MODES の要素。軸と重みを決める
 */
export function buildResultRows(sourceRows, analyses, mode) {
  const rows = sourceRows.map((row, index) => {
    const analysis = analyses[index];
    const answers = analysis?.status === 'ok' ? analysis.answers : null;

    const scores = {};
    for (const axis of mode.axes) {
      const answer = answers?.[axis.key];
      scores[axis.key] = answer ? { score: answer.score, confidence: answer.confidence } : null;
    }

    return {
      ...row,
      status: analysis?.status ?? 'pending',
      error: analysis?.error ?? null,
      truncated: analysis?.truncated ?? false,
      scores,
      review: answers ? reviewScore(answers, mode.weights) : null,
      reading: answers ? interpret(scores, mode.axes) : '',
      inputTokens: analysis?.usage?.input_tokens ?? 0
    };
  });

  return markDivergence(addRanks(rows));
}

// 要確認度の生の値（0.63 など）は基準が無くて読めない。集団内で何位かに直す。
// 1番目＝最も要確認度が高い。解析済みの行だけで順位を付ける。
function addRanks(rows) {
  const ranked = rows
    .filter((row) => row.review != null)
    .sort((a, b) => b.review - a.review);

  const rankOf = new Map();
  ranked.forEach((row, index) => rankOf.set(row, index + 1));
  const total = ranked.length;

  return rows.map((row) => {
    const rank = rankOf.get(row) ?? null;
    // 行のフィールド名は rankBand。interpret.js から import している関数 rankLabel と
    // 同名にすると、分割代入で取り違える事故が起きるため避ける。
    return { ...row, rank, cohortSize: total, rankBand: rankLabel(rank, total) };
  });
}

// 集団内での順位（0〜1）。値そのものではなく順位で比べるための下ごしらえ。
function percentileRanks(values) {
  const present = values
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.value != null && Number.isFinite(entry.value))
    .sort((a, b) => a.value - b.value);

  const ranks = new Array(values.length).fill(null);
  present.forEach((entry, order) => {
    ranks[entry.index] = present.length <= 1 ? 0.5 : order / (present.length - 1);
  });
  return ranks;
}

// 元データの疑いスコア（0〜100）と要確認度（0〜1）は尺度も作り方も違うので、
// 値や閾値では比べない。集団内の順位が大きく食い違う行にだけ印を付ける。
//
// 判定ラベル（「判断困難」など）で比べないのは、「判断困難」が元データ側の
// 判断保留であって疑いではないため。実データでは39件中15件が「判断困難」で
// 「AI作成」は0件なので、ラベルで比べると大多数に印が付いて意味をなさない。
//
// 順位差の閾値。両者が無相関なら印が付く割合は (1 - 閾値)^2 になる。
// 0.5 だと 25%（39件中10件）に付いてしまい、目印として機能しない。
// 0.7 なら約9%（39件中3〜4件）に収まり、「読んで確かめる行」として扱える。
const DIVERGENCE_THRESHOLD = 0.7;

function markDivergence(rows) {
  const ownRanks = percentileRanks(rows.map((row) => row.review));
  const sourceRanks = percentileRanks(
    rows.map((row) => {
      const value = Number(row.sourceScore);
      return row.sourceScore !== '' && Number.isFinite(value) ? value : null;
    })
  );

  return rows.map((row, index) => ({
    ...row,
    divergent:
      ownRanks[index] != null &&
      sourceRanks[index] != null &&
      Math.abs(ownRanks[index] - sourceRanks[index]) > DIVERGENCE_THRESHOLD
  }));
}

export function sortRows(rows, sortKey, direction) {
  const sign = direction === 'asc' ? 1 : -1;

  const valueOf = (row) => {
    if (sortKey === 'studentId') return row.studentId;
    if (sortKey === 'kanjiName') return row.kanjiName;
    if (sortKey === 'review') return row.review;
    if (sortKey === 'sourceScore') return Number(row.sourceScore) || null;
    if (sortKey === 'sourceVerdict') return row.sourceVerdict;
    return row.scores?.[sortKey]?.score ?? null;
  };

  return [...rows].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);
    // 未解析・失敗行は値を持たないので、方向によらず常に末尾へ送る。
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === 'string') return sign * left.localeCompare(right, 'ja');
    return sign * (left - right);
  });
}
