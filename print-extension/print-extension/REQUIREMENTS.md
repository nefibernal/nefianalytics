# Tableau Print Extension - MVP requirements

Owner: Nefi Bernal / Nefi Analytics
Version: 0.1.3
Status: first implementation; live Tableau testing pending. Full rendered-title capture is not implemented; see requirement 6.

1. **Initial setup:** Display a gear before setup is saved. Clicking it opens setup with exactly two options: the table to print and background color. There is no report-name input and no refresh-source or refresh-field input.
2. **Save:** Provide Save and Cancel. Retain the selected worksheet and color when the workbook is saved/published. After setup is saved, show the printer icon. Existing worksheet/color settings from earlier versions remain usable.
3. **Printer icon:** Display a simple printer icon with the hover text "Print report."
4. **Background:** Use the native color-control approach used by Stretch (`input type="color"`). No color-code entry is required. Desktop's native picker controls eyedropper availability. Save the background color with setup.
5. **Data:** Retrieve all filtered table rows, including rows outside the visible scrolling area. Respect filters and dashboard filter actions affecting the selected table. Do not change the viewer's selections.
6. **Report title - requested behavior and API limitation:** The requested behavior is to copy the table's full displayed title, including dynamic values such as <Data Update Time>. Tableau's supported Extensions API does not expose that rendered title. This requirement remains unresolved. Version 0.1.3 uses the selected worksheet's name as the PDF heading and filename; that is not a claim to capture the displayed title or its dynamic tokens. It does not inspect Tableau's private page DOM, guess title text, or substitute an extract timestamp. If the worksheet name and displayed title match, the heading will match; otherwise they will differ.
7. **PDF:** Generate a paginated PDF with the heading, dashboard filters and their selections, and the complete retrieved table. Repeat column headers on each table page and do not cut off columns.
8. **Refresh time removed:** Do not query extract-refresh metadata or print a separate refresh-time section, including an unavailable message. Refresh time is no longer an extension requirement. Capturing a dynamic date inside a rendered title remains subject to requirement 6.
9. **Printing:** Open printing when possible. Always provide Open PDF / Download PDF when the browser or embedded PDF viewer prevents automatic printing.
10. **Errors:** Show a clear message for data retrieval, PDF generation, or printing failures. Explain when current selections return no data.
11. **Reuse:** Reuse the extension on similar flat tables by selecting a worksheet and background color during setup.

## MVP implementation limits

- Tableau 2022.4+ summary-data reader; formatting improves on Tableau 2025.1+.
- Flat tables; summary columns/rows follow Tableau API output. Complex pivoted layouts and Tableau-rendered total bands are not reproduced. Validate order and values against the source table.
- Maximum 50,000 rows; stop explicitly above this limit rather than silently truncate.
- Letter paper; automatic orientation, repeated heading, and page numbers. Wide tables continue horizontally with the first column repeated.
- Dashboard worksheet filters exposed by the API are listed with their worksheet scope. Database predicates, security rules, and parameter-based custom filters are not automatically exposed as ordinary worksheet filter selections.
- Generate PDFs in memory; do not upload or persist report values to a server or browser storage. Bundle libraries locally.
- Native Desktop/Cloud printing, picker appearance, saved settings, permissions, and data shape need live testing.
- Version app-page and script URLs so a newly loaded manifest requests the new setup screen. Upload all files together and use the included new .trex.

## Acceptance checklist

- [ ] Setup shows Version 0.1.3 and only Table to print / Background color.
- [ ] Save changes gear to printer; tooltip is Print report.
- [ ] Save/reopen and publish preserve configuration.
- [ ] PDF includes every filtered row and repeated column headers.
- [ ] Wide PDF retains every column.
- [ ] Heading matches the selected worksheet name. Do not mark dynamic displayed-title capture as passed.
- [ ] No separate refresh-time line, placeholder, or refresh setup appears.
- [ ] Native color picker and eyedropper work in the user's Desktop environment.
- [ ] Printing and Open PDF / Download PDF fallbacks work in Desktop and Cloud.

## Reference for title limitation

https://tableau.github.io/extensions-api/api/interfaces/Worksheet.html
https://tableau.github.io/extensions-api/api/interfaces/Sheet.html
https://tableau.github.io/extensions-api/api/interfaces/VisualSpecification.html
