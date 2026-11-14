(function () {
  "use strict";
  const element = (id) => document.getElementById(id);
  let ready = false,
    saving = false,
    canConfigure = false,
    loading = false;
  let columns = [],
    generation = 0,
    initialConfig = null;
  let subtotalDraft = { enabled: false, groupBy: "", calculations: [] };

  function updateControls() {
    const disabled = !ready || saving || !canConfigure;
    for (const control of document.querySelectorAll("select, input"))
      control.disabled =
        disabled || (loading && control.closest("#column-list") !== null);
    element("save").disabled = disabled || loading || !columns.length;
    element("cancel").disabled = !ready || saving;
    const rows = element("column-list").children;
    [...rows].forEach((row, index) => {
      row.querySelector('[data-move="up"]').disabled =
        disabled || loading || index === 0;
      row.querySelector('[data-move="down"]').disabled =
        disabled || loading || index === columns.length - 1;
    });
  }
  function renderColumns() {
    element("column-list").replaceChildren();
    columns.forEach((column, index) => {
      const row = document.createElement("div");
      row.className = "column-row";
      row.setAttribute("role", "listitem");
      const label = document.createElement("label"),
        checkbox = document.createElement("input"),
        name = document.createElement("span");
      checkbox.type = "checkbox";
      checkbox.checked = column.visible;
      checkbox.addEventListener("change", () => {
        columns[index].visible = checkbox.checked;
        renderSubtotals();
      });
      name.textContent = column.label;
      label.append(checkbox, name);
      row.append(label);
      for (const [direction, offset, symbol] of [
        ["up", -1, "↑"],
        ["down", 1, "↓"],
      ]) {
        const move = document.createElement("button");
        move.type = "button";
        move.dataset.move = direction;
        move.textContent = symbol;
        move.title = "Move " + column.label + " " + direction;
        move.setAttribute("aria-label", move.title);
        move.addEventListener("click", () => {
          if (saving || loading) return;
          const destination = index + offset;
          if (destination < 0 || destination >= columns.length) return;
          [columns[index], columns[destination]] = [
            columns[destination],
            columns[index],
          ];
          renderColumns();
          element("column-list")
            .children[destination].querySelector(
              '[data-move="' + direction + '"]',
            )
            .focus();
        });
        row.append(move);
      }
      if (column.numeric) {
        const format = document.createElement("select");
        format.className = "column-number-format";
        format.setAttribute("aria-label", "Number format for " + column.label);
        format.add(new Option("As provided by Tableau", "auto"));
        for (let places = 0; places <= 6; places++) {
          format.add(
            new Option(
              places === 0
                ? "Whole number"
                : "Number: " + places + " decimal" + (places === 1 ? "" : "s"),
              "number:" + places,
            ),
          );
        }
        for (let places = 0; places <= 2; places++) {
          format.add(
            new Option(
              "Percentage: " + places + " decimal" + (places === 1 ? "" : "s"),
              "percent:" + places,
            ),
          );
        }
        format.value = column.format || "auto";
        format.addEventListener("change", () => {
          columns[index].format = format.value;
        });
        row.append(format);
      }
      element("column-list").append(row);
    });
    renderSubtotals();
  }
  function renderSubtotals() {
    element("subtotal-settings").hidden = !columns.length;
    element("include-subtotals").checked = subtotalDraft.enabled;
    element("subtotal-options").hidden = !subtotalDraft.enabled;
    const visible = columns.filter((column) => column.visible);
    const group = element("subtotal-group");
    group.replaceChildren(new Option("Select a column…", ""));
    for (const column of visible)
      group.add(new Option(column.label, column.key));
    if (!visible.some((column) => column.key === subtotalDraft.groupBy))
      subtotalDraft.groupBy = "";
    group.value = subtotalDraft.groupBy;
    const calculations = element("subtotal-calculations");
    calculations.replaceChildren();
    for (const column of visible.filter(
      (column) => column.numeric && column.key !== subtotalDraft.groupBy,
    )) {
      const row = document.createElement("div"),
        label = document.createElement("label"),
        select = document.createElement("select");
      row.className = "subtotal-calculation";
      select.dataset.key = column.key;
      select.id = "subtotal-operation-" + columns.indexOf(column);
      label.htmlFor = select.id;
      label.textContent = column.label;
      for (const [value, text] of [
        ["", "No subtotal"],
        ["sum", "Sum"],
        ["avg", "Average"],
        ["min", "Minimum"],
        ["max", "Maximum"],
      ])
        select.add(new Option(text, value));
      select.value =
        subtotalDraft.calculations.find((item) => item.key === column.key)
          ?.operation || "";
      select.addEventListener("change", () => {
        subtotalDraft.calculations = subtotalDraft.calculations.filter(
          (item) => item.key !== column.key,
        );
        if (select.value)
          subtotalDraft.calculations.push({
            key: column.key,
            operation: select.value,
          });
      });
      row.append(label, select);
      calculations.append(row);
    }
    if (!calculations.children.length) {
      const message = document.createElement("p");
      message.className = "column-help";
      message.textContent =
        "Show a numeric column other than the grouping column to calculate subtotals.";
      calculations.append(message);
    }
    updateControls();
  }
  element("include-subtotals").addEventListener("change", () => {
    subtotalDraft.enabled = element("include-subtotals").checked;
    renderSubtotals();
  });
  element("subtotal-group").addEventListener("change", () => {
    subtotalDraft.groupBy = element("subtotal-group").value;
    renderSubtotals();
  });
  function subtotalSettings() {
    if (!subtotalDraft.enabled) return { enabled: false };
    const calculations = [
      ...element("subtotal-calculations").querySelectorAll("select"),
    ]
      .filter((select) => select.value)
      .map((select) => ({ key: select.dataset.key, operation: select.value }));
    if (!subtotalDraft.groupBy)
      throw Error("Select a visible grouping column for subtotals.");
    if (!calculations.length)
      throw Error(
        "Select a subtotal calculation for at least one numeric column.",
      );
    return { enabled: true, groupBy: subtotalDraft.groupBy, calculations };
  }
  async function loadColumns() {
    const current = ++generation,
      table = element("table").value;
    columns = [];
    renderColumns();
    element("problem").textContent = "";
    element("column-settings").hidden = !table;
    if (!table) {
      loading = false;
      updateControls();
      return;
    }
    loading = true;
    element("column-status").textContent = "Loading columns…";
    updateControls();
    try {
      const fields = await ReportLayout.describe(PrintData.worksheet(table));
      if (current !== generation) return;
      columns = ReportLayout.reconcile(
        fields,
        initialConfig?.table === table ? initialConfig.columns : undefined,
      );
      subtotalDraft =
        initialConfig?.table === table
          ? {
              ...ReportSubtotals.copy(initialConfig.subtotals),
              calculations: (initialConfig.subtotals?.calculations || []).map(
                (item) => ({ ...item }),
              ),
            }
          : { enabled: false, groupBy: "", calculations: [] };
      element("column-status").textContent = columns.length
        ? ""
        : "This table has no available columns.";
      renderColumns();
    } catch (error) {
      if (current !== generation) return;
      element("column-status").textContent = "";
      element("problem").textContent =
        "Unable to load columns: " + (error.message || error);
    } finally {
      if (current === generation) {
        loading = false;
        updateControls();
      }
    }
  }
  element("table").addEventListener("change", loadColumns);
  element("cancel").addEventListener("click", () => {
    if (!ready || saving) return;
    generation++;
    tableau.extensions.ui.closeDialog(JSON.stringify({ saved: false }));
  });
  element("settings-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ready || saving || !canConfigure || loading) return;
    element("problem").textContent = "";
    if (!columns.some((column) => column.visible)) {
      element("problem").textContent = "Select at least one PDF column.";
      return;
    }
    saving = true;
    updateControls();
    try {
      const config = {
        table: element("table").value,
        color: element("color").value,
        orientation: document.querySelector('input[name="orientation"]:checked')
          ?.value,
        subtotals: subtotalSettings(),
        columns: columns.map((column) => ({
          key: column.key,
          label: column.label,
          visible: column.visible,
          format: column.format || "auto",
        })),
      };
      if (!PrintData.isConfig(config))
        throw Error("Select a table and report orientation.");
      PrintData.worksheet(config.table);
      await PrintData.save(config);
      tableau.extensions.ui.closeDialog(
        JSON.stringify({ saved: true, config }),
      );
    } catch (error) {
      element("problem").textContent =
        error.message || "Unable to save setup. Please try again.";
    } finally {
      saving = false;
      updateControls();
    }
  });
  updateControls();
  (async () => {
    try {
      const payload = await tableau.extensions.initializeDialogAsync();
      ready = true;
      if (!PrintData.isAuthoring())
        throw Error(
          "The dashboard author must configure this extension in authoring mode.",
        );
      let supplied = {};
      try {
        supplied = JSON.parse(payload || "{}");
      } catch (_) {}
      initialConfig = PrintData.isConfig(supplied)
        ? supplied
        : PrintData.config();
      const tables = tableau.extensions.dashboardContent.dashboard.worksheets;
      element("table").replaceChildren(new Option("Select a table…", ""));
      for (const table of tables)
        element("table").add(new Option(table.name, table.name));
      if (initialConfig) {
        element("table").value = initialConfig.table;
        element("color").value = initialConfig.color;
        document.querySelector(
          'input[value="' + initialConfig.orientation + '"]',
        ).checked = true;
      }
      if (!tables.length)
        throw Error("This dashboard has no worksheets available to download.");
      canConfigure = true;
      await loadColumns();
    } catch (error) {
      element("problem").textContent =
        "Unable to load setup: " + (error.message || error);
    } finally {
      updateControls();
    }
  })();
})();
