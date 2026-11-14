/* Subtotals are computed from exported report rows, never inferred from Tableau totals. */
(function (root) {
  "use strict";
  const operations = { sum: "Sum", avg: "Avg", min: "Min", max: "Max" };
  function valid(settings, columns) {
    if (settings === undefined) return true;
    if (!settings || typeof settings.enabled !== "boolean") return false;
    if (!settings.enabled) return true;
    if (
      typeof settings.groupBy !== "string" ||
      !settings.groupBy ||
      !Array.isArray(settings.calculations) ||
      !settings.calculations.length
    )
      return false;
    if (
      !settings.calculations.every(
        (item) =>
          item &&
          typeof item.key === "string" &&
          item.key &&
          item.key !== settings.groupBy &&
          Object.prototype.hasOwnProperty.call(operations, item.operation),
      )
    )
      return false;
    if (
      new Set(settings.calculations.map((item) => item.key)).size !==
      settings.calculations.length
    )
      return false;
    return (
      !columns ||
      [
        settings.groupBy,
        ...settings.calculations.map((item) => item.key),
      ].every((key) =>
        columns.some((column) => column.key === key && column.visible),
      )
    );
  }
  function copy(settings) {
    return settings?.enabled
      ? {
          enabled: true,
          groupBy: settings.groupBy,
          calculations: settings.calculations.map((item) => ({
            key: item.key,
            operation: item.operation,
          })),
        }
      : { enabled: false };
  }
  function apply(report, settings) {
    if (!settings?.enabled) return { ...report, subtotalRows: [] };
    if (!valid(settings))
      throw Error("Review the subtotal settings in Configure.");
    const groupIndex = report.fields.findIndex(
      (field) => field.key === settings.groupBy,
    );
    if (groupIndex < 0)
      throw Error(
        "The subtotal grouping column is hidden or missing. Review Configure.",
      );
    const calculations = settings.calculations.map((item) => {
      const index = report.fields.findIndex((field) => field.key === item.key);
      if (
        index < 0 ||
        (!report.fields[index].numeric && !report.fields[index].numericUnknown)
      )
        throw Error(
          "A subtotal column is hidden, missing, or no longer numeric. Review Configure.",
        );
      return {
        ...item,
        index,
        formatter: ReportLayout.createFormatter(
          { ...report.fields[index], numeric: true },
          true,
        ),
      };
    });
    // Map groups in first-seen order and retain original row order inside each group.
    const groups = new Map();
    report.rows.forEach((row, index) => {
      const identity = JSON.stringify(
        report.identities?.[index]?.[groupIndex] ?? [
          "formatted",
          row[groupIndex],
        ],
      );
      if (!groups.has(identity))
        groups.set(identity, {
          label: row[groupIndex],
          rows: [],
          stats: calculations.map(() => ({
            count: 0,
            sum: 0,
            compensation: 0,
            min: Infinity,
            max: -Infinity,
          })),
        });
      const group = groups.get(identity);
      group.rows.push(row);
      calculations.forEach((calculation, slot) => {
        const value = report.numbers?.[index]?.[calculation.index];
        if (typeof value !== "number" || !Number.isFinite(value)) return;
        const stat = group.stats[slot];
        const adjusted = value - stat.compensation,
          next = stat.sum + adjusted;
        stat.compensation = next - stat.sum - adjusted;
        stat.sum = next;
        stat.count++;
        stat.min = Math.min(stat.min, value);
        stat.max = Math.max(stat.max, value);
      });
    });
    const rows = [],
      subtotalRows = [];
    for (const group of groups.values()) {
      for (const row of group.rows) rows.push(row);
      const subtotal = Array(report.columns.length).fill("");
      subtotal[groupIndex] = "Subtotal: " + (group.label || "(blank)");
      calculations.forEach((calculation, slot) => {
        const stat = group.stats[slot];
        if (!stat.count) return;
        const value =
          calculation.operation === "sum"
            ? stat.sum
            : calculation.operation === "avg"
              ? stat.sum / stat.count
              : calculation.operation === "min"
                ? stat.min
                : stat.max;
        if (!Number.isFinite(value))
          throw Error(
            "A subtotal exceeds the supported numeric range. No PDF was created.",
          );
        subtotal[calculation.index] =
          operations[calculation.operation] +
          ": " +
          calculation.formatter.format(value);
      });
      subtotalRows.push(rows.length);
      rows.push(subtotal);
    }
    return { columns: report.columns, rows, subtotalRows };
  }
  root.ReportSubtotals = { valid, copy, apply };
})(globalThis);
