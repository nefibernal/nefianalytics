(function (root) {
  'use strict';
  function createReport(model) {
    const { jsPDF } = root.jspdf;
    const landscape = model.columns.length > 5;
    const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'letter', compress: true });
    doc.addFileToVFS('ReportSans.ttf', root.ReportFont);
    doc.addFont('ReportSans.ttf', 'ReportSans', 'normal'); doc.setFont('ReportSans');
    doc.setProperties({ title: model.title, subject: 'Filtered Tableau table', creator: 'Nefi Analytics Print Extension' });
    const width = doc.internal.pageSize.getWidth(), height = doc.internal.pageSize.getHeight();
    const margin = 32, usable = width - margin * 2;
    doc.setFontSize(14);
    const title = doc.splitTextToSize(model.title, usable);
    doc.setFontSize(9);
    const refresh = doc.splitTextToSize('Data refreshed: ' + model.refresh, usable);
    const headerBottom = margin + title.length * 17 + refresh.length * 12 + 18;
    if (headerBottom > height / 2) throw new Error('The report name or refresh timestamp is too long to fit the page.');
    const headerPages = new Set();
    function header() {
      const page = doc.internal.getCurrentPageInfo().pageNumber;
      if (headerPages.has(page)) return;
      headerPages.add(page);
      doc.setTextColor(25); doc.setFontSize(14); doc.text(title, margin, margin + 12);
      doc.setFontSize(9); doc.setTextColor(65); doc.text(refresh, margin, margin + title.length * 17 + 13);
      doc.setDrawColor(190); doc.line(margin, headerBottom - 9, width - margin, headerBottom - 9);
    }
    let y = headerBottom + 8;
    header(); doc.setFontSize(9); doc.setTextColor(30);
    const filterLines = model.filters.length ? model.filters.map(f => f.field + ': ' + f.selection + ' [Worksheet' + (f.worksheets.length === 1 ? '' : 's') + ': ' + f.worksheets.join(', ') + ']') : ['No worksheet filters reported by Tableau.'];
    function writeParagraph(text) {
      const lines = doc.splitTextToSize(text, usable);
      for (const line of lines) {
        if (y > height - 42) { doc.addPage(); header(); doc.setFontSize(9); y = headerBottom + 8; }
        doc.text(line, margin, y); y += 12;
      }
      y += 4;
    }
    writeParagraph('Applied filters'); filterLines.forEach(writeParagraph); y += 8;
    if (y > height - 80) { doc.addPage(); header(); y = headerBottom + 8; }
    doc.setFontSize(8);
    const columnStyles = {};
    model.columns.forEach((name, i) => {
      const sample = [name, ...model.rows.slice(0, 100).map(r => r[i] || '')];
      const measured = Math.max(...sample.map(s => doc.getTextWidth(String(s)) + 12));
      columnStyles[i] = { cellWidth: Math.max(55, Math.min(160, measured)) };
    });
    const totalWidth = Object.values(columnStyles).reduce((sum, c) => sum + c.cellWidth, 0);
    const needsHorizontalPages = totalWidth > usable;
    if (!needsHorizontalPages) Object.values(columnStyles).forEach(c => { c.cellWidth *= (usable - 1) / totalWidth; });
    doc.autoTable({
      head: [model.columns], body: model.rows, startY: y,
      margin: { top: headerBottom + 8, right: margin, bottom: 32, left: margin },
      theme: 'grid', showHead: 'everyPage',
      styles: { font: 'ReportSans', fontStyle: 'normal', fontSize: 8, cellPadding: 5, overflow: 'linebreak', minCellWidth: 42, lineColor: [215,220,224], lineWidth: .3, textColor: [30,30,30] },
      headStyles: { fillColor: [43,65,84], textColor: [255,255,255], fontStyle: 'normal' },
      alternateRowStyles: { fillColor: [246,248,250] },
      columnStyles,
      horizontalPageBreak: needsHorizontalPages, horizontalPageBreakRepeat: 0,
      didDrawPage: () => { header(); }
    });
    const count = doc.getNumberOfPages();
    for (let p = 1; p <= count; p++) {
      doc.setPage(p); doc.setFontSize(8); doc.setTextColor(90);
      doc.text('Page ' + p + ' of ' + count, width - margin, height - 16, { align: 'right' });
    }
    return doc;
  }
  root.PrintReport = { createReport };
})(globalThis);
