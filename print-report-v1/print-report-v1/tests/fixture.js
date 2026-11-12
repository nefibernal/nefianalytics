// Synthetic test data and a controlled Tableau API contract; never loaded by the extension.
(function(){
 const state={calls:[],saved:new Map(),failSave:false,failPage:false,releaseCount:0,initialConfig:null,permissionApproved:false};
 const cell=v=>({value:v,formattedValue:String(v)});
 state.columns=['Mark','Description','Pieces','Weight'].map((n,i)=>({fieldName:n,fieldId:String(i)}));
 state.rows=Array.from({length:125},(_,i)=>['M-'+String(i+1).padStart(4,'0'),'Fabricación - beam '+(i+1),String(i%7+1),(i*12.3).toFixed(2)+' lb'].map(cell));
 let allow;const permission=new Promise(resolve=>allow=resolve);
 const listeners={};
 const worksheet={name:'Production table',addEventListener(t,f){(listeners[t]||=[]).push(f);return ()=>{};},async getFiltersAsync(){return [{filterType:'categorical',fieldName:'Shop',appliedValues:[cell('Herriman')],isAllSelected:false},{filterType:'range',fieldName:'Scan date',minValue:cell('11/10/2026'),maxValue:cell('11/10/2026')}];},async getSummaryDataReaderAsync(size,options){if(options.ignoreSelection!==true)throw Error('Selection handling incorrect');const data=state.rows,columns=state.columns,pageSize=Math.min(50,size);return {pageCount:Math.ceil(data.length/pageSize),totalRowCount:data.length,async getPageAsync(p){if(state.failPage)throw Error('Data read failed');return {columns,data:data.slice(p*pageSize,(p+1)*pageSize)};},async releaseAsync(){state.releaseCount++;}};}};
 const settings={get:k=>state.saved.get(k),set:(k,v)=>state.saved.set(k,v),erase:k=>state.saved.delete(k),async saveAsync(){if(state.failSave)throw Error('Save failed');},addEventListener(t,f){state.settingsListener=f;}};
 const dashboard={worksheets:[worksheet],async getParametersAsync(){return [];}};
 window.fixture=Object.assign(state,{approve(){state.permissionApproved=true;allow();},worksheet,listeners});
 window.tableau={ErrorCodes:{DialogClosedByUser:'dialog-closed-by-user'},TableauEventType:{SettingsChanged:'settings',FilterChanged:'filter',SummaryDataChanged:'summary',ParameterChanged:'parameter'},extensions:{settings,dashboardContent:{dashboard},async initializeAsync(callbacks){state.configure=callbacks.configure;await permission;},async initializeDialogAsync(){return window.PAYLOAD||'';},ui:{displayDialogAsync(url,payload,options){return new Promise((resolve,reject)=>state.calls.push({url,payload,options,resolve,reject}));},closeDialog(payload){state.closed=JSON.parse(payload);}}}};
})();
