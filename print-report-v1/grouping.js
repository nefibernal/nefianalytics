/* Ordered, raw-value grouping; preserves first-seen order within each level. */
(function (root) {
  "use strict";
  function keys(config) {
    return config.grouping === undefined
      ? config.subtotals?.enabled
        ? [config.subtotals.groupBy]
        : []
      : [...config.grouping];
  }
  function valid(value, columns) {
    return (
      value === undefined ||
      (Array.isArray(value) &&
        value.every((key) => typeof key === "string" && key) &&
        new Set(value).size === value.length &&
        (!columns ||
          value.every((key) =>
            columns.some((c) => c.key === key && c.visible),
          )))
    );
  }
  function identity(report, row, index) {
    return (
      report.identities?.[row]?.[index] ?? [
        "formatted",
        report.rows[row][index],
      ]
    );
  }
  function apply(report, selected = []) {
    if (!valid(selected))
      throw Error("Review the grouping columns in Configure.");
    const indices = selected.map((key) =>
      report.fields.findIndex((f) => f.key === key),
    );
    if (indices.some((i) => i < 0))
      throw Error("A grouping column is hidden or missing. Review Configure.");
    const tree = new Map();
    report.rows.forEach((_, row) => {
      let children = tree;
      indices.forEach((index) => {
        const key = JSON.stringify(identity(report, row, index));
        if (!children.has(key))
          children.set(key, { children: new Map(), rows: [] });
        const node = children.get(key);
        children = node.children;
        if (index === indices[indices.length - 1]) node.rows.push(row);
      });
    });
    const order = [];
    function visit(children) {
      for (const node of children.values()) {
        if (node.children.size) visit(node.children);
        else for (const index of node.rows) order.push(index);
      }
    }
    if (indices.length) visit(tree);
    else report.rows.forEach((_, i) => order.push(i));
    return {
      ...report,
      groupingIndices: indices,
      rows: order.map((i) => report.rows[i]),
      identities: order.map(
        (i) =>
          report.identities?.[i] ?? report.rows[i].map((v) => ["formatted", v]),
      ),
      numbers: order.map(
        (i) => report.numbers?.[i] ?? report.columns.map(() => null),
      ),
    };
  }
  function effective(config, report) {
    const requested = keys(config),
      available = new Map(report.fields.map((field) => [field.key, field]));
    const grouping = requested.filter((key) => available.has(key));
    let subtotals = ReportSubtotals.copy(config.subtotals);
    if (subtotals.enabled) {
      const level = requested.indexOf(subtotals.groupBy);
      const groupBy = requested
        .slice(0, level + 1)
        .filter((key) => available.has(key))
        .at(-1);
      const calculations = subtotals.calculations.filter((item) => {
        const field = available.get(item.key);
        return (
          field &&
          !grouping.includes(item.key) &&
          (field.numeric || field.numericUnknown)
        );
      });
      subtotals =
        groupBy && calculations.length
          ? { enabled: true, groupBy, calculations }
          : { enabled: false };
    }
    return { grouping, subtotals };
  }
  root.ReportGroups = { keys, valid, identity, apply, effective };
})(globalThis);
