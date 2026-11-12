(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let url;
  function print() {
    try { $('pdf').contentWindow.focus(); $('pdf').contentWindow.print(); $('status').textContent = 'If no print dialog appeared, use Open PDF or Download PDF and print from your PDF viewer.'; }
    catch (_) { $('status').textContent = 'Automatic printing is unavailable here. Use Open PDF or Download PDF, then print from your PDF viewer.'; }
  }
  $('print').addEventListener('click', print);
  window.addEventListener('beforeunload', () => { if (url) URL.revokeObjectURL(url); });
  (async () => {
    try {
      const payload = await tableau.extensions.initializeDialogAsync();
      const model = JSON.parse(payload);
      if (model.error) {
        $('title').textContent = 'Unable to print report';
        $('status').textContent = model.error; $('status').classList.add('error');
        $('pdf').hidden = true; return;
      }
      $('title').textContent = model.title;
      // Let the preparing status paint before generating a large report.
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
      const doc = PrintReport.createReport(model);
      url = URL.createObjectURL(doc.output('blob'));
      $('download').href = url; $('download').download = (model.title.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0,120) || 'report') + '.pdf';
      $('open').href = url;
      for (const id of ['print','open','download']) $(id).hidden = false;
      $('status').textContent = 'PDF ready. Opening printing… If no dialog appears, use Open PDF or Download PDF.';
      $('pdf').addEventListener('load', () => setTimeout(print, 700), { once: true });
      $('pdf').src = url;
    } catch (e) { $('status').textContent = 'Unable to generate the PDF: ' + (e.message || e); $('status').classList.add('error'); }
  })();
})();
