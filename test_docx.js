import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

try {
  const content = fs.readFileSync('public/template.docx', 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '【', end: '】' } });
  
  // 試しにダミーデータを流し込んでレンダリング
  doc.render({
    name: '山田 太郎', 
    department: '食物栄養学科', 
    title: '教授', 
    workplace: '〇〇大学',
    subjectName: '栄養学演習', 
    termZenki: '〇', termKouki: '　', termTsunen: '　', termShuchu: '　',
    periodStart: '2026-04-01', periodEnd: '2026-09-30', 
    dayAndTime: '月曜 3限', 
    credits: '2',
    relationComment: '本学の授業に関連する内容です。', 
    eqYes: '〇', eqNo: '　', 
    noHinderanceComment: '週2日のため支障ありません。',
    hinYes: '〇', hinNo: '　', 
    reiwaDate: '令和8年5月7日'
  });
  
  const buf = doc.getZip().generate({ type: 'nodebuffer' });
  fs.writeFileSync('output.docx', buf);
  console.log("SUCCESS: output.docx を生成しました。");
} catch (error) {
  console.error("ERROR DETECTED:");
  if (error.properties && error.properties.errors instanceof Array) {
      const errorMessages = error.properties.errors.map(function (error) {
          return error.message;
      }).join("\n");
      console.error('詳細なエラー:', errorMessages);
  } else {
      console.error(error);
  }
}
