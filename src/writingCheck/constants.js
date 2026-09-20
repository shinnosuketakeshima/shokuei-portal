// src/writingCheck/constants.js

// criteria の段数。functions/questions.js の SCORE_MAX と必ず揃えること。
// 片方だけ変えると正規化が狂い、要確認度が意味を持たなくなる。
export const SCORE_MAX = 3;

// 評価軸。key はサーバーの buildQuestions() が返すキーと一致していなければならない。
// direction は「スコアが高いとき、どちら寄りに見えるか」。
// 数値だけでは向きが分からず読み手が混乱するため、画面と書き出しの両方で必ず添える。
export const AXES = [
  {
    key: 'lecture_specificity',
    label: '授業固有の具体性',
    short: '具体性',
    direction: '人間らしい',
    description: 'その回の授業で実際に扱われた内容に、どれだけ具体的に踏み込んでいるか'
  },
  {
    key: 'personal_reflection',
    label: '自分の経験・反応',
    short: '経験',
    direction: '人間らしい',
    description: '書き手自身の固有の経験や、理解の変化にどれだけ触れているか'
  },
  {
    key: 'formulaic_style',
    label: '文体の定型性',
    short: '定型性',
    direction: 'AI的',
    description: '文章がどれだけ整っていて均質か（高いほど教科書的）'
  },
  {
    key: 'content_accuracy',
    label: '内容の正確さ',
    short: '正確さ',
    direction: null, // AI らしさとは独立。理解度の確認用
    description: '書かれている内容が学術的にどれだけ正確か'
  }
];

// 要確認度（参考）の重み。具体性と経験は「低いほど要確認」なので反転して使う。
// これは AI 利用の確率ではなく、教員が読む順番を決めるための並べ替え指標にすぎない。
export const REVIEW_WEIGHTS = [
  { key: 'lecture_specificity', weight: 0.35, invert: true },
  { key: 'personal_reflection', weight: 0.35, invert: true },
  { key: 'formulaic_style', weight: 0.30, invert: false }
];

// 読み込む列。ヘッダー名で探すので、出力側で列順が変わっても動く。
// AI疑いスコア / AI判定 は元ファイルに最初から入っている値で、この画面では
// 「元データ」と呼ぶ。どのシステムが付けた値か断定できないため、製品名は出さない。
export const SOURCE_COLUMNS = {
  studentId: { header: '学籍番号', required: true },
  name: { header: '氏名', required: false },
  body: { header: '提出内容', required: true },
  sourceScore: { header: 'AI疑いスコア', required: false },
  sourceVerdict: { header: 'AI判定', required: false }
};

// 本文の送信上限。functions 側の MAX_TEXT_LENGTH と揃えること。
export const MAX_BODY_LENGTH = 8000;

// 同時に投げるリクエスト数。上限は 1,200 req/分なので余裕がある。
export const CONCURRENCY = 5;

// 入力 100万トークンあたりの単価（USD）。実行後の概算費用表示にのみ使う。
export const USD_PER_MTOK = 0.042;
