# Tableau Print Extension - agreed MVP requirements

Record: build 1.0.2. This document incorporates the user's Portrait/Landscape addition to the last edited requirements. The filter-summary toggle and simple native PDF viewing updates are included.

1. **Automatic initial setup:** When the extension is first added, Tableau displays its third-party extension permission prompt. After the user accepts it, automatically open the setup screen.

2. **Setup options:** Ask for exactly four settings:
   - **Table to print:** The worksheet the extension will connect to.
   - **Background color:** Selected using the native color picker.
   - **Report orientation:** Portrait or Landscape.
   - **Include filters in report:** An On/Off toggle, defaulted to **On**.

   Do not ask for a report name, refresh-timestamp source, or refresh field.

3. **Save configuration:** Provide **Save** and **Cancel** buttons. Retain the selected table, background color, report orientation, and filter-summary toggle when the workbook is saved and published. An already-configured extension must not automatically reopen setup.

4. **Icons:** Show a **gear** until configuration is saved. If setup is canceled, clicking the gear must reopen it. After saving, display a **printer icon** with **"Print report"** on hover.

5. **Background:** Save and apply the selected background color. Use the same native color-picker approach as Stretch, including the eyedropper where available.

6. **Retrieve data:** Clicking the printer retrieves all filtered data from the configured table, including rows outside the visible scrolling area.

7. **Report heading:** Use the worksheet name for the current MVP. Capturing the full displayed title, including `<Data Update Time>`, remains unresolved because Tableau's supported extension API does not expose that title.

8. **PDF:** Generate a paginated PDF in the configured **Portrait or Landscape** orientation. Include the heading and retrieved table data. When **Include filters in report** is On, also include the applied dashboard filters and their selections. When Off, omit the entire filter-summary section. Turning this toggle Off must not remove filters from the table data. Repeat column headers on every table page and prevent columns from being cut off.

9. **PDF viewing and printing:** Generate the PDF as before and open it in the built-in PDF viewer, filling the report window. Let the user print using the viewer's native print control. Do not automatically open the print dialog. Do not display custom Print, Open PDF, or Download PDF buttons, a duplicate report heading above the viewer, or the old printing-instruction banner.

10. **Error messages:** Show a clear message if retrieval, PDF generation, or printing fails. Explain when the selected table has no data to print.
