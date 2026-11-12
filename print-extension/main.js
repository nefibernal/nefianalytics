(function () {
  'use strict';
  const action = document.getElementById('action'), message = document.getElementById('message');
  const gear = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 3-.6 2.1-1.8 1L4.5 6 3 8.6l1.5 1.6v2L3 14l1.5 2.6 2.1-.3 1.8 1L9 20h3l.6-2.7 1.8-1 2.1.3L18 14l-1.5-1.8v-2L18 8.6 16.5 6l-2.1.1-1.8-1L12 3Z" transform="translate(1 0)"/><circle cx="11.5" cy="11.5" r="3"/></svg>';
  const printer = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6z"/><path d="M17 11h1"/></svg>';
  let busy = false, changeCount = 0;
  function paint() {
    const c = PrintCore.readConfig();
    action.innerHTML = c ? printer : gear;
    action.title = c ? 'Print report' : 'Set up print report';
    action.setAttribute('aria-label', action.title);
    action.disabled = busy;
    document.body.style.backgroundColor = c?.background || '#ffffff';
  }
  async function configure() {
    if (busy) return;
    busy = true; paint(); message.textContent = '';
    try { await tableau.extensions.ui.displayDialogAsync(new URL('configure.html', location.href).href, '', { width: 540, height: 730 }); }
    catch (e) { if (!PrintCore.closed(e)) message.textContent = 'Setup failed: ' + e.message; }
    finally { busy = false; paint(); }
  }
  async function print() {
    busy = true; paint(); action.classList.add('busy'); message.textContent = '';
    try {
      const config = PrintCore.readConfig();
      const startChanges = changeCount;
      const beforeFilters = await PrintCore.filters();
      const table = await PrintCore.readTable(PrintCore.sheet(config.worksheet), n => { action.title = 'Preparing ' + n.toLocaleString() + ' rows…'; });
      if (!table.rows.length) throw new Error('There is no data to print for the current selections.');
      const refresh = await PrintCore.refreshValue(config, table);
      const afterFilters = await PrintCore.filters();
      if (startChanges !== changeCount || JSON.stringify(beforeFilters) !== JSON.stringify(afterFilters)) throw new Error('The dashboard changed while the report was being prepared. Please click Print again.');
      const payload = { title: config.reportName, worksheet: config.worksheet, refresh, filters: afterFilters, columns: table.columns.map(c => c.name), rows: table.rows };
      await tableau.extensions.ui.displayDialogAsync(new URL('preview.html', location.href).href, JSON.stringify(payload), { width: 1000, height: 760 });
    } catch (e) {
      if (!PrintCore.closed(e)) {
        message.textContent = e.message || 'Unable to prepare this report.';
        try {
          await tableau.extensions.ui.displayDialogAsync(new URL('preview.html', location.href).href, JSON.stringify({ error: message.textContent }), { width: 520, height: 260 });
        } catch (_) { /* If dialogs are blocked, retain the message in the dashboard. */ }
      }
    }
    finally { busy = false; action.classList.remove('busy'); paint(); }
  }
  action.addEventListener('click', () => { if (!busy) PrintCore.readConfig() ? print() : configure(); });
  (async () => {
    try {
      await tableau.extensions.initializeAsync({ configure });
      tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, paint);
      for (const ws of tableau.extensions.dashboardContent.dashboard.worksheets) {
        ws.addEventListener(tableau.TableauEventType.FilterChanged, () => changeCount++);
        if (tableau.TableauEventType.SummaryDataChanged) {
          try { ws.addEventListener(tableau.TableauEventType.SummaryDataChanged, () => changeCount++); }
          catch (_) { /* Optional event is unavailable on Tableau before 2024.1. */ }
        }
      }
      for (const p of await tableau.extensions.dashboardContent.dashboard.getParametersAsync()) p.addEventListener(tableau.TableauEventType.ParameterChanged, () => changeCount++);
      paint();
    } catch (e) { message.textContent = 'Add this extension to a Tableau dashboard to configure and print. ' + (e.message || ''); }
  })();
})();
