# Nefi Print Report - v0.1.3

A reusable Tableau dashboard extension for printing a filtered flat table as a paginated PDF.

## Updating an existing installation

1. Upload the entire new print-extension folder into the same GitHub repository location and commit, replacing matching files.
2. Wait for GitHub Pages to finish deployment.
3. Remove the old extension from the test dashboard and add the new **Nefi_Print_Report.trex** included in this ZIP. This manifest requests the versioned entry URL; reloading an old manifest can keep its old cached URL.
4. Open setup and verify **Version 0.1.3**. If you still see a refresh-source control, the previous files or cached page are still loading.
5. A safe-list entry of `https://nefibernal.github.io/nefianalytics/.*` covers the versioned URL. If you allow only an exact URL, update it to the complete source-location URL in the new manifest.

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

https://nefibernal.github.io/nefianalytics/print-extension/index.html?v=0.1.3

Allow extensions to run. This version does not request Full Data Access: it reads worksheet summary data, worksheet filters, and extract metadata. Viewers still need workbook access and permission to access summary data. The normal extension permission prompt may appear.

## 3. Add and configure in Tableau Desktop

Requires Tableau Desktop/Server 2022.4 or later (summary-data reader). Worksheet-level numeric/date formatting support is improved in Tableau 2025.1+.

1. Open your dashboard in Tableau Desktop.
2. Drag an **Extension** object onto the dashboard.
3. Select **Access Local Extensions** and open `Nefi_Print_Report.trex` from the extracted folder.
4. Allow the extension to run if prompted.
5. Click the **gear** to open setup.
6. Select **Table to print**.
7. Choose the **Background color** using the native color picker.
8. Click **Save**. The icon becomes a printer.
9. Make the extension Floating and position it on the dashboard.
10. Save/publish the workbook so viewers retain the configuration.

Setup must show **Version 0.1.3**. There are exactly two options: table and background. There are no report-name or refresh-time controls. The extension does not query extract-refresh metadata and prints no refresh-time section.

**Title limitation:** The supported Tableau Extensions API exposes the worksheet name, not the full rendered worksheet title or resolved <Data Update Time> token. This build uses the worksheet name as the report heading. Capturing the full dynamic displayed title is an unresolved requirement, not a completed feature. See REQUIREMENTS.md.

To change setup later, use the extension object's menu > **Configure**.

## 4. Print

Click the printer. The extension reads all filtered table rows and creates the PDF in a report window. It tries to open printing when the PDF viewer loads. If no print dialog appears, select **Print**, **Open PDF**, or **Download PDF**. Downloading and opening the PDF in a local PDF reader is the most dependable fallback in Desktop environments without an embedded PDF viewer.

The report includes the selected worksheet name and dashboard worksheet filters. It has no separate refresh-time line. Wide tables continue across horizontal page groups with the first column repeated.

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

- Worksheet interface (worksheet name, no rendered title): https://tableau.github.io/extensions-api/api/interfaces/Worksheet.html
- Summary reader: https://tableau.github.io/extensions-api/api/interfaces/DataTableReader.html
- Saved settings: https://tableau.github.io/extensions-api/api/interfaces/Settings.html
- Extension dialogs: https://tableau.github.io/extensions-api/api/interfaces/UI.html
- Manifest: https://tableau.github.io/extensions-api/docs/dashext/trex_manifest/
- Native color control: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/color
