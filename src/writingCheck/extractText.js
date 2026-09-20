// src/writingCheck/extractText.js
import PizZip from 'pizzip';

// PDF.js は重いので、zip に PDF が入っていたときだけ動的に読み込む。
// 先頭で静的 import すると、感想文（xlsx）しか使わない利用者にも
// 1MB 近いチャンクを配ることになる。
let pdfjsPromise = null;

function loadPdfjs() {
  pdfjsPromise ??= (async () => {
    const pdfjs = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    return pdfjs;
  })();
  return pdfjsPromise;
}

// Word の本文。段落の境界を改行にしてからタグを落とす。
// docx は zip なので、既存の PizZip でそのまま開ける。
export function extractDocxText(arrayBuffer) {
  const zip = new PizZip(arrayBuffer);
  const file = zip.file('word/document.xml');
  if (!file) throw new Error('Word ファイルの本文が見つかりません。');

  const xml = file.asText();
  return xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractPdfText(arrayBuffer) {
  const pdfjs = await loadPdfjs();
  // PDF.js は渡した ArrayBuffer を破棄することがあるので、複製を渡す。
  // destroy() を持つのは読み込みタスクのほうで、解決後のドキュメントにはない。
  // task を捨てて doc.destroy() を呼ぶと TypeError になり、finally で投げるため
  // 抽出に成功していても全件が失敗扱いになる。
  const task = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const doc = await task.promise;

  try {
    const pages = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      // items には改行情報が無いので、行末フラグ（hasEOL）で行を区切る。
      let line = '';
      const lines = [];
      for (const item of content.items) {
        if (item.str != null) line += item.str;
        if (item.hasEOL) {
          lines.push(line);
          line = '';
        }
      }
      if (line) lines.push(line);
      pages.push(lines.join('\n'));
      page.cleanup();
    }
    return pages.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  } finally {
    await task.destroy();
  }
}

export async function extractText(fileName, arrayBuffer) {
  if (/\.docx$/i.test(fileName)) return extractDocxText(arrayBuffer);
  if (/\.pdf$/i.test(fileName)) return extractPdfText(arrayBuffer);
  throw new Error(`対応していない形式です（${fileName}）。`);
}
