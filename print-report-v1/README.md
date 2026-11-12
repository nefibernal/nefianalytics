# Nefi Print Report - fresh build 1.0.0

This is a NEW standalone extension package with a different folder, manifest ID, and saved-settings key. It does not reuse your previous setup or URLs. Follow these steps to test this build rather than the old extension.

## 1. Upload the new folder

1. Unzip `Nefi_Print_Report_Fresh_1_0_0.zip` on your computer.
2. Open https://github.com/nefibernal/nefianalytics.
3. Select **Add file > Upload files**.
4. Drag the extracted **print-report-v1** folder onto the upload page. Keep the assets and tests subfolders inside it. Do not upload the ZIP and do not put this folder inside the old print-extension folder.
5. Click **Commit changes**.
6. Wait for GitHub Pages to deploy.
7. Open https://nefibernal.github.io/nefianalytics/print-report-v1/. It should show **Fresh build 1.0.0**.

Your old extension files remain untouched. This new URL prevents them from being confused with the rebuild.

## 2. Tableau extension allowlist

If you already added this wildcard to **Settings > Extensions > Enable Specific Extensions**, it covers the fresh build:

```
https://nefibernal.github.io/nefianalytics/.*
```

Otherwise add the exact extension URL:

```
https://nefibernal.github.io/nefianalytics/print-report-v1/extension.html?build=1.0.0
```

Enable extensions for the site. This extension does not request Full Data Access. Normal permission to access workbook summary data is still needed.

## 3. Add the NEW extension in Tableau Desktop

1. Open a dashboard containing a table worksheet. Use a test copy of the workbook.
2. Remove the old print extension from this test dashboard so you can distinguish the rebuild.
3. Drag an **Extension** object onto the dashboard.
4. Select **Access Local Extensions**.
5. Select **Nefi_Print_Report_1_0_0.trex** from the NEW print-report-v1 folder.
6. Accept Tableau's third-party permission prompt. After successful Tableau initialization, setup must open automatically; no gear click is needed for that first setup.
7. Check the footer reads **Print Report 1.0.0**. Setup must contain exactly:
   - Table to print
   - Background color
   - Report orientation: Portrait / Landscape
8. Select the table, color and orientation, then **Save**. The gear becomes a printer. If you select **Cancel**, the gear remains and can reopen setup.
9. Make the extension Floating and place it where you want it. A size of roughly 38 x 38 pixels works for the icon.
10. Save the workbook, then publish it when ready to test Cloud.

If you see Report name or Data-refresh timestamp source, you are viewing the old extension or old folder, not this build.

Use the extension object's **Configure** menu to change saved setup later. Reopening a configured workbook must not automatically open setup.

## 4. Print and check the report

1. Apply filters to the dashboard.
2. Click the printer icon.
3. The report window creates a PDF in memory and attempts to open the print dialog when the PDF viewer loads.
4. If automatic printing is unavailable, use **Print**, **Open PDF**, or **Download PDF** in the report window. Opening a downloaded PDF in a local PDF reader is the dependable fallback if Tableau Desktop's embedded browser cannot display PDFs.
5. Check that every row is present, column headers repeat, filters match, and page orientation matches setup.
6. Test the other orientation through Configure, Save, and print again.

## Scope and platform facts

- Minimum Tableau 2022.4 for paged summary-data retrieval. Worksheet-level number/date formatting improves on 2025.1+.
- The PDF heading is the worksheet name. It is not the custom displayed title and does not capture `<Data Update Time>` from that title. The extension contains no refresh-time lookup, controls, or separate refresh line.
- This is a data report for flat text tables, not a screenshot or clone of Tableau formatting. Columns/rows follow summary-data API output. Validate pivoted tables, sorting and total bands against your specific worksheet before relying on them.
- Read all reader pages; there is no added fixed row-count cutoff. Browser memory and Tableau limits can still cause an explicit failure. Do not interpret the absence of a fixed cutoff as an unlimited-data guarantee.
- A worksheet mark highlight does not restrict the report to highlighted rows. Filters and dashboard filter actions do affect it.
- Collect worksheet filters across the dashboard and label their worksheet scope. Tableau may not expose database predicates, security rules or parameters used as custom filters as ordinary filter-card selections. Unknown descriptions are labeled as unavailable.
- The chosen page orientation is never changed automatically. A wide table continues onto additional pages with the first column repeated, instead of cutting columns off. Paper size is Letter.
- The native color input is the same control type used by Stretch. Its dialog and eyedropper are provided by Desktop's embedded browser or the viewing browser.
- The actual OS print dialog and printer failures are controlled by the environment. The extension cannot detect that a viewer canceled printing or a physical printer failed. The generated PDF remains accessible as a fallback.
- No report data is uploaded or stored in browser storage by this extension. PDF creation uses locally bundled libraries. Configuration alone is saved using Tableau settings.

## Package contents

- `Nefi_Print_Report_1_0_0.trex`: manifest to load into Tableau.
- `extension.html`, `extension.js`: icon and lifecycle, including automatic setup.
- `setup.html`, `setup.js`: exactly three configuration controls.
- `data.js`: Tableau settings, full paged summary data, and filter descriptions.
- `view.html`, `view.js`, `pdf.js`: PDF creation, pagination, preview and printing.
- `ui.css`: styles.
- `assets/`: locally bundled SDK, PDF libraries, report font and licenses.
- `REQUIREMENTS.md`: the ten agreed requirements, for records.
- `VALIDATION.md`: tested behavior, evidence and live acceptance checklist.
- `tests/`: reproducible synthetic-data tests and manifest schema.

## Developer references

- https://tableau.github.io/extensions-api/docs/core/trex_configure/
- https://tableau.github.io/extensions-api/api/interfaces/DataTableReader.html
- https://tableau.github.io/extensions-api/api/interfaces/Settings.html
- https://tableau.github.io/extensions-api/docs/dashext/trex_manifest/
- https://tableau.github.io/extensions-api/api/interfaces/Worksheet.html
