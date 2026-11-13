(function () {
  "use strict";

  const element = (id) => document.getElementById(id);
  let ready = false;
  let saving = false;
  let canConfigure = false;

  function updateControls() {
    const disabled = !ready || saving || !canConfigure;
    for (const control of document.querySelectorAll("select, input"))
      control.disabled = disabled;
    element("save").disabled = disabled;
    element("cancel").disabled = !ready || saving;
  }

  element("cancel").addEventListener("click", () => {
    if (!ready || saving) return;
    tableau.extensions.ui.closeDialog(JSON.stringify({ saved: false }));
  });

  element("settings-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ready || saving || !canConfigure) return;
    saving = true;
    updateControls();
    element("problem").textContent = "";
    try {
      const config = {
        table: element("table").value,
        color: element("color").value,
        orientation: document.querySelector('input[name="orientation"]:checked')
          ?.value,
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
      } catch (_) {
        /* Use saved settings instead. */
      }
      const config = PrintData.isConfig(supplied)
        ? supplied
        : PrintData.config();
      const tables = tableau.extensions.dashboardContent.dashboard.worksheets;
      element("table").replaceChildren(new Option("Select a table…", ""));
      for (const table of tables)
        element("table").add(new Option(table.name, table.name));
      if (config) {
        element("table").value = config.table;
        element("color").value = config.color;
        document.querySelector(
          'input[value="' + config.orientation + '"]',
        ).checked = true;
      }
      if (!tables.length)
        throw Error("This dashboard has no worksheets available to download.");
      canConfigure = true;
    } catch (error) {
      element("problem").textContent =
        "Unable to load setup: " + (error.message || error);
    } finally {
      updateControls();
    }
  })();
})();
