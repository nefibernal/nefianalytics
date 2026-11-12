const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {JSDOM, VirtualConsole} = require('jsdom');
const root = path.resolve(__dirname,'..');
const dir=root;
const results=[];
const pass=s=>{results.push(s);console.log('PASS:',s);};
const tick=()=>new Promise(r=>setTimeout(r,10));
async function wait(f){for(let i=0;i<200;i++){if(f())return;await tick();}throw Error('Timed out');}
function env(file){
 const dom=new JSDOM(fs.readFileSync(path.join(dir,file),'utf8'),{url:'https://example.test/print-extension/'+file,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=dom.window;
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 w.HTMLCanvasElement.prototype.getContext=()=>({measureText:t=>({width:t.length*6})});
 w.eval(fs.readFileSync(path.join(__dirname,'mock-tableau.js'),'utf8'));
 const load=n=>w.eval(fs.readFileSync(path.join(dir,n),'utf8'));
 return {w,load,dom};
}
(async()=>{
 const {w,load,dom}=env('index.html');load('core.js');load('main.js');
 await wait(()=>!w.document.querySelector('#action').disabled);
 assert.equal(w.document.querySelector('#action').title,'Set up print report');
 w.document.querySelector('#action').click();await wait(()=>w.mock.dialogs.length===1);
 assert.match(w.mock.dialogs[0].url,/configure.html\?v=0.1.3$/);pass('Unconfigured gear opens setup');
 const config={version:3,worksheet:'Production table',background:'#e7edf2'};
 await w.PrintCore.saveConfig(config);await w.mock.configure();
 assert.equal(w.document.querySelector('#action').title,'Print report');
 assert.equal(w.document.body.style.backgroundColor,'rgb(231, 237, 242)');pass('Saved configuration switches to printer and applies background');
 w.document.querySelector('#action').click();await wait(()=>w.mock.dialogs.length===3);
 const model=JSON.parse(w.mock.dialogs[2].payload);
 assert.equal(model.rows.length,125);assert.equal(model.rows[124][0],'M-0125');assert.equal(model.filters.length,2);assert.equal(model.title,'Production table');assert.equal('refresh' in model,false);assert.equal(w.mock.releases,1);pass('Print collects all source pages and filters; uses worksheet name without refresh metadata');
 await wait(()=>!w.document.querySelector('#action').disabled);
 const previous=w.mock.rows;
 w.mock.rows=Array.from({length:10001},(_,i)=>[{formattedValue:String(i)}]);
 const table=await w.PrintCore.readTable(w.PrintCore.sheet('Production table'));
 assert.equal(table.rows.length,10001);assert.equal(table.rows[10000][0],'10000');w.mock.rows=previous;pass('Retrieves all 10,001 rows beyond old 10,000-row limit');
 w.mock.failRead=true;
 await assert.rejects(w.PrintCore.readTable(w.PrintCore.sheet('Production table')),/Read failed/);
 assert.equal(w.mock.releases,3);w.mock.failRead=false;pass('Reader releases Tableau resources even after a read failure');
 w.mock.rows=Array.from({length:50001},()=>[{formattedValue:'x'}]);
 await assert.rejects(w.PrintCore.readTable(w.PrintCore.sheet('Production table')),/50,000/);w.mock.rows=previous;pass('Oversized report stops explicitly rather than truncating');
 w.mock.empty=true;w.document.querySelector('#action').click();await wait(()=>w.document.querySelector('#message').textContent.includes('no data to print'));w.mock.empty=false;pass('Empty table displays a clear error');
 // Refresh metadata is not queried by this build.
 assert.equal(w.PrintCore.refreshValue,undefined);pass('Refresh-time extraction has been removed');
 const cfg=env('configure.html');cfg.load('core.js');cfg.load('configure.js');
 await tick();
 const d=cfg.w.document;
 d.querySelector('#worksheet').value=config.worksheet;d.querySelector('#worksheet').dispatchEvent(new cfg.w.Event('change'));
 await wait(()=>!d.querySelector('#save').disabled);
 assert.equal(d.querySelector('#reportName'),null);assert.equal(d.querySelector('#refreshSource'),null);assert.equal(d.querySelector('#refreshField'),null);assert.equal(d.querySelector('#background').type,'color');
 d.querySelector('#background').value='#e7edf2';d.querySelector('#save').click();await wait(()=>cfg.w.mock.closed==='saved');
 assert.equal(cfg.w.PrintCore.readConfig().background,'#e7edf2');assert.deepEqual(Object.keys(JSON.parse(cfg.w.mock.saved.get(cfg.w.PrintCore.KEY))).sort(),['background','version','worksheet']);pass('Setup contains only table selection and native background picker');
 cfg.w.mock.failSave=true;d.querySelector('#save').disabled=false;d.querySelector('#background').value='#123456';d.querySelector('#save').click();await wait(()=>d.querySelector('#error').textContent.includes('Save failed'));
 assert.equal(cfg.w.PrintCore.readConfig().background,config.background);pass('Failed settings save preserves the previous valid configuration');
 cfg.w.mock.failSave=false;
 // Existing workbook settings from the previous version remain valid.
 await cfg.w.PrintCore.saveConfig({...config,version:1,refreshSource:'sheet:Old refresh',refreshWorksheet:'Old refresh',refreshField:'old'});
 assert.equal(cfg.w.PrintCore.readConfig().worksheet,'Production table');pass('Existing configured workbooks remain recognized without reselecting a refresh source');
 const pdf=env('preview.html');
 ['vendor/jspdf.umd.min.js','vendor/jspdf.plugin.autotable.min.js','vendor/report-font.js','report.js'].forEach(pdf.load);
 const doc=pdf.w.PrintReport.createReport(model);
 fs.writeFileSync(path.join(__dirname,'sample-report.pdf'),Buffer.from(doc.output('arraybuffer')));
 assert.ok(doc.getNumberOfPages()>1);pass('Generates a real multi-page PDF with embedded font');
 const wide={...model,columns:Array.from({length:14},(_,i)=>'Column '+(i+1)),rows:Array.from({length:15},(_,i)=>Array.from({length:14},(_,j)=>'col'+(j+1)+'_row'+(i+1))),filters:Array.from({length:65},(_,i)=>({field:'Filter '+i,selection:'Long selection '+('x '.repeat(30)),worksheets:['Production table']}))};
 const wideDoc=pdf.w.PrintReport.createReport(wide);fs.writeFileSync(path.join(__dirname,'wide-report.pdf'),Buffer.from(wideDoc.output('arraybuffer')));assert.ok(wideDoc.getNumberOfPages()>3);pass('Wide table and long filter summary paginate');
 // Exercise preview and failed embedded printing fallback without an OS viewer.
 pdf.w.TEST_PAYLOAD=JSON.stringify(model);
 pdf.w.URL.createObjectURL=()=> 'blob:https://example.test/report';pdf.w.URL.revokeObjectURL=()=>{};
 pdf.load('preview.js');await wait(()=>!pdf.w.document.querySelector('#download').hidden);
 assert.ok(pdf.w.document.querySelector('#open').href.startsWith('blob:'));
 assert.equal(pdf.w.document.querySelector('#download').download,'Production table.pdf');
 pdf.w.document.querySelector('#pdf').contentWindow.print=()=>{throw Error('Print unavailable');};
 pdf.w.document.querySelector('#print').click();assert.match(pdf.w.document.querySelector('#status').textContent,/Download PDF/);pass('Open/download PDF remain available when embedded printing fails');
 fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(results,null,2));
 [dom,cfg.dom,pdf.dom].forEach(d=>d.window.close());
 console.log('All '+results.length+' simulated-contract checks passed.');
})().catch(e=>{console.error(e);process.exit(1);});
