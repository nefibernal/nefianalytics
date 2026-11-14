/* PDF column selection and Measure Names/Measure Values presentation. */
(function (root) {
  "use strict";
  const fieldKey = (field) =>
    "field:" + JSON.stringify([field.fieldId || null, field.fieldName]);
  const measureKey = (name) => "measure:" + JSON.stringify(name);
  const isNumericType = (field) => ["int", "float"].includes(field.dataType);
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
      numeric: isNumericType(field),
    }));
  }
  function present(data) {
    const metadata = data.fields;
    const { names, values } = specialIndices(metadata);
    if (names < 0 || values < 0)
      return {
        fields: flatFields(metadata),
        rows: data.rows,
        numbers: data.numbers,
        identities: data.identities,
      };
    const dimensions = metadata
      .map((_, index) => index)
      .filter((index) => index !== names && index !== values);
    const measures = [...new Set(data.rows.map((row) => row[names]))];
    if (measures.some((name) => !name))
      throw Error(
        "Tableau returned a measure without a name. Unable to prepare PDF columns.",
      );
    // Measure Values can contain differently typed measures. Inspect native values
    // separately for each generated measure column; never infer from a name or numeric-looking text.
    const measureTypes = new Map(
      measures.map((name) => [name, { number: false, other: false }]),
    );
    data.rows.forEach((row, index) => {
      const type = measureTypes.get(row[names]);
      const numeric = data.numbers?.[index]?.[values];
      if (typeof numeric === "number" && Number.isFinite(numeric))
        type.number = true;
      const identity = data.identities?.[index]?.[values];
      if (
        identity &&
        identity[1] !== null &&
        identity[1] !== undefined &&
        identity[1] !== "%null%" &&
        identity[1] !== "%missing%" &&
        identity[0] !== "number"
      )
        type.other = true;
    });
    const fields = [];
    for (let index = 0; index < metadata.length; index++) {
      if (index === names) continue;
      if (index === values)
        fields.push(
          ...measures.map((name) => ({
            key: measureKey(name),
            label: name,
            visible: true,
            numeric:
              measureTypes.get(name).number && !measureTypes.get(name).other,
            numericUnknown:
              !measureTypes.get(name).number && !measureTypes.get(name).other,
          })),
        );
      else
        fields.push({
          key: fieldKey(metadata[index]),
          label: metadata[index].fieldName,
          visible: true,
          numeric: isNumericType(metadata[index]),
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
        groups.set(identity, {
          row,
          identities: data.identities[index],
          numbers: data.numbers?.[index],
          values: new Map(),
          numericValues: new Map(),
        });
      const group = groups.get(identity),
        name = row[names];
      if (group.values.has(name))
        throw Error(
          "This table has multiple values for the same report row and measure. The extension cannot safely combine this layout.",
        );
      group.values.set(name, row[values]);
      group.numericValues.set(name, data.numbers?.[index]?.[values] ?? null);
    }
    return {
      fields,
      identities: [...groups.values()].map((group) => {
        const output = [];
        for (let index = 0; index < metadata.length; index++) {
          if (index === names) continue;
          if (index === values)
            output.push(
              ...measures.map((name) => [
                "number",
                group.numericValues.get(name) ?? null,
              ]),
            );
          else output.push(group.identities[index]);
        }
        return output;
      }),
      numbers: [...groups.values()].map((group) => {
        const output = [];
        for (let index = 0; index < metadata.length; index++) {
          if (index === names) continue;
          if (index === values)
            output.push(
              ...measures.map((name) => group.numericValues.get(name) ?? null),
            );
          else output.push(group.numbers?.[index] ?? null);
        }
        return output;
      }),
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
      ordered.push({
        ...available.get(item.key),
        visible: item.visible,
        format: available.get(item.key).numeric
          ? item.format || "auto"
          : "auto",
      });
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
  function createFormatter(field, subtotal = false) {
    const format = field.numeric ? field.format || "auto" : "auto";
    if (format === "auto")
      return subtotal
        ? new Intl.NumberFormat(navigator.language || "en-US", {
            maximumFractionDigits: 6,
          })
        : null;
    const match = /^(number|percent):([0-6])$/.exec(format);
    if (!match)
      throw Error(
        "Invalid number format. Review column formatting in Configure.",
      );
    return new Intl.NumberFormat(navigator.language || "en-US", {
      style: match[1] === "percent" ? "percent" : "decimal",
      minimumFractionDigits: Number(match[2]),
      maximumFractionDigits: Number(match[2]),
    });
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
        if (item.visible)
          ordered.push({
            ...item,
            index: -1,
            numericUnknown: item.key.startsWith("measure:"),
          });
        continue;
      }
      if (item.visible)
        ordered.push({
          ...current,
          format: current.numeric ? item.format || "auto" : "auto",
        });
      available.delete(item.key);
    }
    // Newly available columns are shown at the end until the author configures them.
    ordered.push(...available.values());
    if (!ordered.length)
      throw Error("Select at least one PDF column in Configure.");
    const formatters = ordered.map((field) => createFormatter(field));
    return {
      columns: ordered.map((field) => field.label),
      fields: ordered,
      numbers: prepared.rows.map((_, index) =>
        ordered.map((field) =>
          field.index < 0
            ? null
            : (prepared.numbers?.[index]?.[field.index] ?? null),
        ),
      ),
      identities: prepared.rows.map((row, index) =>
        ordered.map((field) =>
          field.index < 0
            ? ["missing", null]
            : (prepared.identities?.[index]?.[field.index] ?? [
                "formatted",
                row[field.index],
              ]),
        ),
      ),
      rows: prepared.rows.map((row, rowIndex) =>
        ordered.map((field, index) => {
          if (field.index < 0) return "";
          const numeric = prepared.numbers?.[rowIndex]?.[field.index];
          return formatters[index] &&
            typeof numeric === "number" &&
            Number.isFinite(numeric)
            ? formatters[index].format(numeric)
            : row[field.index];
        }),
      ),
    };
  }
  root.ReportLayout = { describe, apply, reconcile, createFormatter };
})(globalThis);
