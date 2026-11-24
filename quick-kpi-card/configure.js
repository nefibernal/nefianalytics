import {
  ALIGNMENTS, FONTS, LABEL_POSITIONS, SAMPLE_METRICS,
  SETTINGS_KEY, readSettings, renderCard
} from './model.js';

const form = document.querySelector('#settings');
const sections = document.querySelector('#sections');
const preview = document.querySelector('#preview-card');
const message = document.querySelector('#form-message');
const startup = document.querySelector('#startup-message');
const saveButton = document.querySelector('#save');
const cancelButton = document.querySelector('#cancel');
const demo = new URLSearchParams(location.search).has('preview');
const acceptedImageTypes = ['image/png', 'image/jpeg', 'image/webp'];
const maxImageBytes = 5 * 1024 * 1024;
const maxImageSettingLength = 16 * 1024;
const maxImageEdge = 96;

// Tableau Classic 10, with neutral choices for text and backgrounds.
const colors = [
  ['Black', '#000000'], ['White', '#ffffff'], ['Light gray', '#f3f3f3'],
  ['Gray', '#7f7f7f'], ['Slate', '#444444'], ['Blue', '#1f77b4'],
  ['Orange', '#ff7f0e'], ['Green', '#2ca02c'], ['Red', '#d62728'],
  ['Purple', '#9467bd'], ['Brown', '#8c564b'], ['Pink', '#e377c2'],
  ['Olive', '#bcbd22'], ['Cyan', '#17becf'], ['Header orange', '#f28e2b']
];

async function run() {
  const extensions = window.tableau?.extensions;
  let config;
  let metrics;
  if (demo) {
    config = readSettings({ get: key => sessionStorage.getItem(key) });
    if (!sessionStorage.getItem(SETTINGS_KEY)) config.header.title = 'In Fabrication';
    metrics = SAMPLE_METRICS;
  } else {
    const payload = await extensions.initializeDialogAsync();
    metrics = JSON.parse(payload || '{}');
    config = readSettings(extensions.settings);
  }

  document.querySelector('#extension-url').textContent =
    metrics.extensionUrl || new URL('index.html', location.href).href;

  const updatePreview = () => renderCard(preview, config, metrics.primary || metrics.secondary ? metrics : SAMPLE_METRICS);
  const header = section('Header');
  addControl(header, config.header, 'title', 'Title', { placeholder: 'In Fabrication', maxLength: 160 });
  addControl(header, config.header, 'alignment', 'Alignment', { choices: ALIGNMENTS });
  addColor(header, config.header, 'background', 'Background');
  addTypography(header, config.header.style, 'Title');
  addControl(header, config.header, 'height', 'Height (px)', { min: 8, max: 400 });

  const primary = section('Primary Metric');
  addMetricControls(primary, config.primary, metrics.primary?.label);

  const secondary = section('Secondary Metric');
  addMetricControls(secondary, config.secondary, metrics.secondary?.label);
  addControl(secondary, config.secondary, 'labelPosition', 'Label Placement', { choices: LABEL_POSITIONS });

  const image = section('Image');
  addControl(image, config.image, 'side', 'Display Side', { choices: ['left', 'right'] });
  const upload = document.createElement('div');
  upload.className = 'image-upload';
  const uploadLabel = document.createElement('label');
  uploadLabel.textContent = 'Image File';
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = acceptedImageTypes.join(',');
  file.setAttribute('aria-describedby', 'image-help');
  uploadLabel.append(file);
  const help = document.createElement('p');
  help.className = 'image-help';
  help.id = 'image-help';
  help.textContent = 'Optional. PNG, JPEG, or WebP up to 5 MB. Images are resized to fit the card.';
  const filename = document.createElement('span');
  filename.className = 'image-filename';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove Image';
  upload.append(uploadLabel, help, filename, remove);
  image.append(upload);

  function showImageSelection() {
    filename.textContent = config.image.name;
    filename.hidden = !config.image.name;
    remove.hidden = !config.image.src;
    updatePreview();
  }

  file.addEventListener('change', async () => {
    const selection = file.files[0];
    if (!selection) return;
    message.textContent = 'Preparing image…';
    file.disabled = true;
    remove.disabled = true;
    saveButton.disabled = true;
    try {
      config.image.src = await prepareImage(selection);
      config.image.name = selection.name;
      showImageSelection();
      message.textContent = '';
    } catch (error) {
      message.textContent = error.message;
    } finally {
      file.value = '';
      file.disabled = false;
      remove.disabled = false;
      saveButton.disabled = false;
    }
  });

  remove.addEventListener('click', () => {
    config.image.src = '';
    config.image.name = '';
    message.textContent = '';
    showImageSelection();
  });

  form.addEventListener('input', updatePreview);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saveButton.disabled) return;
    saveButton.disabled = true;
    cancelButton.disabled = true;
    file.disabled = true;
    remove.disabled = true;
    message.textContent = '';
    const serialized = JSON.stringify(config);
    try {
      if (demo) {
        sessionStorage.setItem(SETTINGS_KEY, serialized);
        message.textContent = 'Preview settings saved.';
      } else {
        extensions.settings.set(SETTINGS_KEY, serialized);
        await extensions.settings.saveAsync();
        extensions.ui.closeDialog(JSON.stringify({ saved: true, settings: serialized }));
      }
    } catch (error) {
      message.textContent = 'Tableau could not save the card. Try again before closing this dialog.';
      console.error(error);
    } finally {
      saveButton.disabled = false;
      cancelButton.disabled = false;
      file.disabled = false;
      remove.disabled = false;
    }
  });

  cancelButton.addEventListener('click', () => {
    if (demo) location.reload();
    else extensions.ui.closeDialog(JSON.stringify({ saved: false }));
  });

  showImageSelection();
  startup.hidden = true;
  form.hidden = false;
}

function section(title) {
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = title;
  const grid = document.createElement('div');
  grid.className = 'field-grid';
  fieldset.append(legend, grid);
  sections.append(fieldset);
  return grid;
}

function addMetricControls(grid, metric, measureName = 'Measure name') {
  addControl(grid, metric, 'label', 'Label Title', { placeholder: measureName, maxLength: 160 });
  addControl(grid, metric, 'alignment', 'Alignment', { choices: ALIGNMENTS });
  addColor(grid, metric, 'background', 'Background');
  addTypography(grid, metric.labelStyle, 'Label');
  addTypography(grid, metric.valueStyle, 'Value');
}

function addTypography(grid, style, name) {
  const prefix = name === 'Title' ? '' : `${name} `;
  addControl(grid, style, 'font', `${name} Font`, { choices: Object.keys(FONTS) });
  addControl(grid, style, 'size', `${prefix}Font Size (pt)`, { min: 6, max: 144 });
  addColor(grid, style, 'color', `${prefix}Font Color`);
}

function addControl(grid, record, key, title, options = {}) {
  const label = document.createElement('label');
  label.textContent = title;
  const input = document.createElement(options.choices ? 'select' : 'input');
  if (options.choices) {
    for (const choice of options.choices) {
      input.add(new Option(choice[0].toUpperCase() + choice.slice(1), choice));
    }
  } else if (options.min !== undefined) {
    input.type = 'number';
    input.required = true;
    input.min = options.min;
    input.max = options.max;
  } else {
    input.type = 'text';
    input.placeholder = options.placeholder;
    input.maxLength = options.maxLength;
  }
  input.value = record[key];
  input.addEventListener('input', () => {
    if (input.type === 'number') {
      if (input.validity.valid) record[key] = input.valueAsNumber;
    } else {
      record[key] = input.value;
    }
  });
  label.append(input);
  grid.append(label);
}

function addColor(grid, record, key, title) {
  const group = document.createElement('div');
  group.className = 'color-control';
  const name = document.createElement('span');
  name.textContent = title;
  const picker = document.createElement('details');
  const summary = document.createElement('summary');
  summary.setAttribute('aria-label', title);
  const swatch = document.createElement('span');
  swatch.className = 'current-swatch';
  const hex = document.createElement('span');
  summary.append(swatch, hex);
  const panel = document.createElement('div');
  panel.className = 'color-panel';
  const palette = document.createElement('div');
  palette.className = 'color-palette';
  const customLabel = document.createElement('label');
  customLabel.className = 'custom-color';
  customLabel.textContent = 'Custom color';
  const custom = document.createElement('input');
  custom.type = 'color';

  function update(color) {
    record[key] = color;
    custom.value = color;
    swatch.style.backgroundColor = color;
    hex.textContent = color.toUpperCase();
  }

  for (const [colorName, color] of colors) {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = colorName;
    button.setAttribute('aria-label', colorName);
    button.style.backgroundColor = color;
    button.addEventListener('click', () => {
      update(color);
      picker.open = false;
      summary.focus();
      form.dispatchEvent(new Event('input'));
    });
    palette.append(button);
  }

  custom.addEventListener('input', () => update(custom.value));
  update(record[key]);
  customLabel.append(custom);
  panel.append(palette, customLabel);
  picker.append(summary, panel);
  group.append(name, picker);
  grid.append(group);
}

async function prepareImage(file) {
  if (!acceptedImageTypes.includes(file.type)) throw new Error('Choose a PNG, JPEG, or WebP image.');
  if (file.size > maxImageBytes) throw new Error('Choose an image that is 5 MB or smaller.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This image could not be opened. Try a different file.');
  }
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  try {
    for (const edge of [maxImageEdge, 72, 48]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const png = canvas.toDataURL('image/png');
      if (png.length <= maxImageSettingLength) return png;
      const webp = canvas.toDataURL('image/webp', 0.88);
      if (webp.startsWith('data:image/webp;') && webp.length <= maxImageSettingLength) return webp;
    }
    throw new Error('This image could not be resized for the card. Try a simpler icon.');
  } finally {
    bitmap.close();
  }
}

run().catch(error => {
  startup.textContent = 'Open formatting from the Quick KPI Card Marks card in Tableau.';
  console.error(error);
});
