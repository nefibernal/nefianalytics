(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  $('cancel').addEventListener('click', () => tableau.extensions.ui.closeDialog(''));
  $('setup').addEventListener('submit', async e => {
    e.preventDefault(); $('save').disabled = true; $('error').textContent = '';
    const c = { version: 3, worksheet: $('worksheet').value, background: $('background').value };
    try {
      if (!c.worksheet) throw new Error('Select the table to print.');
      PrintCore.sheet(c.worksheet);
      await PrintCore.saveConfig(c);
      tableau.extensions.ui.closeDialog('saved');
    } catch (err) { $('error').textContent = err.message || 'Unable to save setup. Please try again.'; $('save').disabled = false; }
  });
  (async () => {
    try {
      await tableau.extensions.initializeDialogAsync();
      const c = PrintCore.readConfig() || {};
      const select = $('worksheet');
      select.replaceChildren(new Option('Select…', ''));
      tableau.extensions.dashboardContent.dashboard.worksheets.forEach(w => select.add(new Option(w.name, w.name)));
      select.value = c.worksheet || '';
      $('background').value = c.background || '#ffffff';
      $('save').disabled = false;
    } catch (e) { $('error').textContent = 'Unable to load setup: ' + e.message; }
  })();
})();
