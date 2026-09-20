// src/writingCheck/parseSubmissionZip.js
import PizZip from 'pizzip';
import { extractText } from './extractText.js';
import { parseUnipaXlsx } from './parseUnipaXlsx.js';
import { MIN_EXTRACTED_LENGTH } from './constants.js';

// UNIPA のファイル提出は「学籍番号_連番_連番_任意のタイトル.拡張子」で出てくる。
// 例: 25NB034_1_2_解剖生理学実験 ラットの解剖.pdf
const FILE_NAME_PATTERN = /^(\d{2}[A-Za-z]{2}\d{3,4})_/;

const DOCUMENT_PATTERN = /\.(pdf|docx)$/i;

function baseName(path) {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

// 同じ学生が Word と PDF の両方を出すことがある（実データで確認済み）。
// 中身は同じなので1件だけ採点する。docx を優先するのは、テキスト抽出が
// レイアウト依存の PDF より安定しているため。
function preferredFile(a, b) {
  const isDocx = (entry) => /\.docx$/i.test(entry.fileName);
  if (isDocx(a) !== isDocx(b)) return isDocx(a) ? a : b;
  return a.fileName <= b.fileName ? a : b;
}

/**
 * 提出ファイルをまとめた zip を読む。
 * 同梱の xlsx は名簿としてのみ使い（提出内容の列は無い）、
 * 本文は各 PDF / docx から抽出する。
 *
 * @param {File} file
 * @param {(done: number, total: number) => void} onProgress
 */
export async function parseSubmissionZip(file, onProgress) {
  const zip = new PizZip(await file.arrayBuffer());

  const documents = [];
  let rosterEntry = null;

  for (const path of Object.keys(zip.files)) {
    const entry = zip.files[path];
    if (entry.dir) continue;
    const fileName = baseName(path);
    if (fileName.startsWith('.') || fileName.startsWith('__MACOSX')) continue;

    if (DOCUMENT_PATTERN.test(fileName)) {
      const match = fileName.match(FILE_NAME_PATTERN);
      // 学籍番号で始まらないファイルは誰の提出か特定できないので採点しない。
      if (match) documents.push({ path, fileName, studentId: match[1].toUpperCase() });
    } else if (/\.xlsx$/i.test(fileName) && !rosterEntry) {
      rosterEntry = { path, fileName };
    }
  }

  if (documents.length === 0) {
    throw new Error('学籍番号で始まる PDF / Word ファイルが zip の中に見つかりません。');
  }

  // 名簿から氏名を引く。同梱されていなくても、ファイル名の学籍番号だけで動く。
  const roster = new Map();
  if (rosterEntry) {
    try {
      const buffer = zip.files[rosterEntry.path].asArrayBuffer();
      const { rows } = await parseUnipaXlsx({ arrayBuffer: async () => buffer });
      for (const row of rows) roster.set(row.studentId.toUpperCase(), row);
    } catch (err) {
      // 名簿が読めなくても採点自体はできる。氏名が空欄になるだけ。
      console.error('Error reading roster inside zip:', err);
    }
  }

  // 1学生1件に畳む
  const byStudent = new Map();
  for (const doc of documents) {
    const existing = byStudent.get(doc.studentId);
    if (existing) {
      const keep = preferredFile(existing, doc);
      const dropped = keep === existing ? doc : existing;
      byStudent.set(doc.studentId, { ...keep, duplicateOf: [...(existing.duplicateOf ?? []), dropped.fileName] });
    } else {
      byStudent.set(doc.studentId, doc);
    }
  }

  const entries = [...byStudent.values()].sort((a, b) => a.studentId.localeCompare(b.studentId));
  const rows = [];

  for (const [index, entry] of entries.entries()) {
    const rosterRow = roster.get(entry.studentId);
    let body = '';
    let extractError = null;

    try {
      body = await extractText(entry.fileName, zip.files[entry.path].asArrayBuffer());
    } catch (err) {
      console.error(`Error extracting text from ${entry.fileName}:`, err);
      extractError = '本文を取り出せませんでした。';
    }

    // 画像だけの PDF（スキャンや写真の貼り付け）はテキスト層が無い。
    // 空文字のまま採点すると無意味なスコアが出るので、ここで弾いて警告に回す。
    if (!extractError && body.replace(/\s/g, '').length < MIN_EXTRACTED_LENGTH) {
      extractError = '本文がほとんど取り出せませんでした。画像だけのPDFの可能性があります。';
    }

    rows.push({
      rowNumber: index + 1,
      studentId: entry.studentId,
      kanjiName: rosterRow?.kanjiName ?? '',
      kanaName: rosterRow?.kanaName ?? '',
      fileName: entry.fileName,
      duplicateOf: entry.duplicateOf ?? [],
      body: extractError ? '' : body,
      extractError,
      sourceScore: '',
      sourceVerdict: ''
    });

    onProgress?.(index + 1, entries.length);
  }

  return { rows, rosterFound: rosterEntry != null };
}
