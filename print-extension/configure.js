(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let loadVersion = 0, sourceVersion = 0;
  function options(select, items, selected) {
    select.replaceChildren(new Option('Select…', ''));
    items.forEach(([label, v]) => select.add(new Option(label, v)));
    select.value = selected || '';
  }
  async function fields(selected) {
    const version = ++loadVersion;
    $('save').disabled = true; $('error').textContent = '';
    const isSheet = $('refreshSource').value.startsWith('sheet:');
    $('fieldArea').hidden = !isSheet;
    $('refreshField').required = isSheet;
    options($('refreshField'), []);
    if (!isSheet) { $('save').disabled = !$('refreshSource').value; return; }
    try {
      const ws = PrintCore.sheet($('refreshSource').value.slice(6));
      const reader = await ws.getSummaryDataReaderAsync(1, { ignoreSelection: true });
      let columns;
      try { columns = reader.pageCount ? (await reader.getPageAsync(0)).columns : []; }
      finally { await reader.releaseAsync(); }
      if (version !== loadVersion) return;
      options($('refreshField'), columns.filter(c => ['datetime','date','string'].includes(String(c.dataType).toLowerCase())).map(c => [c.fieldName, c.fieldId || c.fieldName]), selected);
      if (!columns.length) throw new Error('This refresh worksheet has no data. Select a worksheet with a refresh timestamp.');
      $('save').disabled = false;
    } catch (e) { if (version === loadVersion) $('error').textContent = e.message; }
  }
  async function sources(config) {
    const version = ++sourceVersion;
    ++loadVersion;
    $('save').disabled = true; $('error').textContent = '';
    options($('refreshSource'), []);
    if (!$('worksheet').value) return;
    try {
      const ws = PrintCore.sheet($('worksheet').value);
      const dataSources = await ws.getDataSourcesAsync();
      if (version !== sourceVersion) return;
      const extracts = dataSources.filter(s => s.isExtract && s.extractUpdateTime);
      const items = extracts.map(s => ['Extract: ' + s.name, 'extract:' + s.id]);
      tableau.extensions.dashboardContent.dashboard.worksheets.forEach(w => items.push(['Worksheet: ' + w.name, 'sheet:' + w.name]));
      let selected = config?.refreshSource;
      if (selected?.startsWith('extract:') && !items.some(i => i[1] === selected)) {
        const match = extracts.filter(s => s.name === config.refreshSourceName);
        selected = match.length === 1 ? 'extract:' + match[0].id : '';
      }
      options($('refreshSource'), items, selected || (extracts.length === 1 ? 'extract:' + extracts[0].id : ''));
      await fields(config?.refreshField);
    } catch (e) { $('error').textContent = 'Unable to load refresh sources: ' + e.message; }
  }
  $('worksheet').addEventListener('change', () => sources());
  $('refreshSource').addEventListener('change', () => fields());
  $('cancel').addEventListener('click', () => tableau.extensions.ui.closeDialog(''));
  $('setup').addEventListener('submit', async e => {
    e.preventDefault(); $('save').disabled = true; $('error').textContent = '';
    const refreshSource = $('refreshSource').value;
    const c = { version: 1, reportName: $('reportName').value.trim(), worksheet: $('worksheet').value, refreshSource, refreshSourceName: $('refreshSource').selectedOptions[0]?.textContent.replace(/^Extract: /, ''), refreshWorksheet: refreshSource.startsWith('sheet:') ? refreshSource.slice(6) : '', refreshField: $('refreshField').value, background: $('background').value };
    try {
      if (!c.reportName || !c.worksheet || !c.refreshSource || (c.refreshSource.startsWith('sheet:') && !c.refreshField)) throw new Error('Enter a report name and select the table and data-refresh source.');
      await PrintCore.refreshValue(c, c.worksheet === c.refreshWorksheet ? await PrintCore.readTable(PrintCore.sheet(c.worksheet)) : null);
      await PrintCore.saveConfig(c);
      tableau.extensions.ui.closeDialog('saved');
    } catch (err) { $('error').textContent = err.message || 'Unable to save setup. Please try again.'; $('save').disabled = false; }
  });
  (async () => {
    try {
      await tableau.extensions.initializeDialogAsync();
      const c = PrintCore.readConfig() || {};
      const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets.map(w => [w.name, w.name]);
      options($('worksheet'), worksheets, c.worksheet);
      $('reportName').value = c.reportName || '';
      $('background').value = c.background || '#ffffff';
      if (c.worksheet) await sources(c);
    } catch (e) { $('error').textContent = 'Unable to load setup: ' + e.message; }
  })();
})();
