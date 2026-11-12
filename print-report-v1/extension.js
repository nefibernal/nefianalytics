(function(){
  'use strict';
  const button=document.getElementById('launch'),notice=document.getElementById('notice');
  const gear='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 3-1 2-2 1-2-.1L2.5 8.5 4 10v3l-1.5 1.5L4 17l2-.1 2 1 1 3h4l1-3 2-1 2 .1 1.5-2.5L18 13v-3l1.5-1.5L18 5.9 16 6l-2-1-1-2Z"/><circle cx="11" cy="12" r="3"/></svg>';
  const printer='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6zM17 11h1"/></svg>';
  let saved=null,busy=false,changes=0;
  const page=(name)=>new URL(name+'?build=1.0.1',location.href).href;
  function paint(){
    button.innerHTML=saved?printer:gear;
    button.title=saved?'Print report':'Set up print report';button.setAttribute('aria-label',button.title);button.disabled=busy;
    const color=saved?.color||'#ffffff';document.body.style.backgroundColor=color;
    const rgb=color.slice(1).match(/../g).map(v=>parseInt(v,16));document.body.style.color=rgb[0]*.299+rgb[1]*.587+rgb[2]*.114<140?'#ffffff':'#222222';
  }
  async function showError(message){
    notice.textContent=message;
    try{await tableau.extensions.ui.displayDialogAsync(page('view.html'),JSON.stringify({error:message}),{width:520,height:260});}catch(_){}
  }
  async function configure(){
    if(busy)return;busy=true;notice.textContent='';paint();
    try{
      const result=await tableau.extensions.ui.displayDialogAsync(page('setup.html'),JSON.stringify(saved||{}),{width:500,height:620});
      const response=JSON.parse(result||'{}');
      if(response.saved && PrintData.isConfig(response.config))saved=response.config;
      else saved=PrintData.config()||saved;
    }catch(e){if(!PrintData.canceled(e))await showError('Unable to open or save setup: '+(e.message||e));}
    finally{busy=false;paint();}
  }
  async function print(){
    if(busy)return;busy=true;notice.textContent='';button.classList.add('working');paint();
    try{
      const start=changes,w=PrintData.worksheet(saved.table);
      const before=await PrintData.filters(),data=await PrintData.table(w),after=await PrintData.filters();
      if(!data.rows.length)throw Error('There is no data to print for the current selections.');
      if(start!==changes || JSON.stringify(before)!==JSON.stringify(after))throw Error('The dashboard changed while the report was being prepared. Please print again.');
      const report={title:w.name,orientation:saved.orientation,columns:data.columns,rows:data.rows,filters:saved.includeFilters===false?[]:after,includeFilters:saved.includeFilters!==false};
      await tableau.extensions.ui.displayDialogAsync(page('view.html'),JSON.stringify({report}),{width:1000,height:760});
    }catch(e){if(!PrintData.canceled(e))await showError(e.message||'Unable to prepare this report.');}
    finally{busy=false;button.classList.remove('working');paint();}
  }
  button.addEventListener('click',()=>saved?print():configure());
  (async()=>{
    try{
      // Tableau completes permission handling before successful initialization.
      await tableau.extensions.initializeAsync({configure});
      saved=PrintData.config();paint();
      // Open exactly once in this initial session, only if no configuration exists.
      if(!saved)await configure();
      tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged,()=>{saved=PrintData.config();paint();});
      for(const w of tableau.extensions.dashboardContent.dashboard.worksheets){
        w.addEventListener(tableau.TableauEventType.FilterChanged,()=>changes++);
        try{if(tableau.TableauEventType.SummaryDataChanged)w.addEventListener(tableau.TableauEventType.SummaryDataChanged,()=>changes++);}catch(_){}
      }
      for(const p of await tableau.extensions.dashboardContent.dashboard.getParametersAsync())p.addEventListener(tableau.TableauEventType.ParameterChanged,()=>changes++);
    }catch(e){notice.textContent='Unable to initialize the Tableau extension: '+(e.message||e);button.disabled=true;}
  })();
})();
