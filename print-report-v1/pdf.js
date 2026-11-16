/* Paginated grouped tables. All layout and PDF creation run in the viewer's browser. */
(function (root) {
  "use strict";
  function build(report) {
    if (!["portrait", "landscape"].includes(report.orientation))
      throw Error("Select Portrait or Landscape in setup.");
    if (
      !report.columns?.length ||
      !Array.isArray(report.rows) ||
      report.rows.some(
        (row) => !Array.isArray(row) || row.length !== report.columns.length,
      )
    )
      throw Error("The report contains inconsistent columns. Download again.");
    const doc = new root.jspdf.jsPDF({
      orientation: report.orientation,
      format: "letter",
      unit: "pt",
      compress: true,
    });
    doc.addFileToVFS("Report.ttf", root.NefiReportFont);
    doc.addFont("Report.ttf", "Report", "normal");
    doc.addFileToVFS("ReportBold.ttf", root.ReportBoldFont);
    doc.addFont("ReportBold.ttf", "Report", "bold");
    doc.setFont("Report", "normal");
    doc.setProperties({
      title: report.title,
      creator: "PDF Report Download 1.0.11",
    });
    const width = doc.internal.pageSize.getWidth(),
      height = doc.internal.pageSize.getHeight();
    const margin = 32,
      usable = width - 2 * margin,
      bottom = height - 40;
    const createdAt = report.createdAt
      ? new Date(report.createdAt)
      : new Date();
    if (!Number.isFinite(createdAt.getTime()))
      throw Error("Unable to determine the report creation time.");
    const dateLabel =
      "Created: " +
      new Intl.DateTimeFormat(navigator.language || "en-US", {
        dateStyle: "medium",
        timeStyle: "long",
      }).format(createdAt);
    doc.setFontSize(15);
    const titleLines = doc.splitTextToSize(String(report.title), usable);
    const headingBottom = margin + titleLines.length * 18 + 28;
    if (headingBottom > height / 2)
      throw Error("The worksheet name is too long to fit the report heading.");
    const subtotalRows = new Set(report.subtotalRows || []);
    const groups = report.groupingIndices || [];
    const groupSet = new Set(groups);
    if (
      new Set(groups).size !== groups.length ||
      groups.some(
        (i) => !Number.isInteger(i) || i < 0 || i >= report.columns.length,
      )
    )
      throw Error("Review the grouping columns in Configure.");
    const groupKeys = report.rows.map((row, index) =>
      groups.map((_, level) =>
        JSON.stringify(
          groups
            .slice(0, level + 1)
            .map(
              (column) =>
                report.identities?.[index]?.[column] ?? [
                  "formatted",
                  (report.groupLabels?.[index] || row)[column],
                ],
            ),
        ),
      ),
    );
    const all = report.columns.map((_, index) => index);
    // Size from a bounded sample, then wrap every cell without truncating values.
    const natural = all.map((index) => {
      const sample = [
        report.columns[index],
        ...report.rows.slice(0, 100).map((row) => row[index] || ""),
      ];
      doc.setFont("Report", index === 0 ? "bold" : "normal");
      doc.setFontSize(10);
      return Math.max(
        55,
        Math.min(
          180,
          Math.max(
            ...sample.map((value) => doc.getTextWidth(String(value)) + 10),
          ),
        ),
      );
    });
    // Wide reports use explicit panels, avoiding dropped rows during horizontal pagination.
    const panels = [];
    if (natural.reduce((sum, w) => sum + w, 0) <= usable) panels.push(all);
    else {
      const repeat = [...new Set([0, ...groups])].sort((a, b) => a - b);
      const repeatWidth = repeat.reduce((sum, i) => sum + natural[i], 0);
      if (repeatWidth > usable * 0.55)
        repeat.forEach((i) => {
          natural[i] *= (usable * 0.55) / repeatWidth;
        });
      let panel = [...repeat],
        used = repeat.reduce((sum, i) => sum + natural[i], 0);
      const repeatedWidth = used;
      for (const index of all.filter((i) => !repeat.includes(i))) {
        if (panel.length > repeat.length && used + natural[index] > usable) {
          panels.push(panel.sort((a, b) => a - b));
          panel = [...repeat];
          used = repeatedWidth;
        }
        natural[index] = Math.min(natural[index], usable - repeatedWidth);
        panel.push(index);
        used += natural[index];
      }
      if (panel.length) panels.push(panel.sort((a, b) => a - b));
    }
    const layouts = panels.map((indices) => {
      const total = indices.reduce((sum, i) => sum + natural[i], 0);
      const widths = indices.map((i) => (natural[i] * usable) / total);
      const positions = [margin];
      widths.forEach((w) => positions.push(positions.at(-1) + w));
      return { indices, widths, positions };
    });
    function textLines(value, fontSize, bold, cellWidth) {
      doc.setFont("Report", bold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      return doc.splitTextToSize(
        String(value ?? ""),
        Math.max(1, cellWidth - 10),
      );
    }
    const headerLines = layouts.map((panel) =>
      panel.indices.map((column, slot) =>
        textLines(report.columns[column], 10, false, panel.widths[slot]),
      ),
    );
    const headerHeight = Math.max(
      26,
      ...headerLines.flat().map((lines) => lines.length * 11 + 10),
    );
    const bodyTop = headingBottom + headerHeight;
    if (bodyTop + 21 > bottom)
      throw Error(
        "The report heading and column headers leave no space for data.",
      );
    const maxLinesPerPage = Math.floor((bottom - bodyTop - 10) / 11);
    const cells = layouts.map((panel) =>
      report.rows.map((row, index) =>
        panel.indices.map((column, slot) => {
          const value =
            subtotalRows.has(index) &&
            groupSet.has(column) &&
            report.subtotalLabelIndices?.[index] !== column
              ? report.groupLabels?.[index]?.[column] || ""
              : row[column];
          const context =
            subtotalRows.has(index) &&
            groupSet.has(column) &&
            report.subtotalLabelIndices?.[index] !== column;
          return textLines(
            value,
            subtotalRows.has(index) && !context ? 11 : 10,
            (subtotalRows.has(index) && !context) || column === 0,
            panel.widths[slot],
          );
        }),
      ),
    );
    const lineCounts = report.rows.map((_, index) =>
      Math.max(
        1,
        ...cells.flatMap((panel, panelIndex) =>
          panel[index].map((lines, slot) =>
            subtotalRows.has(index) &&
            groupSet.has(layouts[panelIndex].indices[slot]) &&
            report.subtotalLabelIndices?.[index] !==
              layouts[panelIndex].indices[slot]
              ? 1
              : lines.length,
          ),
        ),
      ),
    );
    let firstDocumentPage = true;
    layouts.forEach((panel, panelIndex) => {
      let y = bodyTop,
        firstOnPage = true;
      function newPage() {
        if (!firstDocumentPage) doc.addPage();
        firstDocumentPage = false;
        firstOnPage = true;
        y = bodyTop;
        doc.setFont("Report", "normal");
        doc.setFontSize(15);
        doc.setTextColor(25);
        doc.text(titleLines, margin, margin + 12, { lineHeightFactor: 1.2 });
        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(dateLabel, margin, margin + titleLines.length * 18 + 11);
        doc.setFillColor(215);
        doc.rect(margin, headingBottom, usable, headerHeight, "F");
        doc.setTextColor(25);
        doc.setFontSize(10);
        panel.indices.forEach((column, slot) => {
          const numeric =
            report.fields?.[column]?.numeric ||
            report.fields?.[column]?.numericUnknown;
          const align = numeric ? "right" : "left";
          doc.text(
            headerLines[panelIndex][slot],
            numeric ? panel.positions[slot + 1] - 5 : panel.positions[slot] + 5,
            headingBottom + 17,
            { align, lineHeightFactor: 1.1 },
          );
        });
      }
      newPage();
      report.rows.forEach((row, index) => {
        const count = lineCounts[index],
          rowHeight = count * 11 + 10;
        // Keep the last detail row and its subtotal on the same page whenever they fit.
        const nextHeight =
          !subtotalRows.has(index) && subtotalRows.has(index + 1)
            ? lineCounts[index + 1] * 11 + 10
            : 0;
        if (
          y + Math.min(rowHeight + nextHeight, bottom - bodyTop) > bottom &&
          !firstOnPage
        )
          newPage();
        let offset = 0;
        do {
          const availableLines = Math.floor((bottom - y - 10) / 11);
          if (availableLines < 1) {
            newPage();
            continue;
          }
          const take = Math.min(
            count - offset,
            availableLines,
            maxLinesPerPage,
          );
          const chunkHeight = take * 11 + 10;
          const continued = offset > 0;
          panel.indices.forEach((column, slot) => {
            let lines = cells[panelIndex][index][slot].slice(
              offset,
              offset + take,
            );
            if (
              groupSet.has(column) &&
              report.subtotalLabelIndices?.[index] !== column
            ) {
              const level = groups.indexOf(column);
              const changed =
                !index ||
                groupKeys[index][level] !== groupKeys[index - 1][level];
              const show =
                firstOnPage ||
                (!subtotalRows.has(index) && (changed || continued));
              if (!show) lines = [];
              // When a tall detail cell continues, repeat complete grouping labels for context.
              else if (
                continued &&
                cells[panelIndex][index][slot].length <= maxLinesPerPage
              )
                lines = cells[panelIndex][index][slot].slice(0, take);
            }
            const context =
              subtotalRows.has(index) &&
              groupSet.has(column) &&
              report.subtotalLabelIndices?.[index] !== column;
            doc.setFont(
              "Report",
              (subtotalRows.has(index) && !context) || column === 0
                ? "bold"
                : "normal",
            );
            doc.setFontSize(subtotalRows.has(index) && !context ? 11 : 10);
            doc.setTextColor(28);
            const numeric =
              report.fields?.[column]?.numeric ||
              report.fields?.[column]?.numericUnknown;
            if (lines.length)
              doc.text(
                lines,
                numeric
                  ? panel.positions[slot + 1] - 5
                  : panel.positions[slot] + 5,
                y + 14,
                {
                  align: numeric ? "right" : "left",
                  lineHeightFactor: subtotalRows.has(index) ? 1 : 1.1,
                },
              );
          });
          doc.setDrawColor(195);
          doc.setLineWidth(0.35);
          // Dividing lines begin at the changed group, leaving repeated group labels visually merged.
          let boundary = 0;
          if (
            groups.length &&
            index + 1 < report.rows.length &&
            offset + take >= count
          ) {
            const changedLevel = groups.findIndex(
              (_, level) =>
                groupKeys[index][level] !== groupKeys[index + 1][level],
            );
            boundary =
              changedLevel < 0
                ? Math.min(report.columns.length, Math.max(...groups) + 1)
                : groups[changedLevel];
          }
          const startSlot = panel.indices.findIndex(
            (column) => column >= boundary,
          );
          if (startSlot >= 0)
            doc.line(
              panel.positions[startSlot],
              y + chunkHeight,
              width - margin,
              y + chunkHeight,
            );
          y += chunkHeight;
          firstOnPage = false;
          offset += take;
          if (offset < count) newPage();
        } while (offset < count);
      });
    });
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      doc.setFont("Report", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text("Page " + page + " of " + pages, width - margin, height - 18, {
        align: "right",
      });
    }
    return doc;
  }
  root.PrintPDF = { build };
})(globalThis);
