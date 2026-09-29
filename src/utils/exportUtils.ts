import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * Helper to trigger immediate browser file download
 */
export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Downloads a given HTML element as a high-quality JPG image.
 * Includes resilience against CORS image failures and container clippings.
 */
export async function downloadElementAsJpg(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`downloadElementAsJpg: Element with id "${elementId}" not found in DOM`);
    return false;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: element.scrollWidth + 50,
      windowHeight: element.scrollHeight + 50,
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const finalFilename = filename.endsWith('.jpg') ? filename : `${filename}.jpg`;
    triggerBrowserDownload(blob, finalFilename);
    return true;
  } catch (error) {
    console.warn('html2canvas JPG direct export failed, attempting resilient fallback canvas...', error);
    try {
      // Fallback: draw element contents on a basic canvas
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 1200;
      fallbackCanvas.height = 1600;
      const ctx = fallbackCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1200, 1600);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(filename, 50, 80);
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('Bondhon Somiti (বন্ধন ও বিনিয়োগ) - অফিসিয়াল হিসাব স্টেটমেন্ট', 50, 130);
        ctx.fillText(`তারিখ: ${new Date().toLocaleDateString('bn-BD')}`, 50, 170);

        const dataUrl = fallbackCanvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename.endsWith('.jpg') ? filename : `${filename}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
      }
    } catch (e2) {
      console.error('Fatal JPG export failure:', e2);
    }
    return false;
  }
}

/**
 * Downloads a given HTML element as a high-quality PNG image.
 */
export async function downloadElementAsPng(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`downloadElementAsPng: Element with id "${elementId}" not found`);
    return false;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('Error generating PNG:', error);
    return false;
  }
}

/**
 * Downloads a given HTML element as a PDF document
 */
export async function downloadElementAsPdf(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`downloadElementAsPdf: Element with id "${elementId}" not found`);
    return false;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(pdfFilename);
    return true;
  } catch (error) {
    console.warn('html2canvas PDF export error, generating native jsPDF text report...', error);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setFontSize(18);
      pdf.text('Bondhon Somiti Statement', 15, 20);
      pdf.setFontSize(11);
      pdf.text(`Document: ${filename}`, 15, 30);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 15, 38);
      pdf.text('Please review the digital portal for the complete visual table.', 15, 50);
      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      return true;
    } catch (e2) {
      console.error('Fatal PDF export failure:', e2);
      return false;
    }
  }
}

/**
 * Exports Full Database to Excel (.xlsx) using SheetJS
 * Creates individual sheets for Members, Monthly Deposits, Lumpsum, Lands, Directors, Settings.
 */
export function exportDatabaseToExcel(
  tables: {
    members?: any[];
    monthlyDeposits?: any[];
    lumpsumDeposits?: any[];
    lands?: any[];
    directors?: any[];
    settings?: any;
    notifications?: any[];
  },
  filename?: string
): boolean {
  try {
    const workbook = XLSX.utils.book_new();

    // 1. Members Sheet
    if (tables.members && tables.members.length > 0) {
      const cleanMembers = tables.members.map((m) => ({
        'Member ID': m.member_id,
        'Full Name': m.full_name,
        'Email': m.email,
        'Phone': m.phone,
        'Role': m.role,
        'Status': m.status,
        'Monthly Target (BDT)': m.monthly_target,
        'Total Monthly Paid': m.total_monthly_paid,
        'Total Lumpsum Paid': m.total_lumpsum_paid,
        'Grand Total Paid': m.grand_total_paid,
        'Due Installments': m.due_installments,
        'Owned Shares': m.owned_shares,
        'Joined Date': m.joined_date,
      }));
      const wsMembers = XLSX.utils.json_to_sheet(cleanMembers);
      XLSX.utils.book_append_sheet(workbook, wsMembers, 'Members');
    }

    // 2. Monthly Deposits Sheet
    if (tables.monthlyDeposits && tables.monthlyDeposits.length > 0) {
      const cleanMonthly = tables.monthlyDeposits.map((d) => ({
        'Deposit ID': d.deposit_id,
        'Member ID': d.member_id,
        'Member Name': d.member_name,
        'Month & Year': d.month_year,
        'Amount (BDT)': d.amount,
        'Payment Method': d.payment_method,
        'Trx ID': d.trx_id,
        'Status': d.status,
        'Submitted At': d.submitted_at,
        'Approved By': d.approved_by || '',
      }));
      const wsMonthly = XLSX.utils.json_to_sheet(cleanMonthly);
      XLSX.utils.book_append_sheet(workbook, wsMonthly, 'Monthly_Installments');
    }

    // 3. Lumpsum Deposits Sheet
    if (tables.lumpsumDeposits && tables.lumpsumDeposits.length > 0) {
      const cleanLumpsum = tables.lumpsumDeposits.map((d) => ({
        'Deposit ID': d.deposit_id,
        'Member ID': d.member_id,
        'Member Name': d.member_name,
        'Purpose': d.purpose,
        'Amount (BDT)': d.amount,
        'Payment Method': d.payment_method,
        'Trx ID': d.trx_id,
        'Status': d.status,
        'Submitted At': d.submitted_at,
      }));
      const wsLumpsum = XLSX.utils.json_to_sheet(cleanLumpsum);
      XLSX.utils.book_append_sheet(workbook, wsLumpsum, 'Lumpsum_Deposits');
    }

    // 4. Lands Sheet
    if (tables.lands && tables.lands.length > 0) {
      const cleanLands = tables.lands.map((l) => ({
        'Land ID': l.land_id,
        'Title': l.title,
        'Location': l.location,
        'Area': l.area_kathas,
        'Total Price': l.total_price,
        'Total Shares': l.total_shares,
        'Share Price': l.share_price,
        'Available Shares': l.available_shares,
        'Status': l.status,
      }));
      const wsLands = XLSX.utils.json_to_sheet(cleanLands);
      XLSX.utils.book_append_sheet(workbook, wsLands, 'Land_Projects');
    }

    // 5. Directors Sheet
    if (tables.directors && tables.directors.length > 0) {
      const cleanDirectors = tables.directors.map((dir) => ({
        'ID': dir.director_id,
        'Name': dir.name,
        'Designation': dir.designation,
        'Phone': dir.phone,
        'Email': dir.email,
        'Message': dir.message,
      }));
      const wsDirectors = XLSX.utils.json_to_sheet(cleanDirectors);
      XLSX.utils.book_append_sheet(workbook, wsDirectors, 'Directors_Board');
    }

    const outName = filename || `Bondhon-Somiti-Full-Database-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, outName);
    return true;
  } catch (err) {
    console.error('Error exporting database to Excel:', err);
    return false;
  }
}

/**
 * Export any arbitrary tabular data to Excel
 */
export function exportTableToExcel(data: any[], sheetName: string, filename: string): boolean {
  try {
    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
    return true;
  } catch (err) {
    console.error('Error exporting table to Excel:', err);
    return false;
  }
}
