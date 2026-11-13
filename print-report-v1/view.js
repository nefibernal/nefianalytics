(function () {
  "use strict";
  const status = document.getElementById("status");
  (async () => {
    try {
      const payload = JSON.parse(
        await tableau.extensions.initializeDialogAsync(),
      );
      status.textContent = payload.error || "Unable to prepare this report.";
    } catch (error) {
      status.textContent =
        "Unable to display the report message: " + (error.message || error);
    }
  })();
})();
