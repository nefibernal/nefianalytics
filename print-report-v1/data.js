/* Tableau data access and saved configuration. */
(function (root) {
  "use strict";

  const key = "nefi.print.report.v1";

  function isConfig(value) {
    return !!(
      value &&
      typeof value.table === "string" &&
      value.table.trim() &&
      /^#[0-9a-f]{6}$/i.test(value.color) &&
      ["portrait", "landscape"].includes(value.orientation)
    );
  }

  function config() {
    try {
      const value = JSON.parse(tableau.extensions.settings.get(key) || "null");
      return isConfig(value)
        ? {
            table: value.table,
            color: value.color,
            orientation: value.orientation,
          }
        : null;
    } catch (_) {
      return null;
    }
  }

  function isAuthoring() {
    return (
      tableau.extensions.environment?.mode ===
      (tableau.ExtensionMode?.Authoring || "authoring")
    );
  }

  async function save(value) {
    // Tableau documents settings.saveAsync as an authoring-only operation.
    if (!isAuthoring())
      throw Error(
        "The dashboard author must configure this extension in authoring mode.",
      );
    if (!isConfig(value))
      throw Error("Select a table, background color, and orientation.");
    const settings = tableau.extensions.settings;
    const previous = settings.get(key);
    settings.set(
      key,
      JSON.stringify({
        table: value.table,
        color: value.color,
        orientation: value.orientation,
      }),
    );
    try {
      await settings.saveAsync();
    } catch (error) {
      if (previous === undefined) settings.erase(key);
      else settings.set(key, previous);
      throw error;
    }
  }

  function worksheet(name) {
    const sheet = tableau.extensions.dashboardContent.dashboard.worksheets.find(
      (item) => item.name === name,
    );
    if (!sheet)
      throw Error(
        "The configured table is missing. Open Configure and select the table again.",
      );
    return sheet;
  }

  function text(cell) {
    if (cell === null || cell === undefined) return "";
    if (typeof cell !== "object") return String(cell);
    if (cell.formattedValue !== null && cell.formattedValue !== undefined)
      return cell.formattedValue === "%null%" ||
        cell.formattedValue === "%missing%"
        ? ""
        : String(cell.formattedValue);
    return cell.value === null ||
      cell.value === undefined ||
      cell.value === "%null%"
      ? ""
      : String(cell.value);
  }

  async function table(sheet) {
    if (typeof sheet.getSummaryDataReaderAsync !== "function")
      throw Error("Downloading requires Tableau 2022.4 or later.");
    // The reader sorts columns alphabetically; metadata supplies the view order.
    const viewColumns = await sheet.getSummaryColumnsInfoAsync();
    const reader = await sheet.getSummaryDataReaderAsync(1000, {
      ignoreSelection: true,
      ignoreAliases: false,
      applyWorksheetFormatting: true,
    });
    let primaryError;
    let columns = [];
    let readerColumns = [];
    let viewIndices = [];
    const rows = [];
    try {
      for (let pageNumber = 0; pageNumber < reader.pageCount; pageNumber++) {
        const page = await reader.getPageAsync(pageNumber);
        if (page.isTotalRowCountLimited)
          throw Error(
            "Tableau returned incomplete data. No partial report was created.",
          );
        if (pageNumber === 0) {
          readerColumns = page.columns.map(({ fieldId, fieldName }) => ({
            fieldId,
            fieldName,
          }));
          const byId = new Map();
          const byName = new Map();
          // A duplicated key cannot safely identify a column by itself.
          function addIndex(map, key, index) {
            if (key === undefined || key === null || key === "") return;
            map.set(key, map.has(key) ? -1 : index);
          }
          readerColumns.forEach((column, index) => {
            addIndex(byId, column.fieldId, index);
            addIndex(byName, column.fieldName, index);
          });
          viewIndices = viewColumns.map((column) => {
            const idIndex = byId.get(column.fieldId);
            return idIndex !== undefined && idIndex >= 0
              ? idIndex
              : byName.get(column.fieldName);
          });
          if (
            viewIndices.length !== readerColumns.length ||
            viewIndices.some((index) => index === undefined || index < 0) ||
            new Set(viewIndices).size !== readerColumns.length
          ) {
            throw Error(
              "Unable to match the table columns to their view order. Please download again.",
            );
          }
          columns = viewColumns.map((column) => column.fieldName);
        }
        if (
          page.columns.length !== readerColumns.length ||
          page.columns.some(
            (column, index) =>
              column.fieldName !== readerColumns[index].fieldName ||
              column.fieldId !== readerColumns[index].fieldId,
          )
        ) {
          throw Error(
            "The table changed while the report was being prepared. Please download again.",
          );
        }
        for (const row of page.data) {
          if (row.length !== columns.length)
            throw Error("Tableau returned an inconsistent table row.");
          rows.push(viewIndices.map((index) => text(row[index])));
        }
      }
      if (rows.length !== reader.totalRowCount)
        throw Error(
          "Tableau returned an incomplete row count. Please download again.",
        );
      return { columns, rows };
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      try {
        await reader.releaseAsync();
      } catch (cleanupError) {
        // Preserve the useful retrieval error if cleanup also fails; log no row data.
        if (primaryError)
          console.warn(
            "Unable to release the Tableau data reader after a retrieval failure.",
          );
        else throw cleanupError;
      }
    }
  }

  function hierarchyText(item) {
    // HierarchicalFilterDataValue wraps a DataValue and includes the full member path.
    if (typeof item.hierarchicalPath === "string" && item.hierarchicalPath)
      return item.hierarchicalPath;
    return text(item.value);
  }

  function selection(filter) {
    switch (String(filter.filterType).toLowerCase()) {
      case "categorical":
        return filter.isAllSelected
          ? "All"
          : (filter.isExcludeMode ? "Exclude: " : "") +
              ((filter.appliedValues || []).map(text).join(", ") || "(none)");
      case "range":
        return (
          (text(filter.minValue) || "No lower limit") +
          " to " +
          (text(filter.maxValue) || "No upper limit") +
          (filter.includeNullValues ? " (includes nulls)" : "")
        );
      case "relativedate":
      case "relative-date":
        return (
          [
            filter.rangeType,
            /n$/i.test(String(filter.rangeType)) ? filter.rangeN : "",
            filter.periodType,
          ]
            .filter((value) => value !== "" && value !== undefined)
            .join(" ") +
          (text(filter.anchorDate)
            ? "; anchor: " + text(filter.anchorDate)
            : "")
        );
      case "hierarchical":
        return filter.isAllSelected
          ? "All"
          : (filter.appliedValues || []).map(hierarchyText).join(", ") ||
              "(none)";
      default:
        return (
          "Selection details not exposed by Tableau (" + filter.filterType + ")"
        );
    }
  }

  async function filters(
    sheets = tableau.extensions.dashboardContent.dashboard.worksheets,
  ) {
    const worksheetFilters = await Promise.all(
      sheets.map(async (sheet) =>
        (await sheet.getFiltersAsync()).map((filter) => ({
          field: filter.fieldName,
          value: selection(filter),
          sheet: sheet.name,
        })),
      ),
    );
    const grouped = new Map();
    for (const filter of worksheetFilters.flat()) {
      const identity = JSON.stringify([filter.field, filter.value]);
      if (!grouped.has(identity))
        grouped.set(identity, {
          field: filter.field,
          value: filter.value,
          sheets: [],
        });
      grouped.get(identity).sheets.push(filter.sheet);
    }
    // Stable ordering avoids false change detection when Tableau changes enumeration order.
    return [...grouped.values()]
      .map((filter) => ({ ...filter, sheets: filter.sheets.sort() }))
      .sort((a, b) =>
        JSON.stringify([a.field, a.value]).localeCompare(
          JSON.stringify([b.field, b.value]),
        ),
      );
  }

  function canceled(error) {
    const code = error?.errorCode;
    return (
      typeof code === "string" &&
      (code === "dialog-closed-by-user" ||
        code === tableau.ErrorCodes?.DialogClosedByUser)
    );
  }

  root.PrintData = {
    key,
    isConfig,
    config,
    isAuthoring,
    save,
    worksheet,
    text,
    table,
    filters,
    canceled,
  };
})(globalThis);
