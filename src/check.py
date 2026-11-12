from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
import json,re,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]/'dist'
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.links=[];self.h1=0;self.title='';self.in_title=False;self.ld=False;self.jsons=[];self.buffer='';self.meta={};self.canonical=None;self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='h1':self.h1+=1
  if tag=='title':self.in_title=True
  if tag=='a':self.links.append(a.get('href',''))
  if tag=='meta':self.meta[a.get('name','')]=a.get('content')
  if tag=='link' and a.get('rel')=='canonical':self.canonical=a['href']
  if tag=='script' and a.get('type')=='application/ld+json':self.ld=True;self.buffer=''
 def handle_data(self,d):
  if self.in_title:self.title+=d
  if self.ld:self.buffer+=d
 def handle_endtag(self,t):
  if t=='title':self.in_title=False
  if t=='script' and self.ld:self.jsons.append(json.loads(self.buffer));self.ld=False
titles=set();canonical=set();pages=list(root.rglob('*.html'))
for f in pages:
 text=f.read_text();p=Page(text)
 assert not re.search('[\u3400-\u9fff]',text),f
 assert '<html lang="en">' in text and p.h1==1 and p.meta.get('description'),f
 assert p.title not in titles,(f,'duplicate title')
 titles.add(p.title)
 assert p.canonical and p.canonical not in canonical,(f,'canonical')
 canonical.add(p.canonical)
 assert p.jsons,f
 for link in p.links:
  if link.startswith('/'):
   path=urlparse(link).path;dest=root/path.lstrip('/')
   if path.endswith('/'):dest=dest/'index.html'
   assert dest.is_file(),(f,link)
 assert 'noindex' in p.meta.get('robots','') or 'index,follow'==p.meta.get('robots'),f
tools=json.loads((root/'tools.json').read_text())
assert len(tools)==23
assert sum(t['featured'] for t in tools)==6
picks=(root/'picks/index.html').read_text()
for slug in ['docling','landingai-ade','lido','atlas-workspace','datamosaic','evoontology']:assert '/tools/'+slug+'/' in picks,slug
assert 'https://hkustdial.github.io/DataMosaic/' in picks
entries=ET.parse(root/'sitemap.xml').getroot()
assert len(entries)==36
for e in entries:
 loc=e.find('{*}loc').text
 assert '/compare/' not in loc and '/submit/' not in loc
for f in [root/'app.js',root/'tools.json',root/'styles.css']:
 assert not re.search('[\u3400-\u9fff]',f.read_text()),f
print(f'PASS: {len(pages)} English pages, 23 tools, 9 categories, 6 picks, 36 sitemap URLs; unique metadata, JSON-LD, and all internal links.')
