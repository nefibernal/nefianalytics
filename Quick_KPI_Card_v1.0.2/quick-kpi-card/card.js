import { DEFAULTS, SAMPLE_METRICS, SLOTS, readSettings, renderCard } from './model.js';

const container = document.querySelector('#card');
const status = document.querySelector('#status');
const demo = new URLSearchParams(location.search).has('preview');

function showStatus(message = '') {
  status.textContent = message;
  status.hidden = !message;
}

async function run() {
  if (demo) {
    renderCard(container, {
      ...DEFAULTS, header: { ...DEFAULTS.header, title: 'In Fabrication' }
    }, SAMPLE_METRICS);
    showStatus();
    return;
  }

  const { extensions, TableauEventType, ErrorCodes } = window.tableau;
  await extensions.initializeAsync({ configure: openDialog });
  const worksheet = extensions.worksheetContent.worksheet;
  let metrics = {};
  let refreshId = 0;

  function paint() {
    renderCard(container, readSettings(extensions.settings), metrics);
  }

  async function openDialog() {
    try {
      const url = new URL('configure.html', location.href).href;
      await extensions.ui.displayDialogAsync(url, JSON.stringify(metrics), {
        width: 920, height: 720
      });
      paint();
    } catch (error) {
      if (error.errorCode !== ErrorCodes?.DialogClosedByUser) {
        showStatus('Could not open card formatting. Try Format Extension again.');
        console.error(error);
      }
    }
  }

  async function refresh() {
    const thisRefresh = ++refreshId;
    try {
      const spec = await worksheet.getVisualSpecificationAsync();
      const encodings = spec.marksSpecifications[spec.activeMarksSpecificationIndex]?.encodings ?? [];
      const fields = Object.fromEntries(encodings
        .filter(encoding => SLOTS.includes(encoding.id) && encoding.field)
        .map(({ id, field }) => [id, field]));

      let result = { metrics: {}, message: '' };
      if (Object.keys(fields).length) result = await readMetrics(worksheet, fields);
      if (thisRefresh !== refreshId) return;
      metrics = result.metrics;
      paint();
      showStatus(result.message || (!fields.primary ? 'Add a measure to Primary Metric on the Marks card.' : ''));
    } catch (error) {
      if (thisRefresh !== refreshId) return;
      container.textContent = '';
      showStatus('Could not read the card’s Tableau data.');
      console.error(error);
    }
  }

  worksheet.addEventListener(TableauEventType.SummaryDataChanged, refresh);
  extensions.settings.addEventListener(TableauEventType.SettingsChanged, paint);
  await refresh();
}

async function readMetrics(worksheet, fields) {
  const metrics = Object.fromEntries(Object.entries(fields)
    .map(([slot, field]) => [slot, { label: field.name, value: null }]));
  // A KPI worksheet should return a single mark. Keep Tableau's aggregate intact.
  const reader = await worksheet.getSummaryDataReaderAsync(2, { ignoreSelection: true, applyWorksheetFormatting: true });
  try {
    if (reader.totalRowCount > 1) {
      return { metrics, message: 'Use a single mark. Move grouping fields to Filters.' };
    }
    if (reader.pageCount === 0 || reader.totalRowCount === 0) return { metrics };
    const table = await reader.getPageAsync(0);
    if (table.data.length > 1) {
      return { metrics, message: 'Use a single mark. Move grouping fields to Filters.' };
    }
    const row = table.data[0];
    if (!row) return { metrics };

    let missingField = false;
    for (const [slot, field] of Object.entries(fields)) {
      const index = table.columns.findIndex(column => column.fieldId === field.fieldId);
      if (index < 0) {
        missingField = true;
        continue;
      }
      const cell = row[index];
      const value = cell?.nativeValue !== undefined ? cell.nativeValue : cell?.value;
      if (value != null && value !== '%null%') {
        metrics[slot].value = cell.formattedValue || String(value);
      }
    }
    return {
      metrics,
      message: missingField ? 'A selected measure is unavailable in the worksheet summary.' : ''
    };
  } finally {
    await reader.releaseAsync();
  }
}

run().catch(error => {
  showStatus('Open this page through the Quick KPI Card Viz Extension in Tableau.');
  console.error(error);
});
