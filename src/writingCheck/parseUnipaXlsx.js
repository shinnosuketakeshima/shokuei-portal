// src/writingCheck/parseUnipaXlsx.js
import ExcelJS from 'exceljs';
import { SOURCE_COLUMNS } from './constants.js';

// ExcelJS のセル値は文字列とは限らない（リッチテキスト、ハイパーリンク、数式の結果）。
// どの形で来ても表示用の文字列に落とす。
function cellText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('');
  if (value.text != null) return String(value.text);
  if (value.result != null) return String(value.result);
  return '';
}

// 「伊藤 優良（イトウ ユラ）」のような1セルを漢字部分とカナ部分に割る。
// カナが無い出力形式でも壊れないよう、括弧が無ければ全体を漢字名として扱う。
function splitName(raw) {
  const text = raw.trim();
  const match = text.match(/^(.*?)[（(]([^）)]*)[）)]\s*$/);
  if (match) {
    return { kanjiName: match[1].trim(), kanaName: match[2].trim() };
  }
  return { kanjiName: text, kanaName: '' };
}

// ヘッダー行から列番号を引く。完全一致を優先し、無ければ前方一致で拾う
// （「氏名（カナ）」のように出力側が見出しに補足を付けてくることがあるため）。
function findColumn(headers, header) {
  const exact = headers.findIndex((h) => h === header);
  if (exact >= 0) return exact + 1;
  const partial = headers.findIndex((h) => h.startsWith(header));
  return partial >= 0 ? partial + 1 : null;
}

/**
 * UNIPA などが出力した提出物一覧の xlsx を読む。
 * @returns {Promise<{rows: Array, sheetName: string, hasSourceVerdict: boolean}>}
 */
export async function parseUnipaXlsx(file) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('シートが見つかりません。');

  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cellText(cell.value).trim();
  });

  const columns = {};
  for (const [key, spec] of Object.entries(SOURCE_COLUMNS)) {
    const col = findColumn(headers, spec.header);
    if (col == null && spec.required) {
      throw new Error(`「${spec.header}」列が見つかりません。UNIPA から出力したファイルか確認してください。`);
    }
    columns[key] = col;
  }

  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const studentId = cellText(row.getCell(columns.studentId).value).trim();
    const body = columns.body ? cellText(row.getCell(columns.body).value).trim() : '';

    // 学籍番号も本文も無い行は、出力ファイル末尾の空行とみなして読み飛ばす。
    if (!studentId && !body) continue;

    const { kanjiName, kanaName } = columns.name
      ? splitName(cellText(row.getCell(columns.name).value))
      : { kanjiName: '', kanaName: '' };

    rows.push({
      rowNumber,
      studentId,
      kanjiName,
      kanaName,
      body,
      sourceScore: columns.sourceScore ? cellText(row.getCell(columns.sourceScore).value).trim() : '',
      sourceVerdict: columns.sourceVerdict ? cellText(row.getCell(columns.sourceVerdict).value).trim() : ''
    });
  }

  return {
    rows,
    sheetName: sheet.name,
    hasSourceVerdict: columns.sourceVerdict != null
  };
}
