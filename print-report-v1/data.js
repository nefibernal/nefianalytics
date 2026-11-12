/* Tableau contracts and data access, written for Print Report 1.0.0. */
(function(root){
  'use strict';
  const key='nefi.print.report.v1';
  function isConfig(c){return !!(c && typeof c.table==='string' && c.table && /^#[0-9a-f]{6}$/i.test(c.color) && ['portrait','landscape'].includes(c.orientation));}
  function config(){try{const c=JSON.parse(tableau.extensions.settings.get(key)||'null');return isConfig(c)?c:null;}catch(_){return null;}}
  async function save(c){
    if(!isConfig(c))throw Error('Select a table, background color, and orientation.');
    const s=tableau.extensions.settings,old=s.get(key);s.set(key,JSON.stringify(c));
    try{await s.saveAsync();}catch(e){old===undefined?s.erase(key):s.set(key,old);throw e;}
  }
  function worksheet(name){const w=tableau.extensions.dashboardContent.dashboard.worksheets.find(w=>w.name===name);if(!w)throw Error('The configured table is missing. Open Configure and select the table again.');return w;}
  function text(cell){
    if(cell===null || cell===undefined)return '';
    if(typeof cell!=='object')return String(cell);
    if(cell.formattedValue!==null && cell.formattedValue!==undefined)return String(cell.formattedValue);
    return cell.value===null || cell.value===undefined || cell.value==='%null%'?'':String(cell.value);
  }
  async function table(w){
    if(typeof w.getSummaryDataReaderAsync!=='function')throw Error('Printing requires Tableau 2022.4 or later.');
    const reader=await w.getSummaryDataReaderAsync(1000,{ignoreSelection:true,ignoreAliases:false,applyWorksheetFormatting:true});
    let columns=[];const rows=[];
    try{
      for(let i=0;i<reader.pageCount;i++){
        const page=await reader.getPageAsync(i);
        if(page.isTotalRowCountLimited)throw Error('Tableau returned incomplete data. No partial report was created.');
        if(i===0)columns=page.columns.map(c=>c.fieldName);
        if(page.columns.length!==columns.length || page.columns.some((c,j)=>c.fieldName!==columns[j]))throw Error('The table changed while the report was being prepared. Please print again.');
        for(const row of page.data){if(row.length!==columns.length)throw Error('Tableau returned an inconsistent table row.');rows.push(row.map(text));}
      }
      if(rows.length!==reader.totalRowCount)throw Error('Tableau returned an incomplete row count. Please print again.');
      return {columns,rows};
    }finally{await reader.releaseAsync();}
  }
  function selection(f){
    switch(String(f.filterType).toLowerCase()){
      case 'categorical':return f.isAllSelected?'All':(f.isExcludeMode?'Exclude: ':'')+((f.appliedValues||[]).map(text).join(', ')||'(none)');
      case 'range':return (text(f.minValue)||'No lower limit')+' to '+(text(f.maxValue)||'No upper limit')+(f.includeNullValues?' (includes nulls)':'');
      case 'relativedate':case 'relative-date':return [f.rangeType,/n$/i.test(String(f.rangeType))?f.rangeN:'',f.periodType].filter(v=>v!=='' && v!==undefined).join(' ')+(text(f.anchorDate)?'; anchor: '+text(f.anchorDate):'');
      case 'hierarchical':return f.isAllSelected?'All':(f.appliedValues||[]).map(v=>Array.isArray(v)?v.map(text).join(' > '):text(v)).join(', ');
      default:return 'Selection details not exposed by Tableau ('+f.filterType+')';
    }
  }
  async function filters(){
    const sheets=tableau.extensions.dashboardContent.dashboard.worksheets;
    const all=await Promise.all(sheets.map(async w=>(await w.getFiltersAsync()).map(f=>({field:f.fieldName,value:selection(f),sheet:w.name}))));
    const grouped=new Map();
    for(const f of all.flat()){
      const k=JSON.stringify([f.field,f.value]);
      if(!grouped.has(k))grouped.set(k,{field:f.field,value:f.value,sheets:[]});
      grouped.get(k).sheets.push(f.sheet);
    }
    return [...grouped.values()];
  }
  function canceled(e){return e && (e.errorCode==='dialog-closed-by-user' || e.errorCode===tableau.ErrorCodes?.DialogClosedByUser);}
  root.PrintData={key,isConfig,config,save,worksheet,text,table,filters,canceled};
})(globalThis);
