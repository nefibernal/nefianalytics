# Validation — application build 1.0.4

**Code fixes and synthetic checks passed. Native Tableau download/save/open acceptance remains unverified.**

## Completed checks

- All 28 original contract checks plus one PDF-header view-order check passed (29 total): setup sequencing, settings/defaults, cancellation, all reader pages including 10,001 rows, cleanup, real PDF orientations/pagination, wide tables, download filename/request, errors, and zero-row selections.
- All 17 prior regression checks plus eight Muse-review regression checks passed (25 total): hierarchy path/nested values/All/empty; authoring-only setup/save; configured viewer downloads; pending-save locking; preserving retrieval errors during cleanup; avoiding unrelated filter metadata when summary is Off; filters/settings/parameters changing during retrieval; missing worksheets; permission/initialization and setup-dialog failures; filter ordering; and correct cancellation identification.
- Seven PDF checks passed: portrait/landscape physical sizes, all 125 sample records in order, repeated headings and column headers, omitted filter summary, every one of 210 wide-table cells, repeated first column, visible wide headings in both MuPDF and Poppler, accented/Greek/Cyrillic text, long wrapped content within page bounds, and all 10,001 load-test rows in order with headers repeated over 401 pages.
- JavaScript syntax, manifest against bundled schema, 70×70 icon, local HTML asset references, checksum inventory, and first-party source formatting passed.

The earlier report of missing wide-table headings was an incorrect visual observation. Cropped renders and pixel counts confirmed the title in the original output and current output. No PDF layout change was required to address that observation.

## Load-test measurement

A synthetic seven-column, 10,001-row report generated a 401-page PDF of 1,273,488 bytes. One Node.js v24.22.1/jsdom run took approximately 6.3 seconds and reported approximately 456 MiB peak resident process memory. This includes test-process overhead and is not a measurement of Tableau Desktop. The actual workbook, browser, available memory, row text length, fonts, and number of columns affect performance. The user's 1,432-page report was not reproduced.

PDF generation remains synchronous and can pause the UI during large reports. A status update is painted before PDF construction. All rows are still held in memory, and there is no arbitrary fixed row limit added by this extension.

## Live acceptance still required

1. Upload the new print-report-v1 folder and wait for GitHub Pages deployment.
2. Reload the existing extension without removing it. Confirm the download arrow, build 1.0.4, and retained settings.
3. In Desktop authoring mode, save setup and download a representative filtered report.
4. Check that the host actually saves the PDF; open that saved file in Edge/Adobe Reader and verify all rows, filters, orientation, and headers.
5. Record Save As and automatic external-opening behavior. These are host-controlled and cannot be guaranteed or confirmed by the extension.
6. Publish and test configured viewer downloads in Tableau Cloud separately, if required.
7. Test long/wide and large real reports within the intended machine's capacity.

The extension displays only **PDF download requested**. A standard download link cannot report silent host blocking, cancellation, disk-write failures, or external-reader launch failures. These tests do not resolve the prior removal crash.

## Reproduce

From the extension folder:

```
npm --prefix tests ci --no-audit --no-fund
node tests/test.cjs
node tests/regression.cjs
node tests/pdf-quality.cjs
python3 tests/validate.py
python3 tests/validate_pdf.py
node tests/node_modules/prettier/bin/prettier.cjs --check '*.js' '*.html' ui.css 'tests/*.cjs' tests/fixture.js
```

JavaScript test dependencies are pinned in tests/package-lock.json. Python checks require lxml, Pillow, and PyMuPDF; rendering requires Poppler's pdftoppm. Test scripts generate synthetic PDFs and result JSON files, which are not workbook data. The ZIP omits node_modules and generated sample PDFs; they are recreated by these commands.

## Muse-review pass — same application build 1.0.4

- Summary-reader fixture columns and their cells are now returned alphabetically. Separate summary-column metadata supplies view order. The report headers and every cell are restored to view order before PDF generation, using field IDs with a field-name fallback.
- Added checks confirm metadata is requested before opening the reader, mapping works across pages, field IDs take precedence for duplicate captions, name fallback works without IDs, unmatched metadata fails with reader cleanup, and later-page identity changes are still rejected.
- An actual generated PDF's AutoTable headers are checked against `Mark, Description, Pieces, Weight`, while the fixture reader supplies `Description, Mark, Pieces, Weight`. PDF text validation also checks header reading order in the generated portrait and landscape files.
- Manifest version and URL query are checked for 1.0.4, and the display name is checked for PDF Report Download, with the existing extension ID and settings key retained. The filename remains `Nefi_Print_Report_1_0_0.trex`.
- Formatted `%null%` and `%missing%` values are checked for empty output; valid zero values are retained.
- The download timer is checked for 1,800,000 ms (30 minutes), with timed revocation still working.

Totals: **54 simulated contract/regression checks and seven PDF validation checks passed**. Syntax, schema, referenced assets, formatting, and dependency checksums passed. Dependencies and PDF layout code were not changed in this pass.

Required Desktop acceptance: confirm that the host accepts a generated Blob download at all, and confirm column order and corresponding values on a real worksheet. Save location and automatic external opening remain host-controlled. The live site has not been modified by producing this ZIP.

## Name and setup-credit verification

The presentation update names the app **PDF Report Download** and adds **Created by Nefi Bernal** plus the supplied LinkedIn link to setup. Targeted DOM checks verify the setup heading, credit text, exact URL, link safety attributes, and unchanged four-setting form. The existing 25 regression checks were rerun with the new name, together with syntax/schema/reference/checksum and source-formatting checks. The prior 29 contract and seven PDF checks remain applicable to the unchanged report logic; they were not repeated solely for the display-name change. External LinkedIn opening in native Tableau still depends on the host.
