# Code-review fixes — application build 1.0.4

This build implements corrections to the November 12, 2026 review of build 1.0.3. It preserves the report features, extension identity, settings key, hosted entry path, and download icon. The manifest version and query string identify 1.0.4; the displayed application name is PDF Report Download.

| Review finding | Result |
|---|---|
| Hierarchical filter descriptions | Uses Tableau's documented hierarchicalPath or nested formatted DataValue. All and empty selections are distinct. |
| Settings saved in viewing mode | Main setup, dialog setup, and save helper guard authoring mode. Configured viewers can still download. |
| Cancel competing with pending Save | Save state disables editable controls, Save, and Cancel and blocks duplicate submissions. Controls restore after failure. Native window closure cannot retract a save request already dispatched. |
| Older PDF dependency | jsPDF updated from 3.0.3 to official 4.2.1. AutoTable updated from 5.0.2 to official 5.0.7, whose published peer dependency explicitly includes jsPDF 4. |
| Hard-to-read source | First-party JS, HTML, CSS, and test code formatted consistently. No formatting changes made to distributed vendor code. |
| Filter-summary coupling | With the summary Off, metadata checks cover only the selected worksheet, avoiding unrelated worksheet metadata failures while retaining before/after checks. |
| Cleanup masking retrieval errors | Reader cleanup remains in finally; if retrieval and cleanup both fail, the retrieval error is retained. |
| Reproducibility | SDK exact upstream commit confirmed; dependency provenance, checksums, test lockfile, and formatter version included. |
| Changing settings/parameters during retrieval | Configuration is copied at report start; changes during retrieval prevent a mixed-state report. Filter ordering is normalized before comparisons. |
| Large-PDF testing | A synthetic 10,001-row, seven-column, 401-page PDF was generated and every row was checked in order. This does not establish native Tableau performance or cover every possible large report. |
| Wide-table visual discrepancy | Rechecking cropped images and pixel counts found the headings present in both the old and current renders. The earlier review observation of missing text was incorrect. No layout correction was required for that observation. Both renderers now have an explicit visibility check. |
| Native download, save location, external opening | Still requires live Tableau validation. Code cannot force host acceptance, Save As, or automatic external opening. |

## Validation

- 29 simulated contract checks passed, including an added PDF-header view-order assertion.
- 25 regression checks passed, including the eight Muse-review checks recorded below.
- Seven PDF content/layout/rendering checks passed.
- Syntax, manifest schema, local references, dependency checksums, and source formatting passed.
- Sample PDFs checked with MuPDF and Poppler; wide headings explicitly checked on both pages.

The environment used Node.js/jsdom and PDF tooling. These checks do not operate the user's Tableau Desktop or a native save/open dialog. The previously reported extension-removal crash remains deferred; this build does not claim to fix it.

## Documentation references

- [Settings.saveAsync authoring restriction](https://tableau.github.io/extensions-api/api/interfaces/Settings.html#saveAsync)
- [HierarchicalFilterDataValue](https://tableau.github.io/extensions-api/api/interfaces/HierarchicalFilterDataValue.html)
- [Tableau data-reader guidance](https://tableau.github.io/extensions-api/docs/core/trex_getdata/)
- [jsPDF 4.2.1 release](https://github.com/parallax/jsPDF/releases/tag/v4.2.1)
- [AutoTable 5.0.7 package compatibility](https://github.com/simonbengtsson/jsPDF-AutoTable/blob/v5.0.7/package.json)
- [HTML download behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a#download)
- [Qt download-request handling](https://doc.qt.io/qt-6.8/qwebengineprofile.html#downloadRequested)

## Muse review corrections folded into build 1.0.4

The package had not been uploaded; the application version remains 1.0.4. Only the requested corrections, associated tests, and documentation alignment were applied.

1. **Column order:** Before opening the summary reader, `table()` calls `getSummaryColumnsInfoAsync()` for view-order metadata. It maps that metadata to the first reader page by `fieldId`, falling back to unambiguous `fieldName`, then reorders headers and every row with that map. Existing row-count and page-consistency checks remain; page column identities are checked as well. An incomplete or ambiguous map fails clearly and releases the reader rather than dropping columns. The fixture now returns alphabetically ordered reader columns/cells independently of its view-order metadata. Added tests verify PDF header order, all-page cell order, ID preference, name fallback, unmatched metadata, and page identity changes.
2. **Manifest consistency:** `extension-version` and entry URL query say 1.0.4; the displayed name is PDF Report Download. Extension ID `io.github.nefibernal.printreport.fresh.v1`, settings key `nefi.print.report.v1`, and manifest filename `Nefi_Print_Report_1_0_0.trex` are unchanged.
3. **Formatted missing values:** `text()` converts formatted `%null%` and `%missing%` to an empty string while preserving valid values such as zero.
4. **Download URL lifetime:** Timed Blob URL revocation is extended from five to 30 minutes. Existing unload/error cleanup is retained. A timer test verifies the interval and revocation.

The eight new regression checks cover metadata/reader ordering, name fallback, field-ID preference, mapping failure cleanup, page identity checks, formatted sentinels, 30-minute revocation, and manifest/identity consistency. A separate added contract check asserts actual AutoTable PDF headers match the view order.

Reference: [Tableau's documented DataTableReader column ordering and index-map example](https://help.tableau.com/current/api/embedding_api/en-us/docs/embedding_api_data.html#sort-order-and-the-datatablereader).

Native Desktop download acceptance and column order on a real worksheet remain live-test acceptance items. No new save/open behavior or rendered-title feature was added.

## Application name and creator credit

The application is now **PDF Report Download**. Manifest name/description, setup heading and table label, page titles, landing page, and PDF creator metadata use the download-oriented wording. Setup displays **Created by Nefi Bernal** with the supplied [LinkedIn profile](https://www.linkedin.com/in/nefi-bernal/). The link uses a new tab with noopener/noreferrer. It is a credit, not a fifth setting. Version remains 1.0.4. The extension ID, settings key, hosted folder/path, and legacy manifest filename remain unchanged. This is a presentation change; report retrieval, PDF layout, and download handling are unchanged.
