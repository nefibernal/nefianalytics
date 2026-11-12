// Test-only Tableau contract fixture. Never used by the shipped extension.
(() => {
  const saved = new Map();
  let data = [
    { fieldName:'Mark', fieldId:'mark', dataType:'string' },
    { fieldName:'Description', fieldId:'description', dataType:'string' },
    { fieldName:'Pieces', fieldId:'pieces', dataType:'int' },
    { fieldName:'Weight', fieldId:'weight', dataType:'float' }
  ];
  const cell = x => ({value:x,formattedValue:String(x)});
  const rows = Array.from({length:125},(_,i)=>[cell('M-'+String(i+1).padStart(4,'0')),cell('Fabricación - beam '+(i+1)),cell((i%7)+1),cell((i*12.3).toFixed(2)+' lb')]);
  window.mock = { columns:data, rows, releases:0, dialogs:[], saved, failSave:false, empty:false, sourceTime:'2026-11-11T19:30:00Z' };
  const listeners = {};
  function ws(name,refresh=false) {
    return {
      name,
      addEventListener(t,f){(listeners[name+':'+t] ||= []).push(f);return ()=>{};},
      async getDataSourcesAsync(){return [{id:'extract-1',name:'Production data',isExtract:true,extractUpdateTime:mock.sourceTime}];},
      async getFiltersAsync(){return refresh?[]:[{fieldName:'Shop',filterType:'categorical',isAllSelected:false,appliedValues:[cell('Herriman')]},{fieldName:'Scan date',filterType:'range',minValue:cell('11/10/2026'),maxValue:cell('11/10/2026'),includeNullValues:false}];},
      async getSummaryDataReaderAsync(pageSize,opts){
        if(opts && opts.ignoreSelection!==true) throw Error('Expected ignoreSelection');
        const cols = refresh ? [{fieldName:'Refresh timestamp',fieldId:'refresh',dataType:'string'}] : mock.columns;
        const all = refresh ? [[cell('Nov 11, 2026, 12:30 PM MST')]] : mock.empty ? [] : mock.rows;
        // Force several source pages even for small fixtures.
        const size = Math.min(pageSize,50);
        return {totalRowCount:all.length,pageCount:Math.ceil(all.length/size),async getPageAsync(p){if(mock.failRead)throw Error('Read failed');return {columns:cols,data:all.slice(p*size,(p+1)*size),isTotalRowCountLimited:false};},async releaseAsync(){mock.releases++;}};
      }
    };
  }
  const worksheets = [ws('Production table'),ws('Data refresh',true)];
  const settings = {get:k=>saved.get(k),set:(k,v)=>saved.set(k,v),erase:k=>saved.delete(k),async saveAsync(){if(mock.failSave)throw Error('Save failed');return Object.fromEntries(saved);},addEventListener(t,f){(listeners['settings:'+t] ||= []).push(f);}};
  window.tableau={ErrorCodes:{DialogClosedByUser:'dialog-closed-by-user'},TableauEventType:{SettingsChanged:'settings-changed',FilterChanged:'filter-changed',SummaryDataChanged:'summary-data-changed',ParameterChanged:'parameter-changed'},extensions:{
    settings,environment:{mode:'authoring'},dashboardContent:{dashboard:{worksheets,async getParametersAsync(){return [];}}},
    async initializeAsync(o){mock.configure=o.configure;},async initializeDialogAsync(){return window.TEST_PAYLOAD||'';},
    ui:{async displayDialogAsync(url,payload,options){mock.dialogs.push({url,payload,options});return 'saved';},closeDialog(payload){mock.closed=payload;}}
  }};
})();
