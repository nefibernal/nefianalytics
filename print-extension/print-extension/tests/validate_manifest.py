from pathlib import Path
from copy import deepcopy
from lxml import etree as E
from PIL import Image
from io import BytesIO
import base64
root = Path(__file__).resolve().parents[1]
doc = E.parse(str(root / "Nefi_Print_Report.trex"))
assert all(E.QName(e).namespace == "http://www.tableau.com/xml/extension_manifest" for e in doc.iter())
# Tableau's published workbook XSD describes the embedded manifest without the standalone namespace.
for e in doc.iter():
    e.tag = E.QName(e).localname
E.XMLSchema(E.parse(str(root / "tests/extension-manifest.xsd"))).assertValid(doc)
assert Image.open(BytesIO(base64.b64decode(doc.find(".//icon").text))).size == (70, 70)
print("Manifest schema and 70x70 PNG icon validated.")
