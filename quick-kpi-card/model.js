export const SETTINGS_KEY = 'quickKpiCard';
export const SLOTS = ['primary', 'secondary'];
export const ALIGNMENTS = ['left', 'center', 'right'];
export const LABEL_POSITIONS = ['below', 'above', 'left', 'right'];
export const HEADER_HEIGHT_RANGE = { min: 8, max: 400 };
export const FONT_SIZE_RANGE = { min: 6, max: 144 };
export const METRIC_PADDING_RANGE = { min: 0 };
export const BORDER_SIZES = ['0', '1', '2', '3', '4', '5'];
export const CORNERS = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
export const SIDES = ['top', 'right', 'bottom', 'left'];
export const FONTS = {
  'Tableau Bold': '"Tableau Bold", "Tableau", "Segoe UI", Arial, sans-serif',
  'Tableau Book': '"Tableau Book", "Tableau", "Segoe UI", Arial, sans-serif',
  'Tableau Light': '"Tableau Light", "Tableau", "Segoe UI", Arial, sans-serif',
  'Tableau Medium': '"Tableau Medium", "Tableau", "Tableau Book", "Segoe UI", Arial, sans-serif',
  'Tableau Regular': '"Tableau Regular", "Tableau", "Segoe UI", Arial, sans-serif',
  'Tableau Semibold': '"Tableau Semibold", "Tableau", "Segoe UI", Arial, sans-serif',
  'Arial': 'Arial, sans-serif',
  'Georgia': 'Georgia, serif',
  'Segoe UI': '"Segoe UI", Arial, sans-serif',
  'Verdana': 'Verdana, sans-serif',
  'Courier New': '"Courier New", monospace'
};

const tableauFontWeights = {
  'Tableau Bold': '700',
  'Tableau Book': '400',
  'Tableau Light': '300',
  'Tableau Medium': '500',
  'Tableau Regular': '400',
  'Tableau Semibold': '600'
};

const textDefaults = {
  font: 'Tableau Medium', size: 14, color: '#000000', bold: false, italic: false, underline: false
};
const primaryTextDefaults = { ...textDefaults, size: 22 };
const secondaryTextDefaults = { ...textDefaults, size: 12 };
const metricDefaults = {
  alignment: 'center',
  background: '#ffffff',
  label: '',
  padding: 4,
  valueStyle: primaryTextDefaults,
  labelStyle: primaryTextDefaults
};

export const DEFAULTS = {
  layout: {
    borderSize: '0',
    borderColor: '#000000',
    cornersLinked: true,
    sidesLinked: true,
    corners: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    padding: { top: 15, right: 15, bottom: 15, left: 15 }
  },
  header: {
    title: 'Quick KPI Card',
    height: 32,
    background: '#5577a6',
    alignment: 'center',
    style: { ...textDefaults, color: '#ffffff' }
  },
  primary: metricDefaults,
  secondary: {
    ...metricDefaults,
    background: '#f3f3f3',
    labelPosition: 'below',
    valueStyle: secondaryTextDefaults,
    labelStyle: secondaryTextDefaults
  },
  image: { side: 'left', name: '', src: '' }
};

export const SAMPLE_METRICS = {
  primary: { label: 'Main Marks', value: '25,196' },
  secondary: { label: 'Weight (lb)', value: '26,662,776#' }
};

let centeredImage = { source: '', displaySource: '' };
const cardObservers = new WeakMap();
let textContext;

function textSetting(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}

function numberSetting(value, { min, max = Number.MAX_SAFE_INTEGER }, fallback) {
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

function colorSetting(value, fallback) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function imageSource(value) {
  return typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(value);
}

function readTextStyle(style, defaults) {
  return {
    font: textSetting(style?.font, '').trim() || defaults.font,
    size: numberSetting(style?.size, FONT_SIZE_RANGE, defaults.size),
    color: colorSetting(style?.color, defaults.color),
    bold: style?.bold === true,
    italic: style?.italic === true,
    underline: style?.underline === true
  };
}

function readMetricSettings(metric, defaults) {
  return {
    alignment: ALIGNMENTS.includes(metric?.alignment) ? metric.alignment : defaults.alignment,
    background: colorSetting(metric?.background, defaults.background),
    label: textSetting(metric?.label, defaults.label),
    padding: numberSetting(metric?.padding, METRIC_PADDING_RANGE, defaults.padding),
    valueStyle: readTextStyle(metric?.valueStyle, defaults.valueStyle),
    labelStyle: readTextStyle(metric?.labelStyle, defaults.labelStyle)
  };
}

function readLayout(layout) {
  const defaults = DEFAULTS.layout;
  const cornersLinked = layout?.cornersLinked !== false;
  const sidesLinked = layout?.sidesLinked !== false;
  const readEdges = (keys, values, fallback, linked) => Object.fromEntries(keys.map(key => [
    key, numberSetting(values?.[linked ? keys[0] : key], METRIC_PADDING_RANGE, fallback[key])
  ]));
  return {
    borderSize: BORDER_SIZES.includes(layout?.borderSize) ? layout.borderSize : defaults.borderSize,
    borderColor: colorSetting(layout?.borderColor, defaults.borderColor),
    cornersLinked,
    sidesLinked,
    corners: readEdges(CORNERS, layout?.corners, defaults.corners, cornersLinked),
    padding: readEdges(SIDES, layout?.padding, defaults.padding, sidesLinked)
  };
}

export function readSettings(settings) {
  const saved = settings.get(SETTINGS_KEY);
  let config;
  try {
    config = saved ? JSON.parse(saved) : undefined;
  } catch {
    // A damaged settings record can be replaced by saving from the format dialog.
  }
  const header = config?.header;
  const labelPosition = config?.secondary?.labelPosition;
  const image = config?.image;
  const src = imageSource(image?.src) ? image.src : DEFAULTS.image.src;
  return {
    layout: readLayout(config?.layout),
    header: {
      title: textSetting(header?.title, DEFAULTS.header.title),
      height: numberSetting(header?.height, HEADER_HEIGHT_RANGE, DEFAULTS.header.height),
      background: colorSetting(header?.background, DEFAULTS.header.background),
      alignment: ALIGNMENTS.includes(header?.alignment) ? header.alignment : DEFAULTS.header.alignment,
      style: readTextStyle(header?.style, DEFAULTS.header.style)
    },
    primary: readMetricSettings(config?.primary, DEFAULTS.primary),
    secondary: {
      ...readMetricSettings(config?.secondary, DEFAULTS.secondary),
      labelPosition: LABEL_POSITIONS.includes(labelPosition) ? labelPosition : DEFAULTS.secondary.labelPosition
    },
    image: {
      side: image?.side === 'right' ? image.side : DEFAULTS.image.side,
      name: src ? textSetting(image.name, DEFAULTS.image.name) : DEFAULTS.image.name,
      src
    }
  };
}

export function renderCard(container, config, metrics) {
  cardObservers.get(container)?.disconnect();
  cardObservers.delete(container);
  const card = document.createElement('article');
  card.className = 'kpi-card';
  const { borderSize, borderColor, corners, padding } = config.layout;
  const outer = document.createElement('div');
  outer.style.padding = SIDES.map(side => `${padding[side]}px`).join(' ');
  card.style.border = `${borderSize}px solid ${borderColor}`;
  card.style.borderRadius = CORNERS.map(corner => `${corners[corner]}px`).join(' ');
  if (CORNERS.some(corner => corners[corner] > 0)) card.style.overflow = 'hidden';
  outer.append(card);
  const metricLayouts = new Map();

  if (config.header.title.trim()) {
    const header = document.createElement('header');
    header.className = 'kpi-header';
    header.style.height = `${config.header.height}px`;
    header.style.backgroundColor = config.header.background;
    header.style.textAlign = config.header.alignment;
    const title = document.createElement('div');
    title.textContent = config.header.title;
    styleText(title, config.header.style);
    header.append(title);
    card.append(header);
  }

  for (const slot of SLOTS) {
    const metric = metrics[slot];
    if (!metric) continue;

    const section = document.createElement('section');
    section.className = `kpi-section ${slot}`;
    const settings = config[slot];
    section.dataset.alignment = settings.alignment;
    section.style.backgroundColor = settings.background ?? '#ffffff';
    section.style.padding = `${settings.padding}px`;
    const contents = document.createElement('div');
    contents.className = 'kpi-contents';
    contents.dataset.labelPosition = settings.labelPosition ?? 'below';
    contents.dataset.alignment = settings.alignment;

    const value = document.createElement('div');
    value.className = 'kpi-value';
    value.textContent = metric.value ?? '—';
    styleText(value, settings.valueStyle);
    const label = document.createElement('div');
    label.className = 'kpi-label';
    label.textContent = settings.label.trim() || metric.label;
    styleText(label, settings.labelStyle);
    contents.append(value, label);
    section.append(contents);
    const textLines = [value, label].map(element => {
      const baseline = document.createElement('span');
      baseline.className = 'kpi-baseline';
      baseline.setAttribute('aria-hidden', 'true');
      element.prepend(baseline);
      return { element, baseline };
    });
    let image;
    const updateLayout = () => {
      const trimmedHeight = fitMetricText(contents, textLines);
      if (section.dataset.alignment === 'center' && image?.naturalHeight) {
        const width = trimmedHeight * image.naturalWidth / image.naturalHeight;
        section.style.setProperty('--center-image-width', `${width}px`);
      }
    };
    metricLayouts.set(contents, updateLayout);

    if (slot === 'primary' && imageSource(config.image.src)) {
      const side = config.image.side === 'right' ? 'right' : 'left';
      section.dataset.imageSide = side;
      const pane = document.createElement('div');
      pane.className = 'kpi-image';
      image = document.createElement('img');
      image.addEventListener('load', () => {
        if (card.isConnected) updateLayout();
      });
      setCenteredImage(image, config.image.src);
      image.alt = '';
      pane.append(image);
      if (side === 'left') section.prepend(pane);
      else section.append(pane);
    }

    card.append(section);
  }

  container.textContent = '';
  container.append(outer);
  if (typeof ResizeObserver === 'function' && metricLayouts.size) {
    const observer = new ResizeObserver(entries => requestAnimationFrame(() => {
      if (!card.isConnected) return;
      for (const { target } of entries) metricLayouts.get(target)();
    }));
    cardObservers.set(container, observer);
    for (const contents of metricLayouts.keys()) observer.observe(contents);
  }
  for (const update of metricLayouts.values()) update();
}

function fitMetricText(contents, lines) {
  const rect = contents.getBoundingClientRect();
  let topInset = Infinity;
  let bottomInset = Infinity;
  for (const { element, baseline } of lines) {
    const marker = baseline.getBoundingClientRect();
    const text = baseline.nextSibling;
    if (!marker.height || !text?.textContent.trim()) continue;
    if (!textContext) textContext = document.createElement('canvas').getContext('2d');
    if (!textContext) continue;
    const style = getComputedStyle(element);
    textContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const range = document.createRange();
    range.selectNodeContents(text);
    const boxes = range.getClientRects();
    const firstLine = boxes[0];
    const lastLine = boxes[boxes.length - 1];
    if (!firstLine || !lastLine) continue;
    const lineText = firstLine.top === lastLine.top
      ? [text.textContent, text.textContent]
      : outerLineText(range, text, firstLine.top, lastLine.top);
    const ascent = textContext.measureText(lineText[0]).actualBoundingBoxAscent;
    let descent = textContext.measureText(lineText[1]).actualBoundingBoxDescent;
    if (!Number.isFinite(ascent) || !Number.isFinite(descent)) continue;
    if (style.textDecorationLine.includes('underline')) {
      descent = Math.max(descent, parseFloat(style.fontSize) * .14);
    }
    topInset = Math.min(topInset, (marker.bottom - rect.top) / marker.height - ascent);
    bottomInset = Math.min(bottomInset,
      (rect.bottom - marker.bottom - lastLine.top + firstLine.top) / marker.height - descent);
  }
  if (!Number.isFinite(topInset)) return contents.offsetHeight;

  // Trim the empty portions of the outer line boxes before applying section padding.
  contents.style.marginTop = `${-topInset}px`;
  contents.style.marginBottom = `${-bottomInset}px`;
  return Math.max(0, contents.offsetHeight - topInset - bottomInset);
}

function outerLineText(range, text, firstTop, lastTop) {
  const bounds = [];
  let offset = 0;
  for (const char of text.textContent) {
    range.setStart(text, offset);
    offset += char.length;
    range.setEnd(text, offset);
    const rect = range.getBoundingClientRect();
    if (rect.width) bounds.push({ char, top: rect.top });
  }
  return [firstTop, lastTop].map(top => bounds
    .filter(bound => bound.top === top).map(bound => bound.char).join(''));
}

function setCenteredImage(image, source) {
  if (centeredImage.source === source) {
    image.src = centeredImage.displaySource;
    return;
  }

  image.addEventListener('load', () => {
    const displaySource = trimImagePadding(image) ?? source;
    centeredImage = { source, displaySource };
    if (displaySource !== source) image.src = displaySource;
  }, { once: true });
  image.src = source;
}

function trimImagePadding(image) {
  const { naturalWidth: width, naturalHeight: height } = image;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context || !width || !height) return;

  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, width, height);
  const isWhite = offset => data[offset + 3] >= 250
    && data[offset] >= 250 && data[offset + 1] >= 250 && data[offset + 2] >= 250;
  const corners = [0, width - 1, width * (height - 1), width * height - 1];
  const hasWhiteMargins = corners.every(pixel => isWhite(pixel * 4));
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] === 0 || (hasWhiteMargins && isWhite(offset))) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  const trimmedWidth = right - left + 1;
  const trimmedHeight = bottom - top + 1;
  if (trimmedWidth <= 0 || trimmedHeight <= 0 || (trimmedWidth === width && trimmedHeight === height)) return;
  canvas.width = trimmedWidth;
  canvas.height = trimmedHeight;
  context.putImageData(new ImageData(data, width, height), -left, -top);
  return canvas.toDataURL();
}

export function applyFontFamily(element, font) {
  const name = font || textDefaults.font;
  const known = Object.prototype.hasOwnProperty.call(FONTS, name);
  const escaped = name.replace(/["\\]/g, '\\$&');
  element.style.fontFamily = known ? FONTS[name] : `"${escaped}", "Segoe UI", Arial, sans-serif`;
  element.style.fontWeight = Object.prototype.hasOwnProperty.call(tableauFontWeights, name)
    ? tableauFontWeights[name] : '';
}

function styleText(element, style) {
  applyFontFamily(element, style.font);
  element.style.fontSize = `${style.size}pt`;
  element.style.color = style.color;
  if (style.bold) element.style.fontWeight = '700';
  if (style.italic) element.style.fontStyle = 'italic';
  if (style.underline) element.style.textDecoration = 'underline';
}
