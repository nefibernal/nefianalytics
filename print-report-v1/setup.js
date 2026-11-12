(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  $('cancel').addEventListener('click',()=>tableau.extensions.ui.closeDialog(JSON.stringify({saved:false})));
  $('settings-form').addEventListener('submit',async e=>{
    e.preventDefault();$('save').disabled=true;$('problem').textContent='';
    try{
      const config={table:$('table').value,color:$('color').value,orientation:document.querySelector('input[name="orientation"]:checked')?.value,includeFilters:$('includeFilters').checked};
      if(!PrintData.isConfig(config))throw Error('Select a table and report orientation.');
      PrintData.worksheet(config.table);await PrintData.save(config);
      tableau.extensions.ui.closeDialog(JSON.stringify({saved:true,config}));
    }catch(err){$('problem').textContent=err.message||'Unable to save setup. Please try again.';$('save').disabled=false;}
  });
  (async()=>{
    try{
      const payload=await tableau.extensions.initializeDialogAsync();let supplied={};try{supplied=JSON.parse(payload||'{}');}catch(_){}
      const config=PrintData.isConfig(supplied)?supplied:PrintData.config();
      const tables=tableau.extensions.dashboardContent.dashboard.worksheets;
      $('table').replaceChildren(new Option('Select a table…',''));
      for(const t of tables)$('table').add(new Option(t.name,t.name));
      if(config){$('table').value=config.table;$('color').value=config.color;document.querySelector('input[value="'+config.orientation+'"]').checked=true;}
      $('includeFilters').checked=config?.includeFilters!==false;
      $('table').disabled=false;$('save').disabled=false;
      if(!tables.length)throw Error('This dashboard has no worksheets available to print.');
    }catch(err){$('problem').textContent='Unable to load setup: '+(err.message||err);$('save').disabled=true;}
  })();
})();
