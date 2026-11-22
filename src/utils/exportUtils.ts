import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportCell {
  t: string;
  cs?: number;
}

export interface ExportTableData {
  head: ExportCell[][];
  body: ExportCell[][];
  foot?: ExportCell[][];
}

export interface ExportMeta {
  school: string;
  title: string;
  by: string;
  sheet: string;
  left?: boolean;
}

function sanitizeFilename(s: string): string {
  return s
    .replace(/[^\w\- ()]+/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function parseNumeric(val: string): string | number {
  return /^-?\d+(\.\d+)?$/.test(val.trim()) ? Number(val.trim()) : val;
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

export function exportToExcel(meta: ExportMeta, data: ExportTableData, baseFilename: string) {
  const aoa: (string | number)[][] = [[meta.school], [meta.title], [meta.by], []];

  const pushRow = (row: ExportCell[]) => {
    const out: (string | number)[] = [];
    row.forEach((cell) => {
      out.push(parseNumeric(cell.t));
      const span = cell.cs || 1;
      for (let i = 1; i < span; i++) out.push('');
    });
    aoa.push(out);
  };

  data.head.forEach(pushRow);
  data.body.forEach(pushRow);
  (data.foot || []).forEach(pushRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const bodyRows = aoa.slice(4);
  ws['!cols'] = (bodyRows[0] || []).map((_, colIdx) => ({
    wch: Math.min(32, Math.max(9, ...bodyRows.map((r) => String(r[colIdx] ?? '').length))),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, meta.sheet.slice(0, 31) || 'Register');
  const arrayBuf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([arrayBuf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(`${sanitizeFilename(baseFilename)}.xlsx`, blob);
}

export function exportToPdf(meta: ExportMeta, data: ExportTableData, baseFilename: string) {
  const clean = (s: string) => String(s).replace(/₹/g, 'Rs.');
  const mapRow = (row: ExportCell[]) =>
    row.map((cell) => ({ content: clean(cell.t), colSpan: cell.cs || 1 }));

  const buildDoc = (fontSize: number) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(clean(meta.school), 105, 9, { align: 'center' });
    doc.setFontSize(10.5);
    doc.text(clean(meta.title), 105, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(clean(meta.by), 105, 20, { align: 'center' });

    autoTable(doc, {
      head: data.head.map(mapRow),
      body: data.body.map(mapRow),
      foot: (data.foot || []).map(mapRow),
      startY: 23,
      margin: { left: 6, right: 6, top: 6, bottom: 6 },
      theme: 'grid',
      styles: {
        fontSize,
        cellPadding: Math.max(0.5, fontSize * 0.15),
        lineColor: [11, 74, 49],
        lineWidth: 0.25,
        halign: meta.left ? 'left' : 'right',
        textColor: 20,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [14, 90, 60],
        textColor: 255,
        halign: 'center',
        valign: 'middle',
      },
      footStyles: {
        fillColor: [215, 238, 226],
        textColor: 0,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left' },
      },
      showFoot: 'lastPage',
    });

    return doc;
  };

  let doc = buildDoc(9);
  for (const fs of [10, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4]) {
    doc = buildDoc(fs);
    if (doc.getNumberOfPages() === 1) break;
  }

  const blob = doc.output('blob');
  triggerDownload(`${sanitizeFilename(baseFilename)}.pdf`, blob);
}

export function c(t: string | number, cs = 1): ExportCell {
  return { t: String(t ?? '').replace(/\s+/g, ' ').trim(), cs };
}
