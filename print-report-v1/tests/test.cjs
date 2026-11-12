const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const base=path.resolve(__dirname,'..'),results=[];
const record=s=>{results.push(s);console.log('PASS: '+s);};
const delay=()=>new Promise(r=>setTimeout(r,5));
async function wait(fn){for(let i=0;i<400;i++){if(fn())return;await delay();}throw Error('Timed out waiting for state');}
function environment(file){
 const dom=new JSDOM(fs.readFileSync(path.join(base,file),'utf8'),{runScripts:'outside-only',url:'https://example.test/print-report-v1/'+file,pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=dom.window;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.HTMLCanvasElement.prototype.getContext=()=>({measureText:s=>({width:s.length*6})});
 const load=name=>w.eval(fs.readFileSync(path.join(base,name),'utf8'));
 load('tests/fixture.js');load('data.js');return {w,load,dom};
}
(async()=>{
 const all=[];const e=environment('extension.html');all.push(e);e.load('extension.js');
 await delay();assert.equal(e.w.fixture.calls.length,0);record('Setup does not open before Tableau initialization/permission approval');
 e.w.fixture.approve();await wait(()=>e.w.fixture.calls.length===1);
 assert.match(e.w.fixture.calls[0].url,/setup.html\?build=1.0.1$/);record('Unconfigured extension automatically opens setup immediately after successful initialization');
 e.w.fixture.calls[0].resolve(JSON.stringify({saved:false}));await wait(()=>!e.w.document.querySelector('#launch').disabled);
 assert.equal(e.w.document.querySelector('#launch').title,'Set up print report');await delay();assert.equal(e.w.fixture.calls.length,1);record('Cancel leaves a gear and does not automatically reopen setup');
 e.w.document.querySelector('#launch').click();await wait(()=>e.w.fixture.calls.length===2);record('Gear reopens canceled setup');
 const config={table:'Production table',color:'#e7edf2',orientation:'landscape'};
 await e.w.PrintData.save(config);e.w.fixture.calls[1].resolve(JSON.stringify({saved:true,config}));await wait(()=>!e.w.document.querySelector('#launch').disabled);
 assert.equal(e.w.document.querySelector('#launch').title,'Print report');assert.equal(e.w.document.body.style.backgroundColor,'rgb(231, 237, 242)');record('Saved configuration switches to printer with correct tooltip and background');
 const existing=environment('extension.html');all.push(existing);existing.w.fixture.saved.set(existing.w.PrintData.key,JSON.stringify(config));existing.load('extension.js');existing.w.fixture.approve();await wait(()=>!existing.w.document.querySelector('#launch').disabled);assert.equal(existing.w.fixture.calls.length,0);record('Existing saved configuration skips automatic setup on reopen');
 e.w.document.querySelector('#launch').click();await wait(()=>e.w.fixture.calls.length===3);
 const report=JSON.parse(e.w.fixture.calls[2].payload).report;
 assert.equal(report.rows.length,125);assert.equal(report.rows[124][0],'M-0125');assert.equal(report.title,'Production table');assert.equal(report.orientation,'landscape');assert.equal(report.filters.length,2);assert.equal('refresh' in report,false);e.w.fixture.calls[2].resolve(' ');await wait(()=>!e.w.document.querySelector('#launch').disabled);record('Print retrieves every data page, current filters, worksheet heading, and saved orientation');
 const original=e.w.fixture.rows;e.w.fixture.rows=Array.from({length:10001},(_,i)=>[{formattedValue:String(i)},cell('x'),cell('1'),cell('2')]);function cell(s){return {formattedValue:s};}
 const data=await e.w.PrintData.table(e.w.fixture.worksheet);assert.equal(data.rows.length,10001);assert.equal(data.rows[10000][0],'10000');e.w.fixture.rows=original;record('More than 10,000 rows are retrieved completely');
 const before=e.w.fixture.releaseCount;e.w.fixture.failPage=true;await assert.rejects(e.w.PrintData.table(e.w.fixture.worksheet),/Data read failed/);assert.equal(e.w.fixture.releaseCount,before+1);e.w.fixture.failPage=false;record('Data-reader resources are released after a retrieval failure');
 const cfg=environment('setup.html');all.push(cfg);cfg.load('setup.js');await wait(()=>!cfg.w.document.querySelector('#save').disabled);const d=cfg.w.document;
 assert.deepEqual([...d.querySelectorAll('select,input')].map(n=>n.id||n.name),['table','color','orientation','orientation','includeFilters']);assert.equal(d.querySelector('#includeFilters').checked,true);assert.deepEqual([...d.querySelectorAll('input[name=orientation]')].map(n=>n.value),['portrait','landscape']);assert.equal(d.querySelector('#color').type,'color');record('Setup includes only table, color, orientation, and filter-summary toggle; toggle defaults On');
 d.querySelector('#table').value='Production table';d.querySelector('#color').value='#e7edf2';d.querySelector('input[value=landscape]').checked=true;d.querySelector('#save').click();await wait(()=>cfg.w.fixture.closed?.saved);
 assert.equal(cfg.w.PrintData.config().orientation,'landscape');assert.deepEqual(Object.keys(JSON.parse(cfg.w.fixture.saved.get(cfg.w.PrintData.key))).sort(),['color','includeFilters','orientation','table']);assert.equal(cfg.w.PrintData.config().includeFilters,true);record('Save persists the filter-summary toggle with the existing settings');
 d.querySelector('#save').disabled=false;cfg.w.fixture.failSave=true;d.querySelector('input[value=portrait]').checked=true;d.querySelector('#save').click();await wait(()=>d.querySelector('#problem').textContent.includes('Save failed'));assert.equal(cfg.w.PrintData.config().orientation,'landscape');record('Failed Save retains the previously saved orientation');
 cfg.w.fixture.failSave=false;d.querySelector('#includeFilters').checked=false;d.querySelector('#save').click();await wait(()=>cfg.w.PrintData.config()?.includeFilters===false);record('Toggle Off is saved');
 const restored=environment('setup.html');all.push(restored);restored.w.fixture.saved.set(restored.w.PrintData.key,JSON.stringify({table:'Production table',color:'#e7edf2',orientation:'landscape',includeFilters:false}));restored.load('setup.js');await wait(()=>!restored.w.document.querySelector('#save').disabled);assert.equal(restored.w.document.querySelector('#includeFilters').checked,false);record('Reopening setup preserves toggle Off');
 const old=environment('setup.html');all.push(old);old.w.fixture.saved.set(old.w.PrintData.key,JSON.stringify(config));old.load('setup.js');await wait(()=>!old.w.document.querySelector('#save').disabled);assert.equal(old.w.document.querySelector('#includeFilters').checked,true);record('Existing settings without a toggle default to On');
 e.w.fixture.saved.set(e.w.PrintData.key,JSON.stringify({...config,includeFilters:false}));e.w.fixture.settingsListener();
 const callCount=e.w.fixture.calls.length;e.w.document.querySelector('#launch').click();await wait(()=>e.w.fixture.calls.length===callCount+1);const offReport=JSON.parse(e.w.fixture.calls.at(-1).payload).report;
 assert.equal(offReport.includeFilters,false);assert.equal(offReport.filters.length,0);assert.deepEqual(offReport.rows,report.rows);e.w.fixture.calls.at(-1).resolve(' ');await wait(()=>!e.w.document.querySelector('#launch').disabled);record('Toggle Off omits filter summary but preserves the identical filtered table rows');
 const cancel=environment('setup.html');all.push(cancel);cancel.load('setup.js');await delay();cancel.w.document.querySelector('#cancel').click();assert.equal(cancel.w.fixture.closed.saved,false);assert.equal(cancel.w.PrintData.config(),null);record('Cancel does not save settings');
 const pdf=environment('view.html');all.push(pdf);['assets/jspdf.umd.min.js','assets/jspdf-autotable.min.js','assets/font.js','pdf.js'].forEach(pdf.load);
 for(const orientation of ['portrait','landscape']){
  const doc=pdf.w.PrintPDF.build({...report,orientation});const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();assert.equal(w<h,orientation==='portrait');fs.writeFileSync(path.join(__dirname,orientation+'.pdf'),Buffer.from(doc.output('arraybuffer')));assert.ok(doc.getNumberOfPages()>1);record('Real '+orientation+' PDF has correct physical page dimensions and pagination');
 }
 const offDoc=pdf.w.PrintPDF.build({...report,includeFilters:false});fs.writeFileSync(path.join(__dirname,'no-filters.pdf'),Buffer.from(offDoc.output('arraybuffer')));record('PDF without filters is generated');
 const wide={...report,orientation:'portrait',columns:Array.from({length:14},(_,i)=>'Column '+(i+1)),rows:Array.from({length:15},(_,i)=>Array.from({length:14},(_,j)=>'col'+(j+1)+'_row'+(i+1)))};
 const wideDoc=pdf.w.PrintPDF.build(wide);assert.ok(wideDoc.getNumberOfPages()>1);fs.writeFileSync(path.join(__dirname,'wide.pdf'),Buffer.from(wideDoc.output('arraybuffer')));record('Wide table remains Portrait as requested and continues onto additional column pages');
 pdf.w.PAYLOAD=JSON.stringify({report});pdf.w.URL.createObjectURL=()=> 'blob:https://example.test/report';pdf.w.URL.revokeObjectURL=()=>{};pdf.load('view.js');await wait(()=>!pdf.w.document.querySelector('#download').hidden);pdf.w.document.querySelector('#document').contentWindow.print=()=>{throw Error('Printing blocked');};pdf.w.document.querySelector('#print').click();assert.match(pdf.w.document.querySelector('#status').textContent,/Download PDF/);record('Blocked automatic printing retains Open PDF/Download PDF fallback');
 e.w.fixture.rows=[];e.w.document.querySelector('#launch').click();await wait(()=>e.w.fixture.calls.length===5);assert.match(JSON.parse(e.w.fixture.calls[4].payload).error,/no data to print/);e.w.fixture.calls[4].resolve(' ');await wait(()=>!e.w.document.querySelector('#launch').disabled);record('Empty filtered table shows a clear error dialog');
 fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(results,null,2));all.forEach(x=>x.dom.window.close());console.log('Passed '+results.length+' checks.');
})().catch(e=>{console.error(e);process.exit(1);});
