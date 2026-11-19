import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// ===== EXPORT EXCEL =====
export function exportToExcel(data: any[], filename: string, sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ===== EXPORT MULTI-SHEET EXCEL =====
export function exportMultiSheetExcel(sheets: { name: string; data: any[] }[], filename: string) {
  const wb = XLSX.utils.book_new()
  sheets.forEach(sheet => {
    const ws = XLSX.utils.json_to_sheet(sheet.data)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31))
  })
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ===== EXPORT PDF =====
export function exportToPDF(title: string, headers: string[], rows: any[][], filename: string) {
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(16)
  doc.text(title, 14, 15)
  doc.setFontSize(10)
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 22)
  
  // Table
  ;(doc as any).autoTable({
    head: [headers],
    body: rows,
    startY: 28,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  })
  
  doc.save(`${filename}.pdf`)
}