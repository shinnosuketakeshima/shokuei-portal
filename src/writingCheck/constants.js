// src/writingCheck/constants.js

// criteria の段数。functions/questions.js の SCORE_MAX と必ず揃えること。
// 片方だけ変えると正規化が狂い、要確認度が意味を持たなくなる。
export const SCORE_MAX = 3;

// 軸の共通フィールド:
//   direction  スコアが高いときにどちら寄りに見えるか。null は判定材料にしない参考軸
//   lowPhrase  / highPhrase  読み解き文の材料。null なら言及しない
//   warnLow    低いときだけ必ず添える一文
//
// 感想文とレポートで軸を分けるのは、文章の種類によって「良い書き方」が違うため。
// 実験レポートは型どおりに書くのが正しいので、文体の定型性は判定材料にならない。

const AXIS_ACCURACY = {
  key: 'content_accuracy',
  label: '内容の正確さ',
  short: '正確さ',
  direction: null,
  description: '書かれている内容が学術的にどれだけ正確か',
  lowPhrase: null,
  highPhrase: null,
  warnLow: '内容に誤りが目立つため、理解の確認が必要。'
};

// AI らしさの三大特徴「整いすぎ・無難すぎ・丁寧すぎ」。
// 1つの軸にまとめず独立させているのは、どれが効いているのかが分かるようにするため。
// 文章の種類が変わっても兆候そのものは共通なので、両モードで同じ軸を使う
// （サーバー側の criteria だけを種類ごとに書き分ける）。
const EVEN_STRUCTURE = {
  key: 'even_structure',
  label: '整いすぎ',
  short: '整いすぎ',
  direction: 'AI的',
  description: '見出し・箇条書き・「まず／次に／最後に」が多く、段落や文の長さも一定で揺れが少ない',
  lowPhrase: '構成や文の長さに揺れがある',
  highPhrase: '構成も文の長さも整いすぎていて揺れがない'
};

const GENERIC_PHRASING = {
  key: 'generic_phrasing',
  label: '無難すぎ',
  short: '無難すぎ',
  direction: 'AI的',
  description: '「重要です」「効果的です」「期待されます」など、もっともらしいが具体性を欠く言い回しが多い',
  lowPhrase: '具体的に言い切っている箇所が多い',
  highPhrase: '無難で具体性を欠く言い回しが目立つ'
};

const OVER_EXPLANATION = {
  key: 'over_explanation',
  label: '丁寧すぎ',
  short: '丁寧すぎ',
  direction: 'AI的',
  description: '自明なことまで補足し、「まとめると」で同じ内容を繰り返すなど、削っても意味の変わらない文が多い',
  lowPhrase: null,
  highPhrase: '自明な補足や同じ内容の繰り返しが多い'
};

const REFLECTION_AXES = [
  {
    key: 'lecture_specificity',
    label: '授業固有の具体性',
    short: '具体性',
    direction: '人間らしい',
    description: 'その回の授業で実際に扱われた内容に、どれだけ具体的に踏み込んでいるか',
    lowPhrase: '授業固有の内容にほとんど触れていない',
    highPhrase: '授業で扱った具体的な内容に触れている'
  },
  {
    key: 'personal_reflection',
    label: '自分の経験・反応',
    short: '経験',
    direction: '人間らしい',
    description: '書き手自身の固有の経験や、理解の変化にどれだけ触れているか',
    lowPhrase: '自分の経験への言及がほぼない',
    highPhrase: '自分の理解の変化や既習内容に触れている'
  },
  EVEN_STRUCTURE,
  GENERIC_PHRASING,
  OVER_EXPLANATION,
  AXIS_ACCURACY
];

const REPORT_AXES = [
  {
    key: 'observed_specifics',
    label: '実測値・固有データへの言及',
    short: '実測値',
    direction: '人間らしい',
    description: '体重や臓器の状態など、その日その班でしか得られない記述があるか',
    lowPhrase: 'その日その班でしか得られない実測値や観察の記述がない',
    highPhrase: '実測値や自分たちの観察に具体的に触れている'
  },
  {
    key: 'discussion_grounding',
    label: '考察と結果の紐づき',
    short: '考察',
    direction: '人間らしい',
    description: '考察が自分の観察結果に基づくか、教科書的な一般論にとどまるか',
    lowPhrase: '考察が一般論にとどまり、自分の結果と結びついていない',
    highPhrase: '自分の観察結果に基づいて考察している'
  },
  EVEN_STRUCTURE,
  GENERIC_PHRASING,
  OVER_EXPLANATION,
  AXIS_ACCURACY
];

// 要確認度（参考）の重み。「人間らしい」軸は低いほど要確認なので反転して使う。
// これは AI 利用の確率ではなく、教員が読む順番を決めるための並べ替え指標にすぎない。
export const MODES = {
  reflection: {
    key: 'reflection',
    label: '授業の感想文',
    source: 'xlsx',
    axes: REFLECTION_AXES,
    weights: [
      { key: 'lecture_specificity', weight: 0.25, invert: true },
      { key: 'personal_reflection', weight: 0.25, invert: true },
      { key: 'even_structure', weight: 0.20, invert: false },
      { key: 'generic_phrasing', weight: 0.15, invert: false },
      { key: 'over_explanation', weight: 0.15, invert: false }
    ]
  },
  report: {
    key: 'report',
    label: '実験レポート',
    source: 'zip',
    axes: REPORT_AXES,
    weights: [
      // レポートでは実測値への言及がいちばん強い手がかりなので、人間側に重みを寄せる。
      { key: 'observed_specifics', weight: 0.30, invert: true },
      { key: 'discussion_grounding', weight: 0.25, invert: true },
      { key: 'even_structure', weight: 0.15, invert: false },
      { key: 'generic_phrasing', weight: 0.15, invert: false },
      { key: 'over_explanation', weight: 0.15, invert: false }
    ]
  }
};

export const DEFAULT_MODE = 'reflection';

// 読み込む列。ヘッダー名で探すので、出力側で列順が変わっても動く。
// AI疑いスコア / AI判定 は元ファイルに最初から入っている値で、この画面では
// 「元データ」と呼ぶ。どのシステムが付けた値か断定できないため、製品名は出さない。
// zip 同梱の名簿には提出内容も判定も無いので、必須にできるのは学籍番号だけ。
export const SOURCE_COLUMNS = {
  studentId: { header: '学籍番号', required: true },
  name: { header: '氏名', required: false },
  body: { header: '提出内容', required: false },
  sourceScore: { header: 'AI疑いスコア', required: false },
  sourceVerdict: { header: 'AI判定', required: false }
};

// 本文の送信上限。functions 側の MAX_TEXT_LENGTH と必ず同じ値にすること。
// 実験レポートは感想文よりずっと長い（実測で1,500〜4,800字）。
export const MAX_BODY_LENGTH = 20000;

// 上限を超えたときに冒頭と末尾それぞれで残す長さ。合計が MAX_BODY_LENGTH を超えないこと。
// 単純に末尾を捨てると、目的→方法→結果→考察と進むレポートでは考察が丸ごと消え、
// 「考察と結果の紐づき」軸が機能しなくなるため、両端を残して中間を落とす。
export const TRUNCATE_HEAD_LENGTH = 12000;
export const TRUNCATE_TAIL_LENGTH = 7000;
export const TRUNCATE_MARKER = '\n\n（中略）\n\n';

// 同時に投げるリクエスト数。上限は 1,200 req/分なので余裕がある。
export const CONCURRENCY = 5;

// 入力 100万トークンあたりの単価（USD）。実行後の概算費用表示にのみ使う。
export const USD_PER_MTOK = 0.042;

// 抽出できた文字数がこれ未満なら、本文が取れていないとみなす。
// 画像だけのPDF（スキャンや写真貼り付け）ではテキスト層が無く、
// 空文字を採点すると無意味なスコアが出るため、解析対象から外して警告する。
export const MIN_EXTRACTED_LENGTH = 200;
