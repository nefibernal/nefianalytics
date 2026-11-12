# Third-party components

Bundled locally; no CDN is contacted by the running extension.

- **Tableau Extensions API**, official `lib/tableau.extensions.1.latest.js` snapshot from https://github.com/tableau/extensions-api. See `vendor/Tableau-LICENSE.txt`. The original bundle is retained without stripping embedded notices. The extension manifest requires API 1.10 or later.
- **jsPDF 3.0.3**, https://github.com/parallax/jsPDF. MIT license: `vendor/jsPDF-LICENSE.txt`; original bundled dependency notices remain in `vendor/jspdf.umd.min.js`.
- **jsPDF-AutoTable 5.0.2**, https://github.com/simonbengtsson/jsPDF-AutoTable. MIT license: `vendor/AutoTable-LICENSE.txt`.
- **DejaVu Sans**, https://dejavu-fonts.github.io/. Bitstream Vera / DejaVu license notices: `vendor/DejaVu-LICENSE.txt`. The font is embedded as base64 in `vendor/report-font.js` and subset into generated PDFs.

Stretch is a behavioral reference for the native HTML color input only. No Stretch source code or artwork is included.
