// src/writingCheck/anonymize.js
import { TRUNCATE_HEAD_LENGTH, TRUNCATE_TAIL_LENGTH, TRUNCATE_MARKER } from './constants.js';

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

// 学籍番号は 25NB031 形式。学生が桁を打ち間違えた 25NB0009 のような表記も
// 実データにあるので、末尾の数字は3〜4桁を許す。
const STUDENT_ID_PATTERN = /\d{2}[A-Za-z]{2}\d{3,4}/g;

// レポートでは「報告者25NB033齋藤麻衣」「共同実験者25NB001青木蘭」のように
// 学籍番号の直後に氏名が来る。共同実験者は提出者名簿に載っていないため、
// 姓＋名の照合だけでは伏せられない。学籍番号に続く漢字・カタカナの並びを
// 氏名とみなして落とす、名簿に依存しない保険。
//
// 2〜6文字に制限するのは、氏名の後に続く本文まで巻き込まないため。
// 漢字のみ・カタカナのみに限り、ひらがなは含めない（「さんと」のような
// 助詞まで消してしまうため）。
// 氏名とみなす並び。実データで確認した形をすべて拾う必要がある:
//   浅田 真登香   姓と名が空白で分かれている（PDF から抽出するとこの形が多い）
//   大磯めぐみ    名がひらがな
//   後藤莉々香    区切りなし
// 姓だけを消して名が残る事故を防ぐため、空白をまたいだ2つ目の漢字列まで取り込む。
//
// 区切りに改行を含めないのは、学籍番号が行末に来たときに次の行の本文
// （「実験日」など）まで巻き込まないため。
// 短すぎる一致は本文を壊すので、長さの下限は replace のコールバック側で弾く。
const SPACE = '[^\\S\\n]';
const NAME_SHAPE =
  `[\\u4E00-\\u9FFF]{1,6}(?:${SPACE}{1,4}[\\u4E00-\\u9FFF]{1,6})?[\\u3040-\\u309F]{0,4}`
  + `|[\\u30A0-\\u30FF]{1,6}(?:${SPACE}{1,4}[\\u30A0-\\u30FF]{1,6})?`;

const MIN_NAME_LENGTH = 2;

const ID_FOLLOWED_BY_NAME = new RegExp(`(\\d{2}[A-Za-z]{2}\\d{3,4})${SPACE}*(${NAME_SHAPE})`, 'g');

// 「氏名」「学籍番号」などの見出し語は、学籍番号の直後に来ても人名ではない。
// 伏せても実害はないが、本文が読みにくくなるので除く。
const LABEL_WORDS = new Set(['氏名', '学籍', '番号', '学籍番号', '報告者', '共同実験者', '学生']);

// 共同実験者を並べるとき、2人目以降は学籍番号の頭を省いて
// 「25NB005池田瑠夏015大蝶理子021金子美音」と書く学生がいる（実データで確認）。
// 数字3〜4桁＋氏名を単独で拾うと「1200倍率」のような記述まで巻き込むため、
// すでに伏せた並びの直後に続くものだけを、連鎖的に追いかけて消す。
const CHAINED_NAME = new RegExp(
  `(［学籍番号］［氏名］)[^\\S\\n、,／/・]*[、,／/・]?${SPACE}*(\\d{3,4})${SPACE}*(${NAME_SHAPE})`,
  'g'
);
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

  // 学籍番号＋氏名の並びを先に処理する。学籍番号だけを先に伏せてしまうと、
  // 直後が氏名だという手がかりが消えてしまうため、順序を入れ替えてはいけない。
  const redactedPair = `${STUDENT_ID_PLACEHOLDER}${NAME_PLACEHOLDER}`;
  const pairHits = [];

  const isName = (candidate) => {
    const compact = candidate.replace(/\s/g, '');
    // 見出し語は人名ではないし、1文字では本文の一部を巻き込むだけ。
    return compact.length >= MIN_NAME_LENGTH && !LABEL_WORDS.has(compact);
  };

  text = text.replace(ID_FOLLOWED_BY_NAME, (match, id, name) => {
    if (!isName(name)) return `${STUDENT_ID_PLACEHOLDER}${name}`;
    pairHits.push(match);
    return redactedPair;
  });

  // 省略形の並びを連鎖的に追う。1回の replace では、置換して生まれた
  // 「［学籍番号］［氏名］」の直後をもう一度見に行けないため繰り返す。
  for (let pass = 0; pass < 10; pass += 1) {
    let changed = false;
    text = text.replace(CHAINED_NAME, (match, head, digits, name) => {
      if (!isName(name)) return match;
      changed = true;
      pairHits.push(`${digits}${name}`);
      return `${head}${redactedPair}`;
    });
    if (!changed) break;
  }

  if (pairHits.length > 0) {
    hits.push({ from: pairHits.join(', '), to: redactedPair, count: pairHits.length });
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
    return {
      studentId: row.studentId,
      rowNumber: row.rowNumber,
      ...truncate(text, maxLength),
      hits
    };
  });
}

/**
 * 上限を超える本文を、冒頭と末尾を残して切り詰める。
 * 末尾を捨てる単純な切り方をしないのは、レポートが 目的→方法→結果→考察 の順に
 * 進むため、考察がまるごと落ちて「考察と結果の紐づき」軸が測れなくなるから。
 */
export function truncate(text, maxLength) {
  if (text.length <= maxLength) return { text, truncated: false };

  const head = text.slice(0, TRUNCATE_HEAD_LENGTH);
  const tail = text.slice(-TRUNCATE_TAIL_LENGTH);
  return { text: `${head}${TRUNCATE_MARKER}${tail}`, truncated: true };
}
