import ExcelJS from 'exceljs';
import { fiscalYearLabel } from './fiscalYear.js';

const COLUMNS = [
  { header: 'No', key: 'no', width: 6 },
  { header: '依頼日', key: 'requestDate', width: 12 },
  { header: '依頼者', key: 'requester', width: 12 },
  { header: '依頼内容', key: 'category', width: 16 },
  { header: '依頼詳細', key: 'detail', width: 30 },
  { header: '締切日', key: 'deadline', width: 12 },
  { header: '受託状況', key: 'status', width: 10 },
  { header: '担当者', key: 'assignee', width: 12 },
  { header: '完了日', key: 'completedDate', width: 12 },
  { header: '所要時間', key: 'duration', width: 10 },
  { header: '備考', key: 'notes', width: 30 }
];

export async function buildAssistantRequestWorkbook(rows, fiscalYear) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(fiscalYearLabel(fiscalYear));
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => {
    sheet.addRow({
      no: row.no,
      requestDate: row.requestDate,
      requester: row.requester,
      category: row.category,
      detail: row.detail,
      deadline: row.deadline,
      status: row.status,
      assignee: row.assignee,
      completedDate: row.completedDate,
      duration: row.duration,
      notes: row.notes
    });
  });
  return workbook.xlsx.writeBuffer();
}
