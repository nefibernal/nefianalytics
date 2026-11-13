# Third-party components

The application files in this fresh build were written anew. These third-party dependencies are bundled locally and retain their licenses:

- Tableau Extensions API, official `lib/tableau.extensions.1.latest.js` snapshot at commit `5dbee2af38ec928af109d084fa6571733b05dea5` (unchanged bytes verified against upstream; see assets/SDK_PROVENANCE.txt). Source: https://github.com/tableau/extensions-api. License: assets/Tableau-LICENSE.txt.
- jsPDF 4.2.1. Source: https://github.com/parallax/jsPDF. License: assets/jsPDF-LICENSE.txt. Embedded library notices remain intact.
- jsPDF-AutoTable 5.0.7. Source: https://github.com/simonbengtsson/jsPDF-AutoTable. License: assets/AutoTable-LICENSE.txt.
- DejaVu Sans. Source: https://dejavu-fonts.github.io/. License: assets/Font-LICENSE.txt. Base64 font data is in assets/font.js and is subset into PDFs.

The control `<input type="color">` provides the native picker; no Stretch source code is included.
