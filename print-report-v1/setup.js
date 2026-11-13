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
      element("column-list").append(row);
    });
    updateControls();
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
        columns: columns.map((column) => ({
          key: column.key,
          label: column.label,
          visible: column.visible,
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
