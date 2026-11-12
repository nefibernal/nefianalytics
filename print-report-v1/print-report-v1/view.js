(function(){
  'use strict';
  const frame=document.getElementById('document'),status=document.getElementById('status');let blobURL;
  window.addEventListener('beforeunload',()=>{if(blobURL)URL.revokeObjectURL(blobURL);});
  (async()=>{
    try{
      const payload=JSON.parse(await tableau.extensions.initializeDialogAsync());
      if(payload.error){status.textContent=payload.error;status.classList.add('error');return;}
      const report=payload.report;document.title=report.title;
      await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
      const doc=PrintPDF.build(report);blobURL=URL.createObjectURL(doc.output('blob'));
      frame.addEventListener('load',()=>{status.hidden=true;},{once:true});
      frame.hidden=false;frame.src=blobURL+'#toolbar=1&navpanes=0';
      // Printing is provided solely by the built-in PDF viewer. No automatic print call.
    }catch(err){frame.hidden=true;status.textContent='Unable to create the PDF: '+(err.message||err);status.classList.add('error');}
  })();
})();
