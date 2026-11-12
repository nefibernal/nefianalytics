(function(){
  'use strict';const $=id=>document.getElementById(id);let blobURL;
  function print(){try{$('document').contentWindow.focus();$('document').contentWindow.print();$('status').textContent='If no print dialog appeared, use Open PDF or Download PDF and print from your PDF viewer.';}catch(_){$('status').textContent='Printing could not open here. Use Open PDF or Download PDF, then print from your PDF viewer.';}}
  $('print').addEventListener('click',print);window.addEventListener('beforeunload',()=>{if(blobURL)URL.revokeObjectURL(blobURL);});
  (async()=>{
    try{
      const payload=JSON.parse(await tableau.extensions.initializeDialogAsync());
      if(payload.error){$('heading').textContent='Unable to print report';$('status').textContent=payload.error;$('status').classList.add('error');$('document').hidden=true;return;}
      const report=payload.report;$('heading').textContent=report.title;
      await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
      const doc=PrintPDF.build(report);blobURL=URL.createObjectURL(doc.output('blob'));
      $('open').href=blobURL;$('download').href=blobURL;$('download').download=(report.title.replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(0,120)||'report')+'.pdf';
      for(const id of ['print','open','download'])$(id).hidden=false;
      $('status').textContent='PDF ready. Opening printing… If no dialog appears, use Open PDF or Download PDF.';
      $('document').addEventListener('load',()=>setTimeout(print,700),{once:true});$('document').src=blobURL;
    }catch(err){$('status').textContent='Unable to create the PDF: '+(err.message||err);$('status').classList.add('error');}
  })();
})();
