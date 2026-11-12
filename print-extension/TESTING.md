# Testing status - v0.1.0

## Completed

14 checks passed against a simulated Tableau API contract using Node.js and jsdom:

1. Unconfigured gear opens setup.
2. Saved configuration changes the icon to a printer and applies the selected color.
3. Printing retrieves all source pages, current worksheet filters, and the extract-refresh timestamp.
4. The reader retrieves 10,001 rows without stopping at the old 10,000-row boundary.
5. Readers are released after failures.
6. More than 50,000 rows stops with an explicit message, without a partial PDF.
7. Empty tables produce an error.
8. Missing refresh timestamps are not replaced with print time.
9. Setup saves the report name, worksheet, extract source, and native color input.
10. Failed saves restore previous settings.
11. A worksheet field can supply the actual refresh timestamp for live connections.
12. The actual bundled PDF libraries generate a multi-page PDF with an embedded font.
13. Wide tables and long filter summaries paginate.
14. Open/download PDF controls remain available when embedded printing fails.

PDF text checks confirmed all 125 sample row identifiers, filter selections, refresh timestamps, and repeated column headers. A separate 14-column sample retained all columns and their last-row cells. Rendered PDF pages were visually reviewed for header, table, margin, and pagination layout.

JavaScript syntax, local HTML references, and manifest XML were checked. Bundled dependency file hashes are in `vendor/SHA256SUMS.txt`.

## Still required in the user's Tableau environment

The application has NOT been connected to a live Tableau workbook in this workspace. The native Desktop color dialog, its eyedropper, extension permissions, published-settings persistence, exact summary-data shape/order, browser popup behavior, embedded PDF rendering, and actual printer dialog require manual validation in Tableau Desktop and Tableau Cloud.

A headless Chromium launch was unavailable in this execution environment. The completed UI checks used jsdom; this is not a claim of browser or native Tableau integration testing.

Use the acceptance checklist in REQUIREMENTS.md before production use. The first real worksheet may require adjustments for its data shape, totals, order, or filter types.

## Reproduce the simulated checks (developer use)

From the `print-extension` folder:

```
npm --prefix tests install --no-audit --no-fund
node tests/test_extension.cjs
```

The test fixture uses invented sample data only. It replaces Tableau with a test object and does not contact Tableau or any business data source. Generated test PDFs remain in the tests folder.
