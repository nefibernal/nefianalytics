# Quick KPI Card for GitHub Pages

1. Copy the entire **quick-kpi-card** folder into the publishing source for the **nefianalytics** GitHub Pages site. If Pages publishes from **/docs**, put the folder inside **docs**. Keep the files and the **vendor** folder together.
2. After GitHub Pages publishes the files, open the [browser preview](https://nefibernal.github.io/nefianalytics/quick-kpi-card/index.html?browser).
3. In Tableau Desktop, add **Quick-KPI-Card.trex** from the worksheet's Marks card. This manifest points to the hosted version. If the site URL or folder name differs, update the manifest's **source-location** URL before adding it.
4. For Tableau Server or Cloud, have a site administrator add this URL to **Settings → Extensions → Safe List** and confirm the site can reach GitHub Pages:

   `https://nefibernal.github.io/nefianalytics/quick-kpi-card/index.html`

5. Save and publish the workbook that uses the hosted extension. An existing worksheet using the localhost manifest still points to localhost. To move that worksheet to the hosted version, select the hosted manifest in Tableau Desktop and verify the measure assignments and formatting before publishing.

Tableau loads the hosted extension over HTTPS. Publishers and viewers can use it without a local launcher. The Tableau extension's format dialog displays its entry URL for the safe list.
