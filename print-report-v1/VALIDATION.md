# Validation - application build 1.0.2

25 synthetic Tableau-contract checks passed in Node.js/jsdom:

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
22. PDF opens by itself with no custom controls, duplicate heading, persistent banner, or automatic print call.
23. Report errors remain readable without displaying an empty PDF viewer.
24. PDF generation failure shows a clear message without custom buttons.
25. Empty filtered table shows a clear error dialog.

This update changes only the PDF viewing/printing interface and build references; the PDF generation algorithm is unchanged. The report window now contains a full-window PDF frame and a temporary loading/error message only. Checks confirm no custom Print/Open PDF/Download PDF buttons, duplicate heading, persistent printing banner, timer-based print attempt or scripted print call remains. After the PDF frame loads, the temporary loading text is hidden. Error messages remain readable.

The loader manifest, source URL, extension ID, and settings key are unchanged so the existing extension can be reloaded without removing it. Manifest schema, PNG icon, JavaScript syntax and local asset checks pass.

## Native environment checks still required

jsdom does not render a native PDF viewer or operate an OS print dialog. The user's screenshot confirms that Tableau Desktop can display the PDF in its built-in viewer. The next live check is to reload application 1.0.2, generate the PDF, and use the printer icon in that native PDF toolbar. Native printing, dialog layout, browser PDF preferences, and Desktop/Cloud behavior still require the user's environment. The removal-crash investigation remains deferred.

## Reproduce

```
npm --prefix tests install --no-audit --no-fund
node tests/test.cjs
python tests/validate.py
```

The Python schema checker requires lxml/Pillow. All sample records are invented.
