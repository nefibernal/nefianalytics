import { DEFAULTS, SAMPLE_METRICS, SETTINGS_KEY, SLOTS as slots, readSettings, renderCard } from './model.js';

const container = document.querySelector('#card');
const status = document.querySelector('#status');
let config = DEFAULTS;
let currentMetrics = {};

function show(message, metrics = []) {
  status.textContent = message;
  status.hidden = !message;
  currentMetrics = Object.fromEntries(slots.map((slot, index) => [slot, metrics[index]]));
  renderCard(container, config, currentMetrics);
}

function reportError(stage, error) {
  const detail = error?.errorCode ?? error?.message;
  show(detail ? `${stage}: ${detail}` : stage);
  console.error(stage, error);
}

async function connect() {
  if (!window.tableau?.extensions) {
    show('Page loaded. The Tableau Extensions API script did not load.');
    return;
  }
  if (new URLSearchParams(location.search).has('browser')) {
    config = readSettings(sessionStorage);
    renderCard(container, config, SAMPLE_METRICS);
    status.textContent = 'Sample data. Open this extension in Tableau to use live measures.';
    return;
  }

  const { extensions, TableauEventType, ErrorCodes } = window.tableau;
  const timer = window.setTimeout(() => {
    show('Page and Tableau API script loaded. Still waiting for Tableau to initialize.');
  }, 8000);
  try {
    await extensions.initializeAsync({ configure: openFormatDialog });
  } finally {
    window.clearTimeout(timer);
  }

  config = readSettings(extensions.settings);
  const worksheet = extensions.worksheetContent.worksheet;

  async function openFormatDialog() {
    try {
      const url = new URL('configure.html', location.href).href;
      const extensionUrl = new URL(location.href);
      extensionUrl.hash = '';
      const dialogContext = { ...currentMetrics, extensionUrl: extensionUrl.href };
      const payload = await extensions.ui.displayDialogAsync(url, JSON.stringify(dialogContext), { width: 920, height: 720 });
      const result = JSON.parse(payload);
      if (!result.saved) return;
      config = readSettings({ get: key => key === SETTINGS_KEY ? result.settings : undefined });
      renderCard(container, config, currentMetrics);
    } catch (error) {
      if (error.errorCode !== ErrorCodes.DialogClosedByUser) {
        const detail = error.errorCode ?? error.message;
        status.hidden = false;
        status.textContent = detail ? `Could not open formatting: ${detail}` : 'Could not open formatting.';
        console.error(error);
      }
    }
  }
  let latestRequest = 0;

  async function refresh() {
    const request = ++latestRequest;
    try {
      const spec = await worksheet.getVisualSpecificationAsync();
      const encodings = spec.marksSpecifications[spec.activeMarksSpecificationIndex]?.encodings ?? [];
      const fields = slots.map(slot => encodings.find(encoding => encoding.id === slot)?.field);
      let result = { message: 'Drag a measure to 1st Metric.' };
      if (fields.some(Boolean)) result = await readMeasures(worksheet, fields);
      if (request === latestRequest) show(result.message, result.metrics);
    } catch (error) {
      if (request === latestRequest) reportError('Connected to Tableau, but could not read the measures', error);
    }
  }

  worksheet.addEventListener(TableauEventType.SummaryDataChanged, refresh);
  await refresh();
}

async function readMeasures(worksheet, fields) {
  const metrics = fields.map(field => field && { label: field.name });
  const reader = await worksheet.getSummaryDataReaderAsync(2, { ignoreSelection: true });
  try {
    if (reader.totalRowCount > 1) {
      return { metrics, message: 'This test expects one mark. Move grouping fields off Rows, Columns, or Detail.' };
    }
    if (reader.pageCount === 0) return { metrics, message: 'Tableau returned no marks.' };

    const page = await reader.getPageAsync(0);
    if (!page.data.length) return { metrics, message: 'Tableau returned no marks.' };

    const row = page.data[0];
    const columns = fields.map(field => field ? page.columns.findIndex(column => column.fieldId === field.fieldId) : null);
    const missingMeasure = columns.includes(-1);

    columns.forEach((index, slot) => {
      if (index == null || index < 0) return;
      const cell = row[index];
      const raw = cell?.nativeValue !== undefined ? cell.nativeValue : cell?.value;
      if (raw != null && raw !== '%null%') metrics[slot].value = cell.formattedValue || String(raw);
    });

    let message = '';
    if (missingMeasure) message = 'At least one selected measure was missing from Tableau’s summary data.';
    else if (!fields[0]) message = 'Secondary Metric loaded. Add Primary Metric to finish the test.';
    return { metrics, message };
  } finally {
    await reader.releaseAsync();
  }
}

connect().catch(error => reportError('Tableau connection failed', error));
