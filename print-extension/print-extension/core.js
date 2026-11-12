/* Shared Tableau data access. No report data is sent to a server or stored locally. */
(function (root) {
  'use strict';
  const KEY = 'nefiPrintConfig';
  const MAX_ROWS = 50000; // Fail explicitly rather than exhaust the browser or truncate.
  function value(v) {
    if (v == null) return '';
    if (typeof v !== 'object') return String(v);
    if (v.formattedValue != null) return String(v.formattedValue);
    if (v.value == null || v.value === '%null%') return '';
    return String(v.value);
  }
  function readConfig() {
    const s = tableau.extensions.settings.get(KEY);
    if (!s) return null;
    try { const c = JSON.parse(s); return c.worksheet && c.reportName ? c : null; }
    catch (_) { return null; }
  }
  async function saveConfig(c) {
    const settings = tableau.extensions.settings;
    const previous = settings.get(KEY);
    settings.set(KEY, JSON.stringify(c));
    try { await settings.saveAsync(); }
    catch (e) { if (previous == null) settings.erase(KEY); else settings.set(KEY, previous); throw e; }
  }
  function sheet(name) {
    const s = tableau.extensions.dashboardContent.dashboard.worksheets.find(w => w.name === name);
    if (!s) throw new Error('The configured worksheet "' + name + '" is missing. Open Configure and select it again.');
    return s;
  }
  async function readTable(ws, progress) {
    if (!ws.getSummaryDataReaderAsync) throw new Error('This extension requires Tableau 2022.4 or later.');
    const reader = await ws.getSummaryDataReaderAsync(1000, { ignoreSelection: true, ignoreAliases: false, applyWorksheetFormatting: true });
    const rows = []; let columns = [];
    try {
      if (reader.totalRowCount > MAX_ROWS) throw new Error('This first version supports up to 50,000 rows per report. Narrow the filters and try again. No partial report was created.');
      for (let p = 0; p < reader.pageCount; p++) {
        const page = await reader.getPageAsync(p);
        if (page.isTotalRowCountLimited) throw new Error('Tableau returned incomplete data. No partial report was created.');
        if (!p) columns = page.columns.map(c => ({ id: c.fieldId, name: c.fieldName, type: c.dataType }));
        if (page.columns.length !== columns.length || page.columns.some((c,i) => c.fieldName !== columns[i].name)) throw new Error('The table changed while reading data. Please try again.');
        rows.push(...page.data.map(row => row.map(value)));
        if (rows.length > MAX_ROWS) throw new Error('This report exceeds the 50,000-row limit. Narrow the filters and try again.');
        if (progress) progress(rows.length);
      }
      if (rows.length !== reader.totalRowCount) throw new Error('The returned row count is incomplete. Please try again.');
      return { columns, rows };
    } finally { await reader.releaseAsync(); }
  }
  function describeFilter(f) {
    const type = String(f.filterType).toLowerCase();
    if (type === 'categorical') {
      if (f.isAllSelected) return 'All';
      return (f.isExcludeMode ? 'Exclude: ' : '') + ((f.appliedValues || []).map(value).join(', ') || '(none)');
    }
    if (type === 'range') return (value(f.minValue) || 'No lower limit') + ' to ' + (value(f.maxValue) || 'No upper limit') + (f.includeNullValues ? ' (includes nulls)' : '');
    if (type === 'relativedate' || type === 'relative-date') {
      return [f.rangeType, /n$/i.test(String(f.rangeType)) ? f.rangeN : '', f.periodType].filter(x => x !== '' && x != null).join(' ') + (value(f.anchorDate) ? '; anchor: ' + value(f.anchorDate) : '');
    }
    if (type === 'hierarchical') return (f.appliedValues || []).map(v => Array.isArray(v) ? v.map(value).join(' > ') : value(v)).join(', ') || 'All / no explicit selection';
    return 'Selection details unavailable (' + f.filterType + ')';
  }
  async function filters() {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const results = await Promise.all(dashboard.worksheets.map(async ws => {
      const fs = await ws.getFiltersAsync();
      return fs.map(f => ({ field: f.fieldName, selection: describeFilter(f), worksheet: ws.name }));
    }));
    // Group identical selections but retain worksheet scope when selections differ.
    const grouped = new Map();
    results.flat().forEach(f => {
      const key = JSON.stringify([f.field, f.selection]);
      if (!grouped.has(key)) grouped.set(key, { field: f.field, selection: f.selection, worksheets: [] });
      grouped.get(key).worksheets.push(f.worksheet);
    });
    return Array.from(grouped.values());
  }
  async function refreshValue(c) {
    const unavailable = 'Data refresh time unavailable';
    try {
      const sources = await sheet(c.worksheet).getDataSourcesAsync();
      if (!sources.length) return unavailable;
      const entries = sources.map(source => {
        const date = source.isExtract && source.extractUpdateTime ? new Date(source.extractUpdateTime) : null;
        const time = date && !Number.isNaN(date.getTime())
          ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long' }).format(date)
          : unavailable;
        return { name: source.name || 'Unnamed data source', time };
      });
      if (entries.length === 1) return entries[0].time;
      // Show every source separately instead of choosing a misleading newest timestamp.
      return entries.map(e => e.name + ': ' + e.time).join('; ');
    } catch (_) {
      // Missing refresh metadata must not prevent the filtered report from printing.
      return unavailable;
    }
  }
  function closed(e) { return e && (e.errorCode === 'dialog-closed-by-user' || (root.tableau && e.errorCode === tableau.ErrorCodes.DialogClosedByUser)); }
  root.PrintCore = { KEY, MAX_ROWS, value, readConfig, saveConfig, sheet, readTable, filters, describeFilter, refreshValue, closed };
})(globalThis);
