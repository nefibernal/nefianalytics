# Testing status - v0.1.3

## Completed

14 simulated Tableau-contract checks passed using Node.js/jsdom:

1. Unconfigured gear opens setup.
2. Saved configuration switches to printer and applies background.
3. Print collects all source pages and filters; uses worksheet name without refresh metadata.
4. Retrieves all 10,001 rows beyond old 10,000-row limit.
5. Reader releases Tableau resources even after a read failure.
6. Oversized report stops explicitly rather than truncating.
7. Empty table displays a clear error.
8. Refresh-time extraction has been removed.
9. Setup contains only table selection and native background picker.
10. Failed settings save preserves the previous valid configuration.
11. Existing configured workbooks remain recognized without reselecting a refresh source.
12. Generates a real multi-page PDF with embedded font.
13. Wide table and long filter summary paginate.
14. Open/download PDF remain available when embedded printing fails.

Additional checks: manifest XSD and 70x70 PNG icon; JavaScript syntax; local HTML references including versioned query strings; PDF text confirms every sample row, repeated headers, worksheet-name heading, and no refresh-time line or unavailable message. Rendered sample PDF page inspected after header change.

## Title requirement remains unresolved

The full rendered worksheet title and resolved <Data Update Time> text are not exposed by the supported Extensions API. This build uses worksheet.name. Tests do not simulate a nonexistent title API or claim dynamic title capture works.

## Not yet tested live

Native Desktop picker and eyedropper; live Tableau data shape/order and permissions; persistence after publish; automatic print dialog and fallback PDF viewing in Desktop/Cloud. Simulated checks do not establish native Tableau integration.

## Reproduce

```
npm --prefix tests install --no-audit --no-fund
node tests/test_extension.cjs
python tests/validate_manifest.py
```

The Python manifest check needs lxml/Pillow. Its schema definitions come from Tableau's official 2026.2 workbook XSD. All test records are invented.
