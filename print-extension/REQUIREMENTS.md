# Tableau Print Extension - MVP requirements

Owner: Nefi Bernal / Nefi Analytics
Version: 0.1.0
Status: first implementation; live Tableau acceptance testing pending.

## Agreed requirements

1. **Initial setup:** Before configuration is saved, display a gear icon. Clicking it opens a setup screen where the author selects the table to print and enters a report name.
2. **Save setup:** Provide a Save button. Retain the selected table and report name when the workbook is saved and published. After setup is saved, replace the gear with a printer icon.
3. **Printer icon:** Hovering over the printer icon shows "Print report."
4. **Background:** Provide a background-color setting using the same native color-control approach as Stretch (`input type="color"`). In Tableau Desktop, the intended experience is visual color selection with the screen-color eyedropper available in that environment. Save the selected color with the setup. No color-code entry is required. The first version uses a solid background because transparency is not confirmed for GitHub-hosted, network-enabled extensions. The exact Desktop picker and eyedropper must be verified in acceptance testing.
5. **Retrieve data:** Clicking the printer retrieves all data from the configured table, reflecting current filters and selections affecting that table, including rows outside the visible scrolling area.
6. **PDF report:** Generate a paginated PDF containing the configured report name, dashboard filters and their selections, the actual data-refresh date and time, and all retrieved table data. Filters and refresh time are always included. Repeat column headers on every page containing table data. Do not cut off columns.
7. **Printing:** Open the print dialog after generating the PDF. If it cannot open automatically, provide access to the generated PDF so the viewer can open and print it.
8. **Error messages:** Display a clear message when retrieval, generation, or printing fails. If the table has no data for current selections, explain that there is no data to print.
9. **Reusability:** The same extension can be used on similar reports by configuring the target table and report name.

## Version-one implementation decisions

These explain how the agreed behavior is implemented; they are not additional product features.

- Target: ordinary flat text tables. This is a data report, not a screenshot of Tableau. Complex pivoted crosstabs, Tableau-rendered subtotal/grand-total bands, and exact replication of Tableau's layout are not promised in this MVP. Summary columns/rows are printed in the order returned by Tableau; validate the resulting order against the intended worksheet.
- Use the worksheet summary-data reader and retrieve every page. Table filters and parameter-driven calculations affect the returned data. Merely highlighting marks does not restrict the report; dashboard filter actions do. No underlying/raw database records are requested.
- Source the refresh timestamp from a selected extract's `extractUpdateTime`. For live connections, select a worksheet and field containing one actual refresh timestamp. Never substitute the print time or NOW(). If the timestamp is unavailable, stop with an error.
- Collect filters exposed by worksheets on the dashboard; preserve worksheet scope. Filters internal to the database, row-level security rules, and parameters used as custom filters are not automatically exposed as ordinary worksheet filters. Unsupported filter descriptions are explicitly labeled unavailable. The first live test must check the actual dashboard's filter types.
- Letter paper; automatic portrait/landscape selection based on column count; repeated report header and page numbers. Wide tables are split horizontally with the first column repeated. There is no paper/orientation setup added to this MVP.
- Maximum 50,000 table rows per report in this browser-based first version. Larger results stop with a message; they are never silently shortened. This is a disclosed MVP limit, not a claim to support unlimited data.
- The browser/embedded PDF viewer controls whether automatic printing is honored. Always expose Open PDF and Download PDF in the report window. OS printer errors and a viewer canceling a print job cannot reliably be detected by the extension.
- The native color control is used directly, as in Stretch. Picker appearance/eyedropper availability is controlled by Tableau Desktop's embedded browser or the viewing browser, not by extension code.
- Save through Tableau extension settings. The author must also save/publish the workbook to persist the setup for other viewers.
- PDFs are generated in memory; no report values are uploaded, logged, or written to browser storage by the extension. Libraries and the font are served from this extension's own folder.

## Acceptance checklist in Tableau

- [ ] Add the `.trex` in Desktop; confirm gear icon and setup screen.
- [ ] Enter a report name, choose table/refresh source and background color; Save.
- [ ] Confirm the native Desktop picker includes the eyedropper in the user's environment.
- [ ] Confirm printer icon and "Print report" tooltip.
- [ ] Save, close, and reopen the workbook; setup is retained.
- [ ] Publish to Tableau Cloud; setup is retained for a viewer.
- [ ] Print a filtered table spanning several pages; compare row count and first/last rows.
- [ ] Compare source table column/row order, aliases, and numeric/date values to the PDF.
- [ ] Confirm filter labels/selections and worksheet scope match the dashboard.
- [ ] Confirm the refresh time matches the actual extract or configured refresh field.
- [ ] Verify repeated headers and wide-table column coverage.
- [ ] Verify automatic printing and Open PDF / Download PDF fallbacks in Desktop and Cloud.
- [ ] Verify empty data, missing timestamp, and denied-access errors.
