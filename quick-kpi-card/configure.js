import {
  ALIGNMENTS, BORDER_SIZES, CORNERS, FONTS, FONT_SIZE_RANGE, HEADER_HEIGHT_RANGE, LABEL_POSITIONS,
  METRIC_PADDING_RANGE, SAMPLE_METRICS, SIDES,
  SETTINGS_KEY, applyFontFamily, readSettings, renderCard
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
const fontFamilies = [
  ...Object.keys(FONTS), 'Aptos', 'Arial Black', 'Calibri', 'Cambria', 'Candara',
  'Century Gothic', 'Consolas', 'Garamond', 'Helvetica', 'Tahoma',
  'Times New Roman', 'Trebuchet MS', 'Tw Cen MT', 'Yu Gothic UI'
].sort((a, b) => a.localeCompare(b));

// The left column contains the neutrals. The other columns use the selected Tableau 20 swatches.
const colors = [
  ['Black', '#000000'], ['Blue', '#4e79a7'], ['Light blue', '#a0cbe8'],
  ['Orange', '#f28e2b'], ['Light orange', '#ffbe7d'],
  ['Gray', '#7f7f7f'], ['Green', '#59a14f'], ['Light green', '#8cd17d'],
  ['Olive', '#b6992d'], ['Yellow', '#f1ce63'],
  ['White', '#ffffff'], ['Teal', '#499894'], ['Light teal', '#86bcb6'],
  ['Red', '#e15759'], ['Light red', '#ff9d9a']
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
  addControl(header, config.header, 'height', 'Height (px)', HEADER_HEIGHT_RANGE);

  const primary = section('Primary Metric');
  addMetricControls(primary, config.primary, metrics.primary?.label);

  const secondary = section('Secondary Metric');
  addMetricControls(secondary, config.secondary, metrics.secondary?.label);
  addControl(secondary, config.secondary, 'labelPosition', 'Label Placement', { choices: LABEL_POSITIONS });

  document.addEventListener('click', event => {
    for (const picker of sections.querySelectorAll('.font-picker[open], .compact-color details[open]')) {
      if (!picker.contains(event.target)) picker.open = false;
    }
  });

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

  addLayoutControls(config.layout);
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
  grid.classList.add('metric-field-grid');
  addControl(grid, metric, 'label', 'Label Title', { placeholder: measureName, maxLength: 160 });
  addControl(grid, metric, 'alignment', 'Alignment', { choices: ALIGNMENTS });
  addColor(grid, metric, 'background', 'Background', { compact: true });
  addControl(grid, metric, 'padding', 'Padding (px)', METRIC_PADDING_RANGE);
  addTypography(grid, metric.labelStyle, 'Label');
  addTypography(grid, metric.valueStyle, 'Value');
}

function addLayoutControls(layout) {
  const grid = section('Layout');
  grid.classList.add('card-layout-grid');
  addControl(grid, layout, 'borderSize', 'Border Size', {
    choices: BORDER_SIZES,
    choiceLabel: size => size === '0' ? 'None' : `${size} px`
  });
  addColor(grid, layout, 'borderColor', 'Border Color');
  addLinkedControls(grid, layout, 'corners', 'cornersLinked', 'Corner Radius (px)', 'Link corners', CORNERS);
  addLinkedControls(grid, layout, 'padding', 'sidesLinked', 'Outer Padding (px)', 'Link sides', SIDES);
}

function addLinkedControls(grid, layout, valuesKey, linkKey, title, linkLabel, keys) {
  const group = document.createElement('div');
  group.className = 'layout-group';
  const heading = document.createElement('div');
  heading.className = 'layout-group-heading';
  const name = document.createElement('span');
  name.textContent = title;
  const label = document.createElement('label');
  const link = document.createElement('input');
  link.type = 'checkbox';
  link.checked = layout[linkKey];
  label.append(link, linkLabel);
  heading.append(name, label);
  const controls = document.createElement('div');
  controls.className = 'layout-positions';
  const values = layout[valuesKey];
  const inputs = keys.map(key => {
    const text = key.replace(/[A-Z]/g, char => ` ${char.toLowerCase()}`);
    const input = addControl(controls, values, key, text[0].toUpperCase() + text.slice(1), METRIC_PADDING_RANGE);
    const caption = document.createElement('span');
    caption.className = 'layout-caption';
    const icon = document.createElement('span');
    icon.className = 'layout-indicator';
    icon.dataset.position = key;
    icon.setAttribute('aria-hidden', 'true');
    caption.append(icon, input.parentElement.firstChild);
    input.before(caption);
    input.addEventListener('input', () => {
      if (link.checked && input.validity.valid) sync(input.valueAsNumber);
    });
    return input;
  });

  function sync(value) {
    keys.forEach((key, i) => {
      values[key] = value;
      inputs[i].value = value;
    });
  }

  link.addEventListener('input', () => {
    layout[linkKey] = link.checked;
    if (link.checked) sync(values[keys[0]]);
  });
  group.append(heading, controls);
  grid.append(group);
}

function addTypography(grid, style, name) {
  const row = document.createElement('div');
  row.className = 'typography-row';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', `${name} typography`);
  addFontPicker(row, style, `${name} Font`);
  const size = addControl(row, style, 'size', 'Font Size', FONT_SIZE_RANGE);
  size.setAttribute('aria-label', `${name} Font Size`);
  addColor(row, style, 'color', 'Font Color', { compact: true, accessibleName: `${name} Font Color` });

  const toggles = document.createElement('div');
  toggles.className = 'font-toggles';
  for (const [key, letter] of [['bold', 'B'], ['italic', 'I'], ['underline', 'U']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `font-toggle font-toggle-${key}`;
    button.textContent = letter;
    button.title = key[0].toUpperCase() + key.slice(1);
    button.setAttribute('aria-label', `${name} ${button.title}`);
    button.setAttribute('aria-pressed', String(style[key] === true));
    button.addEventListener('click', () => {
      style[key] = !style[key];
      button.setAttribute('aria-pressed', String(style[key]));
      form.dispatchEvent(new Event('input'));
    });
    toggles.append(button);
  }
  row.append(toggles);
  grid.append(row);
}

function addFontPicker(row, style, title) {
  const group = document.createElement('div');
  group.className = 'font-control';
  const name = document.createElement('span');
  name.textContent = title;
  const picker = document.createElement('details');
  picker.className = 'font-picker';
  const summary = document.createElement('summary');
  const selected = document.createElement('span');
  summary.append(selected);

  const panel = document.createElement('div');
  panel.className = 'font-panel';
  const search = document.createElement('input');
  search.type = 'search';
  search.maxLength = 120;
  search.placeholder = 'Find a font';
  search.setAttribute('aria-label', `Find ${title.toLowerCase()}`);
  const list = document.createElement('div');
  list.className = 'font-options';

  function updateSelected() {
    selected.textContent = style.font;
    summary.setAttribute('aria-label', `${title}: ${style.font}`);
    applyFontFamily(selected, style.font);
  }

  function choose(font) {
    style.font = font;
    updateSelected();
    picker.open = false;
    summary.focus();
    form.dispatchEvent(new Event('input'));
  }

  function updateList() {
    const query = search.value.trim().toLowerCase();
    const matches = fontFamilies.filter(name => name.toLowerCase().includes(query));
    list.textContent = '';
    for (const font of matches) {
      const option = document.createElement('button');
      option.type = 'button';
      option.textContent = font;
      option.setAttribute('aria-pressed', String(font === style.font));
      applyFontFamily(option, font);
      option.addEventListener('click', () => choose(font));
      list.append(option);
    }
    if (!matches.length) list.textContent = 'No matching fonts.';
  }

  picker.addEventListener('toggle', () => {
    if (!picker.open) return;
    search.value = '';
    updateList();
    search.focus();
  });
  search.addEventListener('input', event => {
    event.stopPropagation();
    updateList();
  });
  search.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      list.querySelector('button')?.click();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      list.querySelector('button')?.focus();
    }
  });
  list.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const next = event.key === 'ArrowDown' ? event.target.nextElementSibling : event.target.previousElementSibling;
    (next ?? search).focus();
  });
  picker.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !picker.open) return;
    event.preventDefault();
    event.stopPropagation();
    picker.open = false;
    summary.focus();
  });
  panel.append(search, list);
  picker.append(summary, panel);
  group.append(name, picker);
  row.append(group);
  updateSelected();
}

function addControl(grid, record, key, title, options = {}) {
  const label = document.createElement('label');
  label.textContent = title;
  const input = document.createElement(options.choices ? 'select' : 'input');
  if (options.choices) {
    const choiceLabel = options.choiceLabel ?? (choice => choice[0].toUpperCase() + choice.slice(1));
    for (const choice of options.choices) {
      input.add(new Option(choiceLabel(choice), choice));
    }
  } else if (options.min !== undefined) {
    input.type = 'number';
    input.required = true;
    input.min = options.min;
    if (options.max !== undefined) input.max = options.max;
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
  return input;
}

function addColor(grid, record, key, title, { compact = false, accessibleName = title } = {}) {
  const group = document.createElement('div');
  group.className = 'color-control';
  if (compact) group.classList.add('compact-color');
  const name = document.createElement('span');
  name.textContent = title;
  const picker = document.createElement('details');
  const summary = document.createElement('summary');
  summary.setAttribute('aria-label', accessibleName);
  const swatch = document.createElement('span');
  swatch.className = 'current-swatch';
  const hex = document.createElement('span');
  summary.append(swatch);
  if (!compact) summary.append(hex);
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
    if (compact) {
      summary.title = hex.textContent;
      summary.setAttribute('aria-label', `${accessibleName}: ${hex.textContent}`);
    }
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
