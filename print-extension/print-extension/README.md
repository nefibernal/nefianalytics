# Nefi Print Report - first version

A reusable Tableau dashboard extension for printing a filtered flat table as a paginated PDF.

## 1. Upload to your existing GitHub repository

1. Extract `Nefi_Print_Extension_MVP_v0_1.zip` on your computer.
2. Open https://github.com/nefibernal/nefianalytics and select the **Code** tab.
3. Choose **Add file > Upload files**.
4. Drag the extracted **print-extension folder** into the upload area. Keep the folder and its `vendor` subfolder intact. Do not upload the ZIP itself.
5. Verify file names begin with `print-extension/`, then select **Commit changes**.
6. Wait for GitHub Pages to finish deploying.
7. Open https://nefibernal.github.io/nefianalytics/print-extension/README.html to verify the upload.

Do not replace your repository's existing homepage `index.html`. These files all live in the separate `print-extension` folder.

## 2. Allow the extension in Tableau Cloud

As site administrator, go to **Settings > Extensions > Enable Specific Extensions** and add this exact URL:

https://nefibernal.github.io/nefianalytics/print-extension/index.html

Allow extensions to run. This version does not request Full Data Access: it reads worksheet summary data, worksheet filters, and extract metadata. Viewers still need workbook access and permission to access summary data. The normal extension permission prompt may appear.

## 3. Add and configure in Tableau Desktop

Requires Tableau Desktop/Server 2022.4 or later (summary-data reader). Worksheet-level numeric/date formatting support is improved in Tableau 2025.1+.

1. Open your dashboard in Tableau Desktop.
2. Drag an **Extension** object onto the dashboard.
3. Select **Access Local Extensions** and open `Nefi_Print_Report.trex` from the extracted folder.
4. Allow the extension to run if prompted.
5. Click the **gear** to open setup.
6. Enter the report name and select the table worksheet.
7. Click the background color swatch and choose the background color. It uses the same native HTML color control as Stretch; the Desktop environment controls eyedropper availability.
8. Click **Save**. The icon becomes a printer.
9. Make the extension **Floating**, resize to roughly 38 x 38 pixels, and position it on the dashboard. Set Tableau object padding/borders as desired.
10. **Save and publish the workbook** to retain the setup for viewers.

The data-refresh timestamp is automatic. There are no refresh-source or refresh-field controls. Each report reads the selected table's data-source metadata. If Tableau does not provide a valid extract timestamp (including live connections), the report shows **Data refresh time unavailable** and continues printing. When the table uses several sources, each source is listed with its own timestamp or unavailable message; the extension does not choose a single newest timestamp.

To change setup later, use the extension object's menu > **Configure**.

## 4. Print

Click the printer. The extension reads all filtered table rows and creates the PDF in a report window. It tries to open printing when the PDF viewer loads. If no print dialog appears, select **Print**, **Open PDF**, or **Download PDF**. Downloading and opening the PDF in a local PDF reader is the most dependable fallback in Desktop environments without an embedded PDF viewer.

The report always includes its name, dashboard worksheet filters, and the actual data-refresh timestamp. Wide tables continue across horizontal page groups with the first column repeated.

## What is included

- `Nefi_Print_Report.trex`: add this manifest to Tableau Desktop.
- `index.html`, `main.js`, `core.js`: icon, saved setup, and Tableau data retrieval.
- `configure.html`, `configure.js`: setup and native color picker.
- `preview.html`, `preview.js`, `report.js`: PDF report window, pagination and printing.
- `styles.css`: visual styles.
- `vendor/`: bundled Tableau SDK, PDF libraries, and report font; upload every file.
- `REQUIREMENTS.md`: agreed requirements and explicit MVP limits.
- `TESTING.md`: completed checks and remaining live Tableau checks.
- `THIRD_PARTY_NOTICES.md` and license files: dependency notices.

## Practical limits

This initial version supports flat tables up to 50,000 rows. It stops rather than silently creating a shortened report. It does not recreate pivoted Tableau layouts or guarantee Tableau-rendered subtotal/grand-total bands. Rows/columns follow Tableau API output, which must be checked against your report. The bundled font supports common English/Spanish text, not every writing system.

The dashboard's filters must remain unchanged while data is collected. The extension stops if it detects an intervening change. It does not alter filters or selections.

Files in this public GitHub Pages repository are public code, but dashboard data is obtained at runtime inside the authorized viewer's Tableau session. Do not upload workbooks, credentials, business data, or generated reports to this folder.

## Technical references

- Tableau DataSource.extractUpdateTime: https://tableau.github.io/extensions-api/api/interfaces/DataSource.html
- Summary reader: https://tableau.github.io/extensions-api/api/interfaces/DataTableReader.html
- Saved settings: https://tableau.github.io/extensions-api/api/interfaces/Settings.html
- Extension dialogs: https://tableau.github.io/extensions-api/api/interfaces/UI.html
- Manifest: https://tableau.github.io/extensions-api/docs/dashext/trex_manifest/
- Native color control: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/color
