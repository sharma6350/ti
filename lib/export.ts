
'use client';

import ExcelJS from 'exceljs';
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

export const exportToExcel = async (data: (string | null)[][], fileName: string) => {
  const { schoolName, schoolId } = getSchoolInfo();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Timetable');

  // Add header and merge cells
  worksheet.addRow([schoolName]);
  worksheet.mergeCells('A1', `${String.fromCharCode(65 + data[0].length - 1)}1`);
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.addRow([`(ID: ${schoolId})`]);
  worksheet.mergeCells('A2', `${String.fromCharCode(65 + data[0].length - 1)}2`);
  worksheet.getCell('A2').alignment = { horizontal: 'center' };

  worksheet.addRow([]); // Empty row

  // Add main data
  data.forEach(row => {
    worksheet.addRow(row);
  });

  // Set column widths
  worksheet.columns = data[0].map(() => ({ width: 15 }));

  // Write to file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}.xlsx`;
  link.click();
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
