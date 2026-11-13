# PDF Report Download - agreed MVP requirements

Record: application build 1.0.4. The requested workflow is: click the configured download icon, create the PDF report, choose a save location, and open the PDF. Save-location selection and opening the saved file depend on the host capabilities described below.

1. **Automatic initial setup:** When the extension is first added, Tableau displays its third-party extension permission prompt. After the author accepts it and initialization succeeds, automatically open the setup screen in authoring mode if no configuration is saved. In viewing mode, an unconfigured extension explains that the dashboard author must configure it. A configured extension remains available to viewers for report downloads.

2. **Setup options:** Ask for exactly four settings:
   - **Table to export:** The worksheet the extension will connect to.
   - **Background color:** Selected using the native color picker.
   - **Report orientation:** Portrait or Landscape.
   - **Include filters in report:** An On/Off toggle, defaulted to **On**.

   Do not ask for a report name, refresh-timestamp source, or refresh field.

3. **Save configuration:** Provide **Save** and **Cancel** buttons. Retain the selected table, background color, report orientation, and filter-summary toggle when the workbook is saved and published. An already-configured extension must not automatically reopen setup. Configuration can only be saved in authoring mode. Disable Save, Cancel, and editable controls while saving; restore them on failure. Closing the native window cannot retract a save already submitted to Tableau.

4. **Icons:** Show a **gear** until configuration is saved. If setup is canceled, clicking the gear must reopen it. After saving, display a **download icon** with **"Download report"** on hover.

5. **Background:** Save and apply the selected background color. Use the same native color-picker approach as Stretch, including the eyedropper where available.

6. **Retrieve data:** Clicking the download icon retrieves all filtered data from the configured table, including rows outside the visible scrolling area.

7. **Report heading:** Use the worksheet name for the current MVP. Capturing the full displayed title, including `<Data Update Time>`, remains unresolved because Tableau's supported extension API does not expose that title.

8. **PDF:** Generate a paginated PDF in the configured **Portrait or Landscape** orientation. Include the heading and retrieved table data. When **Include filters in report** is On, also include the applied dashboard filters and their selections, including complete hierarchical member paths where provided by Tableau. When Off, omit the entire filter-summary section. Turning this toggle Off must not remove filters from the table data. Repeat column headers on every table page and prevent columns from being cut off.

9. **PDF download:** Clicking the configured download icon creates the same PDF and immediately requests a standard file download named after the worksheet. Do not show the embedded PDF viewer, custom Print/Open PDF/Download PDF buttons, or an automatic print dialog. Keep the extension busy until report preparation and the download request finish. A download request is not proof that the file has been saved.

10. **Save location and opening:** Prefer Tableau's native download functionality if a supported extension API can accept the generated PDF. The current public Extensions API exposes no such operation, so this build uses a standard browser download link. Tableau Desktop or the browser controls whether a Save As dialog appears, which folder receives the file, and whether the saved PDF opens automatically. The extension cannot force those behaviors, obtain the saved path, or launch the computer's default PDF viewer. If the file does not open automatically, the user opens the saved PDF to view or print it. A save-location prompt and automatic external opening are desired behaviors, not guaranteed capabilities of this build.

11. **Error messages:** Show a clear message if data retrieval, PDF generation, or initiating the download throws an error. Explain when the selected table has no data to download. Download cancellation, silent host blocking, disk-write failures, and external-viewer failures are not reported back by a standard download link and cannot be detected reliably by the extension.

12. **Name and creator credit:** Name the application **PDF Report Download**. The setup screen displays **Created by Nefi Bernal** and a **LinkedIn profile** link to https://www.linkedin.com/in/nefi-bernal/. The creator credit is not a setup option and is not included in the application name.
