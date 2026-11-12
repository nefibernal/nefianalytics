# Validation - application build 1.0.1

23 synthetic Tableau-contract checks passed in Node.js/jsdom:

1. Setup does not open before Tableau initialization/permission approval.
2. Unconfigured extension automatically opens setup immediately after successful initialization.
3. Cancel leaves a gear and does not automatically reopen setup.
4. Gear reopens canceled setup.
5. Saved configuration switches to printer with correct tooltip and background.
6. Existing saved configuration skips automatic setup on reopen.
7. Print retrieves every data page, current filters, worksheet heading, and saved orientation.
8. More than 10,000 rows are retrieved completely.
9. Data-reader resources are released after a retrieval failure.
10. Setup includes only table, color, orientation, and filter-summary toggle; toggle defaults On.
11. Save persists the filter-summary toggle with the existing settings.
12. Failed Save retains the previously saved orientation.
13. Toggle Off is saved.
14. Reopening setup preserves toggle Off.
15. Existing settings without a toggle default to On.
16. Toggle Off omits filter summary but preserves the identical filtered table rows.
17. Cancel does not save settings.
18. Real portrait PDF has correct physical page dimensions and pagination.
19. Real landscape PDF has correct physical page dimensions and pagination.
20. PDF without filters is generated.
21. Wide table remains Portrait as requested and continues onto additional column pages.
22. Blocked automatic printing retains Open PDF/Download PDF fallback.
23. Empty filtered table shows a clear error dialog.

PDF text extraction confirms that On includes Applied filters and the sample filter values; Off omits the heading, selections, and empty-filter placeholder. All 125 sample table rows are retained in both PDFs. Portrait and Landscape page dimensions are checked. A rendered Off PDF was visually inspected.

Manifest schema, required attributes, PNG icon, JavaScript syntax and local asset references pass validation. The loader manifest is byte-for-byte unchanged from fresh build 1.0.0; existing workbook configuration is compatible. This avoids requiring extension removal for the toggle update.

## Live checks still required

Native Tableau Desktop/Cloud operation, picker/eyedropper appearance, permission handshake, publish persistence, PDF-viewer support and actual OS print dialog must be checked in the user's environment. Simulated tests are not native Tableau tests. The reported Desktop removal crash is not investigated or fixed in this update.

1. Reload the existing extension after uploading the files; setup footer must show Print Report 1.0.1.
2. Open Configure; turn Include filters in report Off and Save.
3. Print; confirm no filter-summary section, but the correct filtered table rows remain.
4. Open Configure; confirm Off was retained. Turn it On, Save, and print again.
5. Confirm filters return and table values match the Off report.
6. Reopen the saved/published workbook and verify configuration remains.

## Reproduce automated checks

```
npm --prefix tests install --no-audit --no-fund
node tests/test.cjs
python tests/validate.py
```

The Python manifest check needs lxml/Pillow. PDF checks use pdfplumber; rendering uses pdftoppm. All test data is invented.
