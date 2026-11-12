from pathlib import Path
from io import BytesIO
from lxml import etree as E
from PIL import Image
import base64, re, subprocess
root=Path(__file__).resolve().parents[1]
doc=E.parse(str(root/'Nefi_Print_Report_1_0_0.trex'))
assert all(E.QName(e).namespace=='http://www.tableau.com/xml/extension_manifest' for e in doc.iter())
for e in doc.iter():e.tag=E.QName(e).localname
E.XMLSchema(E.parse(str(root/'tests/manifest.xsd'))).assertValid(doc)
assert Image.open(BytesIO(base64.b64decode(doc.find('.//icon').text))).size==(70,70)
for p in root.glob('*.js'):subprocess.run(['node','--check',str(p)],check=True)
for p in root.glob('*.html'):
 for link in re.findall(r'(?:src|href)="([^"]+)"',p.read_text()):
  if not link.startswith(('http:','https:','#','blob:')):assert (root/link.split('?')[0]).exists(),(p,link)
print('Manifest schema, PNG icon, JavaScript syntax, and local assets passed.')
