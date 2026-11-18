# Quick KPI Card 1.0

A Tableau Viz Extension that displays one card with two aggregated measures, independent typography, an optional SVG icon, configurable header/card sections, and workbook-persisted settings.

## Defaults
- No border, 0 px corner radius, 4 px card padding
- Primary value 24 px, primary label 14 px
- Secondary value 16 px, secondary label 13 px
- Icon off

## Local development
1. Install Node.js 18+.
2. Supply a trusted development certificate and key, then run:
   `SSL_KEY=/path/key.pem SSL_CERT=/path/cert.pem npm start`
3. Confirm `https://localhost:8765/index.html` loads.
4. In Tableau Desktop 2024.2+, open a worksheet, choose **Add Extension** from the Marks type menu, select **Access Local Viz Extensions**, and load `manifest/QuickKpiCard.trex`.
5. Drag one measure to Metric 1 and one measure to Metric 2.

## GitHub Pages deployment
This build is configured for the `nefibernal/nefianalytics` repository. Place the extension files under `/quick-kpi-card/` in the branch published by GitHub Pages.

The manifest expects the hosted extension at:
`https://nefibernal.github.io/nefianalytics/quick-kpi-card/index.html`

Recommended repository layout:
```
nefianalytics/
  quick-kpi-card/
    index.html
    config.html
    src/
    manifest/
      QuickKpiCard.trex
```

After GitHub Pages is enabled and the page loads successfully over HTTPS, download/use `quick-kpi-card/manifest/QuickKpiCard.trex` as the local Viz Extension manifest in Tableau Desktop.

## Color picker note
The extension is wired to Tableau's native configure-dialog entry point. The included configuration implementation uses browser color inputs as a reliable fallback and stores standard hex colors. If your internal Tableau development framework exposes a native palette component, replace the color input markup in `src/config.js`; the centralized setting paths require no renderer changes.

## Validation
Run `npm test` for schema/default checks. Open `index.html` outside Tableau to see a mock-data preview.
