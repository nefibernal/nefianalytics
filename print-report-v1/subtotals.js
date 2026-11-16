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
    if (!settings?.enabled)
      return { ...report, subtotalRows: [], subtotalLabelIndices: {} };
    if (!valid(settings))
      throw Error("Review the subtotal settings in Configure.");
    const groupIndex = report.fields.findIndex(
      (field) => field.key === settings.groupBy,
    );
    if (groupIndex < 0)
      throw Error(
        "The subtotal grouping column is hidden or missing. Review Configure.",
      );
    const grouping = report.groupingIndices?.length
      ? report.groupingIndices
      : [groupIndex];
    const level = grouping.indexOf(groupIndex);
    if (level < 0)
      throw Error("Choose a subtotal group from the report grouping columns.");
    const scope = grouping.slice(0, level + 1);
    const calculations = settings.calculations.map((item) => {
      const index = report.fields.findIndex((field) => field.key === item.key);
      if (
        index < 0 ||
        grouping.includes(index) ||
        (!report.fields[index].numeric && !report.fields[index].numericUnknown)
      )
        throw Error(
          "A subtotal column is hidden, missing, grouped, or no longer numeric. Review Configure.",
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
    const groups = new Map();
    report.rows.forEach((row, index) => {
      const identity = JSON.stringify(
        scope.map((column) => ReportGroups.identity(report, index, column)),
      );
      if (!groups.has(identity))
        groups.set(identity, {
          indices: [],
          stats: calculations.map(() => ({
            count: 0,
            sum: 0,
            compensation: 0,
            min: Infinity,
            max: -Infinity,
          })),
        });
      const group = groups.get(identity);
      group.indices.push(index);
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
      identities = [],
      numbers = [],
      groupLabels = [],
      subtotalRows = [],
      subtotalLabelIndices = {};
    const calculated = new Set(calculations.map((c) => c.index));
    // Put the label in the first available detail column; fall back to the subtotal group.
    let labelIndex = report.columns.findIndex(
      (_, i) => !grouping.includes(i) && !calculated.has(i),
    );
    if (labelIndex < 0) labelIndex = groupIndex;
    const names = {
      sum: "Total",
      avg: "Average",
      min: "Minimum",
      max: "Maximum",
    };
    const mixed = new Set(calculations.map((c) => c.operation)).size > 1;
    const label =
      calculations.length === 1
        ? names[calculations[0].operation] +
          " " +
          report.columns[calculations[0].index]
        : mixed
          ? "Subtotal"
          : names[calculations[0].operation];
    for (const group of groups.values()) {
      for (const index of group.indices) {
        rows.push(report.rows[index]);
        identities.push(report.identities[index]);
        numbers.push(report.numbers[index]);
        groupLabels.push(report.rows[index]);
      }
      const first = group.indices[0],
        subtotal = Array(report.columns.length).fill("");
      subtotal[labelIndex] = label;
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
          (mixed ? operations[calculation.operation] + ": " : "") +
          calculation.formatter.format(value);
      });
      subtotalRows.push(rows.length);
      subtotalLabelIndices[rows.length] = labelIndex;
      rows.push(subtotal);
      identities.push(report.identities[first]);
      numbers.push(Array(report.columns.length).fill(null));
      // Only the subtotal's grouping prefix is meaningful for continued-page labels.
      groupLabels.push(
        report.rows[first].map((value, i) => (scope.includes(i) ? value : "")),
      );
    }
    return {
      ...report,
      rows,
      identities,
      numbers,
      groupLabels,
      groupingIndices: grouping,
      subtotalRows,
      subtotalLabelIndices,
    };
  }
  root.ReportSubtotals = { valid, copy, apply };
})(globalThis);
