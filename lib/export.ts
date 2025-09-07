
'use client';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface ExportCell {
    text: string;
    bold?: boolean;
    color?: string; // Hex color code (e.g., 'FF0000' for red)
}

const getSchoolInfo = (): { schoolName: string, schoolId: string } => {
    if (typeof window === 'undefined') {
        return { schoolName: 'School', schoolId: 'N/A' };
    }
    const schoolName = localStorage.getItem('schoolName') || 'School';
    const schoolId = localStorage.getItem('schoolID') || 'N/A';
    return { schoolName, schoolId };
};

export const exportToExcel = (data: (string | null)[][], fileName: string) => {
  const { schoolName, schoolId } = getSchoolInfo();
  
  const headerData = [
    [schoolName],
    [`(ID: ${schoolId})`],
    [] // Empty row for spacing
  ];

  const ws = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.sheet_add_aoa(ws, data, { origin: 'A4' }); // Add main data starting from row 4

  // Merge cells for the main title and subtitle
  if (data[0] && data[0].length > 0) {
      const mergeRange = { s: { r: 0, c: 0 }, e: { r: 0, c: data[0].length - 1 } };
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push(mergeRange);
      
      const subTitleMergeRange = { s: { r: 1, c: 0 }, e: { r: 1, c: data[0].length - 1 } };
      ws['!merges'].push(subTitleMergeRange);
  }

  // Set column widths
  const colWidths = data[0].map(() => ({ wch: 15 }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const exportToPdf = (data: ExportCell[][], fileName:string) => {
    const { schoolName, schoolId } = getSchoolInfo();
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Add custom header
    doc.setFontSize(16);
    doc.text(schoolName, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`(ID: ${schoolId})`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });


    const head = data.length > 0 ? [data[0].map(cell => cell.text)] : [];
    const body = data.length > 1 ? data.slice(1).map(row => row.map(cell => cell.text)) : [];
    
    (doc as any).autoTable({
        startY: 25, // Start table after the custom header
        head: head,
        body: body,
        didParseCell: function (hookData: any) {
            let originalCell: ExportCell | undefined;
            if (hookData.section === 'body') {
                if (data[hookData.row.index + 1] && data[hookData.row.index + 1][hookData.column.index]) {
                   originalCell = data[hookData.row.index + 1][hookData.column.index];
                }
            } else if (hookData.section === 'head') {
                 if (data[hookData.row.index] && data[hookData.row.index][hookData.column.index]) {
                   originalCell = data[hookData.row.index][hookData.column.index];
                }
            }
            
            // The user wants ALL text bold, which is handled by styles. We only check for color here.
            if (originalCell?.color === 'FF0000') { // Check for red color for shortages
                 hookData.cell.styles.textColor = '#FF0000';
            }
        },
        styles: {
            fontSize: 6,
            cellPadding: 2,
            overflow: 'linebreak',
            fontStyle: 'bold', // Make all body text bold
            halign: 'center',    // Center align horizontally
            valign: 'middle'     // Center align vertically
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontSize: 7,
            fontStyle: 'bold', // Make all head text bold
            halign: 'center',    // Center align horizontally
            valign: 'middle'     // Center align vertically
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        }
    });

    doc.save(`${fileName}.pdf`);
};
