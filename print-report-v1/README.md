# Nefi Print Report - application build 1.0.2

This update shows the generated PDF by itself in the built-in viewer. Use the viewer's own print icon. The three custom buttons and automatic print attempt have been removed. The saved Include filters in report toggle is retained.

## Update an existing fresh-build installation

1. Extract the new ZIP.
2. Open https://github.com/nefibernal/nefianalytics.
3. Use **Add file > Upload files** and drag the extracted **print-report-v1** folder into the same repository location, replacing matching files. Do not put it inside another print-report-v1 folder.
4. Commit changes and wait for GitHub Pages deployment to finish.
5. Verify the landing page https://nefibernal.github.io/nefianalytics/print-report-v1/ shows build **1.0.2**.
6. In Tableau, use the existing extension object's menu > **Reload**, then **Configure**.
7. Setup should show **Print Report 1.0.2** and the new **Include filters in report** switch. Leave it On to print filter selections, or turn it Off to omit them; click Save.

**Do not remove and re-add the extension for this update.** The loader manifest, entry URL, extension ID, and settings key are deliberately unchanged from fresh build 1.0.0. Previously saved settings are preserved; the new toggle defaults to On when no saved choice exists. Application scripts and dialog-page requests are versioned 1.0.2.

The loader is still named `Nefi_Print_Report_1_0_0.trex` and its manifest metadata still says 1.0.0. This is intentional so the already-added dashboard extension can load the updated website. Use the setup footer, not the loader metadata, to identify application build 1.0.2. A cached entry page can take time to refresh after GitHub deployment; confirm the landing page and reload again if setup still says 1.0.0.

## New installation

1. Upload the complete print-report-v1 folder to the root of your nefianalytics repository and commit it.
2. Add the included `Nefi_Print_Report_1_0_0.trex` in Tableau Desktop using an Extension object > Access Local Extensions.
3. Accept Tableau's third-party prompt. On successful initialization, setup opens automatically.
4. Choose Table to print, Background color, Report orientation, and the Include filters in report toggle.
5. Save. The gear becomes a printer; Cancel retains a gear that can reopen setup.
6. Save/publish the workbook to retain configuration for viewers.

For Cloud, the existing wildcard safe-list entry covers this build:

```
https://nefibernal.github.io/nefianalytics/.*
```

The unchanged exact entry URL is:

```
https://nefibernal.github.io/nefianalytics/print-report-v1/extension.html?build=1.0.0
```

No new Full Data Access permission is requested. Workbook summary-data access remains necessary.

## Printing

Click the printer. The selected worksheet's filtered summary data is retrieved in pages and rendered to a PDF in the saved Portrait/Landscape orientation. When Include filters in report is On, applied worksheet filters and their selections appear above the table. When Off, no filter heading, summary, or empty filter placeholder is printed. The same filtered table values remain in the PDF.

The report window displays only the built-in PDF viewer. Use its native print icon (the printer in the PDF toolbar) or the PDF viewer's own controls. There are no custom Print/Open PDF/Download PDF buttons and no automatic print-dialog call. A temporary Creating PDF message disappears when the PDF viewer loads.


## Scope

- Tableau 2022.4+ summary-data reader; worksheet-level number/date formatting improves on 2025.1+.
- Flat text tables, not a screenshot. Rows and columns follow Tableau API output; validate pivoted crosstabs, totals, sorting and formats against the worksheet.
- Use worksheet name as heading. The full displayed title and resolved <Data Update Time> are not exposed by the supported extension API. No separate refresh-time feature is included.
- All reader pages are requested; browser memory and Tableau limits can still cause explicit errors. There is no added fixed row-count cutoff.
- Filter actions affect report data. Merely highlighting marks does not restrict printing to highlighted rows.
- Filter descriptions cover worksheet filters exposed by the API and retain worksheet scope. Database predicates, security rules and parameter-based custom filters may not be exposed as ordinary filter descriptions.
- Chosen orientation is honored. Wide tables continue horizontally with the first column repeated; column headers repeat on table pages. Paper size is Letter.
- The native color control provides the Desktop/browser picker and eyedropper where supported.
- Printing is handled by the built-in PDF viewer and operating system. The native viewer must be supported by the Tableau Desktop/browser environment. The reported Desktop removal crash is not fixed by this update.
- Report data stays in memory. No report values are uploaded or stored in browser storage by this code. Configuration is saved using Tableau settings. All runtime libraries are bundled locally.

## Records and tests

- REQUIREMENTS.md: current agreed requirements including the new toggle.
- VALIDATION.md: completed checks and live Tableau checks still required.
- tests/: reproducible synthetic-data checks and manifest schema.
- THIRD_PARTY_NOTICES.md and assets/: dependency notices, font, libraries and licenses.

The removal-crash investigation is deferred. This update makes no claim to fix that crash.
