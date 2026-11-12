# Validation - fresh build 1.0.0

This new package has a distinct folder, URL, manifest ID, and settings key. Old packages were not edited.

## Completed automated checks

18 synthetic Tableau-contract checks passed using Node.js and jsdom:

1. Setup does not open before Tableau initialization/permission approval.
2. Unconfigured extension automatically opens setup immediately after successful initialization.
3. Cancel leaves a gear and does not automatically reopen setup.
4. Gear reopens canceled setup.
5. Saved configuration switches to printer with correct tooltip and background.
6. Existing saved configuration skips automatic setup on reopen.
7. Print retrieves every data page, current filters, worksheet heading, and saved orientation.
8. More than 10,000 rows are retrieved completely.
9. Data-reader resources are released after a retrieval failure.
10. Setup has exactly table, native background picker, and Portrait/Landscape controls; no removed fields.
11. Save persists exactly the three requested settings.
12. Failed Save retains the previously saved orientation.
13. Cancel does not save settings.
14. Real portrait PDF has correct physical page dimensions and pagination.
15. Real landscape PDF has correct physical page dimensions and pagination.
16. Wide table remains Portrait as requested and continues onto additional column pages.
17. Blocked automatic printing retains Open PDF/Download PDF fallback.
18. Empty filtered table shows a clear error dialog.

The real bundled PDF libraries generated Portrait, Landscape, and wide-table PDFs. Python PDF checks confirmed correct physical page dimensions on every page, all 125 sample row IDs, repeated column headers, no refresh-time line, and all fourteen final-row cells in the wide-table sample. Rendered PDF pages were visually reviewed. Native Tableau/OS printing was not simulated as a successful OS action; the blocked-printing fallback was exercised.

The manifest is checked against 34 transitive manifest type/group definitions extracted unchanged from Tableau's official 2026.2 workbook XSD. The standalone namespace, 70x70 PNG icon, required author attributes, source URL, JavaScript syntax and local HTML asset references are checked. `email=""` satisfies the required string attribute without inventing an email address.

## Live Tableau acceptance - still required

- [ ] Add the NEW .trex and accept Tableau's third-party prompt: setup opens automatically.
- [ ] Confirm footer says Print Report 1.0.0 and the only controls are Table to print, Background color, and Portrait / Landscape.
- [ ] Cancel: gear remains and can reopen setup.
- [ ] Save: printer appears; hover says Print report; color matches.
- [ ] Save/reopen the workbook: setup stays closed and settings remain.
- [ ] Publish and open as a Cloud viewer: saved configuration remains.
- [ ] Compare a multi-page table with the PDF: values, order, row count, filter selections and repeated headers.
- [ ] Confirm both orientations produce the requested paper layout.
- [ ] Compare a wide table: every column appears on continuation pages.
- [ ] Confirm the Desktop native color picker and eyedropper in the user's environment.
- [ ] Test automatic printing and Open PDF / Download PDF fallback in Desktop and Cloud.
- [ ] Test no-data and permission/data-access errors.

The test environment used jsdom rather than a native Tableau session. Tests do not establish that Desktop's PDF viewer, OS print dialog, permission handshake, server data shape, or publish persistence work in the user's environment. Those are the live checks above.

## Reproduce the checks

From print-report-v1:

```
npm --prefix tests install --no-audit --no-fund
node tests/test.cjs
python tests/validate.py
```

Python validation needs lxml and Pillow. PDF text checks additionally use pdfplumber; page rendering uses pdftoppm. Test data is invented. No business data is bundled.

Schema source: https://raw.githubusercontent.com/tableau/tableau-document-schemas/main/schemas/2026_2/twb_2026.2.0.xsd
