# Testing status - v0.1.2

## Completed simulated checks

18 checks passed using Node.js/jsdom and a simulated Tableau API contract:

1. Unconfigured gear opens setup.
2. Saved configuration switches to printer and applies background.
3. Print collects all source pages, filters, and actual extract-refresh time.
4. Retrieves all 10,001 rows beyond old 10,000-row limit.
5. Reader releases Tableau resources even after a read failure.
6. Oversized report stops explicitly rather than truncating.
7. Empty table displays a clear error.
8. Missing refresh metadata still creates the report with the unavailable label.
9. Live data needs no refresh setup and prints the unavailable label.
10. Invalid timestamps are not substituted with the print time.
11. Metadata API failure does not block printing.
12. Multiple data sources retain their own labeled refresh times.
13. Setup contains only report name, table, and native background picker.
14. Failed settings save preserves the previous valid configuration.
15. Existing configured workbooks remain recognized without reselecting a refresh source.
16. Generates a real multi-page PDF with embedded font.
17. Wide table and long filter summary paginate.
18. Open/download PDF remain available when embedded printing fails.

The manifest also passes schema validation against the 34 transitive ExtensionManifest-CT definitions from Tableau's official 2026.2 workbook schema, with standalone namespace and 70x70 PNG checks. The required email attribute and icon fix from 0.1.1 is retained.

The PDF library and pagination code are unchanged in this update. Multi-page and wide-table PDFs were regenerated successfully. Earlier PDF text and visual checks verified 125 row identifiers, repeated headers, refresh timestamp, filters, and all 14 columns in the wide sample.

## Still requires live Tableau validation

Desktop's native color picker/eyedropper, workbook permission handling, published-settings persistence, summary data shape/order, automatic printing and PDF viewing need testing in Tableau Desktop/Cloud. Simulated checks are not live Tableau integration tests.

## Reproduce checks

From the print-extension folder:

```
npm --prefix tests install --no-audit --no-fund
node tests/test_extension.cjs
python tests/validate_manifest.py
```

The Python schema check requires lxml and Pillow. All test data is invented.

Schema source: https://raw.githubusercontent.com/tableau/tableau-document-schemas/main/schemas/2026_2/twb_2026.2.0.xsd
