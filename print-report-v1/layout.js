/* PDF column selection and Measure Names/Measure Values presentation. */
(function (root) {
  "use strict";
  const fieldKey = (field) =>
    "field:" + JSON.stringify([field.fieldId || null, field.fieldName]);
  const measureKey = (name) => "measure:" + JSON.stringify(name);
  function specialIndices(fields) {
    const normalize = (name) => String(name).toLowerCase().replace(/\s/g, "");
    return {
      names: fields.findIndex(
        (field) => normalize(field.fieldName) === "measurenames",
      ),
      values: fields.findIndex(
        (field) => normalize(field.fieldName) === "measurevalues",
      ),
    };
  }
  function flatFields(fields) {
    return fields.map((field) => ({
      key: fieldKey(field),
      label: field.fieldName,
      visible: true,
    }));
  }
  function present(data) {
    const metadata = data.fields;
    const { names, values } = specialIndices(metadata);
    if (names < 0 || values < 0)
      return { fields: flatFields(metadata), rows: data.rows };
    const dimensions = metadata
      .map((_, index) => index)
      .filter((index) => index !== names && index !== values);
    const measures = [...new Set(data.rows.map((row) => row[names]))];
    if (measures.some((name) => !name))
      throw Error(
        "Tableau returned a measure without a name. Unable to prepare PDF columns.",
      );
    const fields = [];
    for (let index = 0; index < metadata.length; index++) {
      if (index === names) continue;
      if (index === values)
        fields.push(
          ...measures.map((name) => ({
            key: measureKey(name),
            label: name,
            visible: true,
          })),
        );
      else
        fields.push({
          key: fieldKey(metadata[index]),
          label: metadata[index].fieldName,
          visible: true,
        });
    }
    const groups = new Map();
    for (let index = 0; index < data.rows.length; index++) {
      const row = data.rows[index];
      // Raw identities keep distinct values apart if their displayed labels match.
      const identity = JSON.stringify(
        dimensions.map((column) => data.identities[index][column]),
      );
      if (!groups.has(identity))
        groups.set(identity, { row, values: new Map() });
      const group = groups.get(identity),
        name = row[names];
      if (group.values.has(name))
        throw Error(
          "This table has multiple values for the same report row and measure. The extension cannot safely combine this layout.",
        );
      group.values.set(name, row[values]);
    }
    return {
      fields,
      rows: [...groups.values()].map((group) => {
        const output = [];
        for (let index = 0; index < metadata.length; index++) {
          if (index === names) continue;
          if (index === values)
            output.push(
              ...measures.map((name) => group.values.get(name) ?? ""),
            );
          else output.push(group.row[index]);
        }
        return output;
      }),
    };
  }
  function reconcile(fields, saved) {
    const available = new Map(fields.map((field) => [field.key, field]));
    const ordered = [];
    for (const item of saved || []) {
      if (!available.has(item.key)) continue;
      ordered.push({ ...available.get(item.key), visible: item.visible });
      available.delete(item.key);
    }
    return [...ordered, ...available.values()].map((item) => ({ ...item }));
  }
  async function describe(sheet) {
    const metadata = await sheet.getSummaryColumnsInfoAsync();
    const { names, values } = specialIndices(metadata);
    if (names >= 0 && values >= 0) {
      const data = await PrintData.table(sheet);
      if (!data.rows.length)
        throw Error(
          "No data is available to discover measure columns. Adjust the dashboard filters and select the table again.",
        );
      return present(data).fields;
    }
    return flatFields(metadata);
  }
  function apply(data, saved) {
    const prepared = present(data);
    const available = new Map(
      prepared.fields.map((field, index) => [field.key, { ...field, index }]),
    );
    const ordered = [];
    for (const item of saved || []) {
      const current = available.get(item.key);
      if (!current) {
        if (item.visible && !item.key.startsWith("measure:"))
          throw Error(
            "A configured PDF column is missing. Open Configure to review the table columns.",
          );
        // A measure can be absent under the current filters. Preserve its empty column.
        if (item.visible) ordered.push({ ...item, index: -1 });
        continue;
      }
      if (item.visible) ordered.push(current);
      available.delete(item.key);
    }
    // Newly available columns are shown at the end until the author configures them.
    ordered.push(...available.values());
    if (!ordered.length)
      throw Error("Select at least one PDF column in Configure.");
    return {
      columns: ordered.map((field) => field.label),
      rows: prepared.rows.map((row) =>
        ordered.map((field) => (field.index < 0 ? "" : row[field.index])),
      ),
    };
  }
  root.ReportLayout = { describe, apply, reconcile };
})(globalThis);
