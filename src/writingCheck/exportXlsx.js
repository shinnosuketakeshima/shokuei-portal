// src/writingCheck/exportXlsx.js
import ExcelJS from 'exceljs';
// 軸は文章の種類（mode）によって違うので、定数を直接読まず引数で受け取る。

// 列を足すときは、ここと addRow() に渡すオブジェクトの両方を直すこと。
function buildColumns(axes, hasSourceVerdict) {
  const columns = [
    { header: '学籍番号', key: 'studentId', width: 12 },
    { header: '氏名', key: 'kanjiName', width: 16 }
  ];
  columns.push(
    { header: '要確認 順位（1＝最も要確認）', key: 'rank', width: 26 },
    { header: '位置', key: 'rankBand', width: 10 },
    { header: '読み解き', key: 'reading', width: 50 }
  );
  // 見出しに向きを入れる。書き出したファイルだけを見た人が数値の意味を取り違えないように。
  for (const axis of axes) {
    const suffix = axis.direction ? `（↑${axis.direction}）` : '';
    columns.push({ header: `${axis.label}${suffix}`, key: axis.key, width: 20 });
    columns.push({ header: `${axis.short}・信頼度`, key: `${axis.key}_confidence`, width: 14 });
  }
  columns.push({ header: '要確認度 生値（参考）', key: 'review', width: 18 });
  // 元データの判定列は、読み込んだファイルに入っていたときだけ出す（画面と揃える）。
  if (hasSourceVerdict) {
    columns.push(
      { header: '元データ AI疑いスコア', key: 'sourceScore', width: 18 },
      { header: '元データ AI判定', key: 'sourceVerdict', width: 14 }
    );
  }
  columns.push(
    { header: '状態', key: 'status', width: 10 },
    { header: '本文', key: 'body', width: 60 }
  );
  return columns;
}

const round2 = (value) => (value == null ? '' : Math.round(value * 100) / 100);

export async function buildWritingCheckWorkbook(rows, courseContext, mode, hasSourceVerdict) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('記述チェック結果');
  sheet.columns = buildColumns(mode.axes, hasSourceVerdict);
  sheet.getRow(1).font = { bold: true };

  rows.forEach((row) => {
    const values = {
      studentId: row.studentId,
      kanjiName: row.kanjiName,
      rank: row.rank != null ? `${row.rank} / ${row.cohortSize}` : '',
      rankBand: row.rankBand ?? '',
      reading: row.reading,
      review: round2(row.review),
      sourceScore: row.sourceScore,
      sourceVerdict: row.sourceVerdict,
      status: row.status === 'ok' ? '完了' : row.status === 'error' ? '失敗' : '未実行',
      body: row.body
    };
    for (const axis of mode.axes) {
      values[axis.key] = round2(row.scores?.[axis.key]?.score);
      values[`${axis.key}_confidence`] = round2(row.scores?.[axis.key]?.confidence);
    }
    sheet.addRow(values);
  });

  // 書き出したファイルだけが独り歩きしても意味を取り違えられないよう、
  // 注意書きを必ず末尾に残す。
  sheet.addRow({});
  sheet.addRow({
    studentId: '※ このスコアは文章の書き方の傾向を示す参考指標であり、AI 利用の有無を判定するものではありません。単独で不正の根拠としないでください。'
  });
  if (courseContext) {
    sheet.addRow({ studentId: `※ 授業の主題: ${courseContext}` });
  }

  return workbook.xlsx.writeBuffer();
}
