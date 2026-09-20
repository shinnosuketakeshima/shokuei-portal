// src/writingCheck/anonymize.js

// 本文以外の列（氏名・学籍番号・IPアドレス・性別など）はそもそも送信しない。
// ここで落とすのは、学生が本文中に自分や教員の名前を書いてしまった分。
//
// 最重要の制約: 氏名は必ず「姓＋名」をひとまとまりで照合する。
// 姓だけ・名だけで置換すると本文が壊れる。実データで確認済みの例として、
// 名簿に「原 和美」がいるため、別の学生が書いた「筋肉の原理になる」が
// 「筋肉の［氏名］理になる」に化けてスコアが歪む。
// 「音」「花」「咲」「愛」なども名前用字としてよく使われ、同じ事故が起きる。

const NAME_PLACEHOLDER = '［氏名］';
const STUDENT_ID_PLACEHOLDER = '［学籍番号］';
const CONTACT_PLACEHOLDER = '［連絡先］';

const STUDENT_ID_PATTERN = /\d{2}[A-Za-z]{2}\d{3}/g;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// 区切りのある形と携帯番号だけに絞る。数字の並びを無条件に消すと、
// 本文中の「ATPが3つ」「26問」のような数値まで巻き込むため。
const PHONE_PATTERN = /0\d{1,4}-\d{1,4}-\d{3,4}|0[789]0\d{8}/g;

// 連結形の最低長。「原和美」は3文字で安全だが、1文字姓＋1文字名の2文字連結は
// 普通の熟語と衝突しうるので、区切りのある形だけを使う。
const MIN_JOINED_LENGTH = 3;

function splitTokens(name) {
  // JavaScript の \s は全角スペース（U+3000）も含むので、姓名の区切りはこれで足りる。
  return name.trim().split(/\s+/).filter(Boolean);
}

// 1つの氏名から照合する文字列を作る。全角スペース／半角スペース／区切りなしの3形のみ。
// トークンが1つしか無い（姓しか入っていない）氏名は、単独一致になるので何も返さない。
function nameVariants(name) {
  const tokens = splitTokens(name);
  if (tokens.length < 2) return [];

  const joined = tokens.join('');
  const variants = [tokens.join('　'), tokens.join(' ')];
  if (joined.length >= MIN_JOINED_LENGTH) variants.push(joined);
  return variants;
}

/**
 * 名簿の各行から、本文中で伏せるべき氏名の一覧を作る。
 * @param {Array<{kanjiName: string, kanaName: string}>} rows
 * @param {string[]} extraNames 利用者が入力した追加の氏名（教員名など）
 */
export function buildNameTargets(rows, extraNames = []) {
  const targets = new Set();

  for (const row of rows) {
    for (const variant of nameVariants(row.kanjiName)) targets.add(variant);
    for (const variant of nameVariants(row.kanaName)) targets.add(variant);
  }

  // 利用者が明示的に入力した名前は、姓だけでも本人の意図どおり置換する。
  // ただし1文字は誤爆が大きすぎるので受け付けない。
  for (const name of extraNames) {
    const trimmed = name.trim();
    if (trimmed.length >= 2) targets.add(trimmed);
  }

  // 長いものから消す。「伊藤 優良」を先に消さないと「伊藤」だけが残る形になる。
  return [...targets].sort((a, b) => b.length - a.length);
}

function countOccurrences(text, target) {
  return text.split(target).length - 1;
}

/**
 * 本文から個人情報を取り除く。
 * 削除ではなくプレースホルダ置換にしてあるのは、文が途切れると文体や正確さの
 * スコアが歪むため。
 * @returns {{text: string, hits: Array<{from: string, to: string, count: number}>}}
 */
export function anonymizeBody(body, nameTargets) {
  let text = body;
  const hits = [];

  for (const target of nameTargets) {
    const count = countOccurrences(text, target);
    if (count > 0) {
      text = text.split(target).join(NAME_PLACEHOLDER);
      hits.push({ from: target, to: NAME_PLACEHOLDER, count });
    }
  }

  for (const [pattern, placeholder] of [
    [STUDENT_ID_PATTERN, STUDENT_ID_PLACEHOLDER],
    [EMAIL_PATTERN, CONTACT_PLACEHOLDER],
    [PHONE_PATTERN, CONTACT_PLACEHOLDER]
  ]) {
    const matches = text.match(pattern);
    if (matches) {
      text = text.replace(pattern, placeholder);
      hits.push({ from: matches.join(', '), to: placeholder, count: matches.length });
    }
  }

  return { text, hits };
}

/**
 * 送信用のデータを組み立てる。ここで返った text 以外は一切ネットワークに出さない。
 */
export function buildPayloads(rows, extraNames, maxLength) {
  const nameTargets = buildNameTargets(rows, extraNames);

  return rows.map((row) => {
    const { text, hits } = anonymizeBody(row.body, nameTargets);
    const truncated = text.length > maxLength;
    return {
      studentId: row.studentId,
      rowNumber: row.rowNumber,
      text: truncated ? text.slice(0, maxLength) : text,
      truncated,
      hits
    };
  });
}
