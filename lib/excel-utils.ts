/**
 * Excel read/write using exceljs (replaces vulnerable xlsx/SheetJS).
 * Provides helpers compatible with the previous XLSX usage in the app.
 */
import ExcelJS from 'exceljs';

/** Convert binary string (from FileReader) to ArrayBuffer */
function binaryStringToArrayBuffer(bstr: string): ArrayBuffer {
  const buf = new ArrayBuffer(bstr.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bstr.length; i++) {
    view[i] = bstr.charCodeAt(i) & 0xff;
  }
  return buf;
}

/**
 * Read first sheet from an xlsx file (binary string from FileReader) and return rows as array of objects.
 * Replaces: XLSX.read(bstr, { type: 'binary' }) + XLSX.utils.sheet_to_json(ws)
 */
export async function readSheetFromBinaryString(
  bstr: string
): Promise<Record<string, unknown>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(binaryStringToArrayBuffer(bstr));
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: Record<string, unknown>[] = [];
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    const val = cell.value;
    const text =
      val == null ? '' : typeof val === 'object' && 'text' in val ? String((val as { text?: string }).text) : String(val);
    headers[colNumber - 1] = text || `Column${colNumber}`;
  });

  for (let r = 2; r <= (ws.rowCount ?? 1); r++) {
    const row = ws.getRow(r);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1);
      const val = cell.value;
      if (val != null) {
        if (typeof val === 'object' && 'result' in val) {
          obj[h] = (val as { result?: unknown }).result;
        } else if (typeof val === 'object' && 'text' in val) {
          obj[h] = (val as { text?: string }).text;
        } else {
          obj[h] = val;
        }
      }
    });
    rows.push(obj);
  }
  return rows;
}

/**
 * Create an xlsx workbook from an array of objects and trigger download.
 * Replaces: XLSX.utils.json_to_sheet(data) + book_new + book_append_sheet + writeFile
 */
export async function writeWorkbookToFile(
  sheetName: string,
  data: Record<string, unknown>[],
  filename: string
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  if (data.length === 0) {
    ws.addRow([]);
  } else {
    const headers = Object.keys(data[0]);
    ws.addRow(headers);
    data.forEach((row) => {
      ws.addRow(headers.map((h) => row[h]));
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Append multiple sheets to one workbook and trigger download.
 * For reports page: multiple sheets (e.g. Transactions + Summary).
 */
export async function writeWorkbookWithSheetsToFile(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename: string
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  for (const { name, data } of sheets) {
    const ws = wb.addWorksheet(name);
    if (data.length === 0) {
      ws.addRow([]);
    } else {
      const headers = Object.keys(data[0]);
      ws.addRow(headers);
      data.forEach((row) => {
        ws.addRow(headers.map((h) => row[h]));
      });
    }
  }
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
