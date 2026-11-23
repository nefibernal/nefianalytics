# Quick KPI Card for Tableau

A Tableau Viz Extension with a configurable header, two KPI rows, and an optional image beside the primary metric. Tableau computes the values and retains its number formatting, including units and suffixes.

## Try it in Tableau Desktop

1. Extract the whole ZIP. In the extracted `quick-kpi-card` folder, double-click `Start-Quick-KPI-Card.cmd` on Windows. The local server opens a preview in your browser. Leave the launcher window open while using Tableau Desktop. If you prefer Python, run `python -m http.server 8765 --bind 127.0.0.1` from the extracted folder.
2. Open a blank worksheet in Tableau Desktop 2024.1 or later. On the Marks card, choose **Add Extension**, then **Access Local Extensions**, and select `Quick-KPI-Card.trex`.
3. Drag one measure from the Data pane to **Primary Metric**. Optionally drag a second measure to **Secondary Metric**. Use each measure pill’s menu to choose Sum, Average, Min, Max, Count, Count (Distinct), or another aggregation Tableau offers for that measure.
4. Select **Format Extension** on the Marks card. Enter a title, choose fonts and colors, and upload an image if desired. Click **Save**, then save the workbook.
5. Place the worksheet on the dashboard. In the dashboard, hide the worksheet title if you are using the card header. Apply dashboard filters to the KPI worksheet to let the card update with them.

Set up the worksheet to return one mark. Fields on Rows, Columns, or Detail can split the results into multiple marks. Put grouping fields on Filters when you want a single aggregate. The card shows a message if the worksheet returns multiple marks. Empty or null values display as a dash.

If the worksheet shows a gray broken-page icon, open `http://localhost:8765/configure.html?preview` in your browser first. When the preview loads, reselect the extension or reload the worksheet in Tableau.

## Preview in a browser

With the same local server running, open `http://localhost:8765/configure.html?preview` to try the formatting dialog and image upload with sample fabrication metrics.

## Publish to Tableau Server or Cloud

Host the extracted folder on an HTTPS static web host. In the .trex manifest, update the source URL to the hosted `index.html` URL. Add the updated manifest to your Tableau worksheet before publishing and confirm the destination site allows that extension URL. Viewers must be able to reach the host. The included localhost manifest is for Desktop testing.

The extension saves the card’s settings and a resized copy of its uploaded image in the workbook's extension settings. Supported source formats are PNG, JPEG, and WebP up to 5 MB. A square image of 96 × 96 px or larger is recommended. The app resizes it to a maximum of 96 px on the longest edge, preserves transparency where supported, and fits it inside a slot no wider than 48 px. Verify image persistence after publishing to your Tableau site.

Text defaults to Tableau Medium, 14 pt, and black. If Tableau Medium is unavailable to the extension web view, it uses the listed fallback fonts. Color controls include Tableau Classic 10 swatches, neutrals, and a browser custom-color picker.
