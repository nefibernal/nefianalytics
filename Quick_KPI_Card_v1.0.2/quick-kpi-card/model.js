export const SETTINGS_KEY = 'quickKpiCard';
export const IMAGE_KEY = 'quickKpiCardImage';
export const SLOTS = ['primary', 'secondary'];
export const ALIGNMENTS = ['left', 'center', 'right'];
export const LABEL_POSITIONS = ['below', 'above', 'left', 'right'];
export const FONTS = {
  'Tableau Medium': '"Tableau Medium", "Tableau Book", "Segoe UI", Arial, sans-serif',
  'Tableau Book': '"Tableau Book", "Segoe UI", Arial, sans-serif',
  'Tableau Bold': '"Tableau Bold", "Segoe UI", Arial, sans-serif',
  'Arial': 'Arial, sans-serif',
  'Georgia': 'Georgia, serif',
  'Segoe UI': '"Segoe UI", Arial, sans-serif',
  'Verdana': 'Verdana, sans-serif',
  'Courier New': '"Courier New", monospace'
};

const textDefaults = { font: 'Tableau Medium', size: 14, color: '#000000' };
const metricDefaults = {
  alignment: 'center',
  label: '',
  valueStyle: textDefaults,
  labelStyle: textDefaults
};

export const DEFAULTS = {
  header: {
    title: '',
    height: 32,
    background: '#f28e2b',
    alignment: 'center',
    style: textDefaults
  },
  primary: metricDefaults,
  secondary: { ...metricDefaults, background: '#f3f3f3', labelPosition: 'below' },
  image: { side: 'right', background: '#ffffff', name: '', src: '' }
};

export const SAMPLE_METRICS = {
  primary: { label: 'Main Marks', value: '25,196' },
  secondary: { label: 'Weight (lb)', value: '26,662,776#' }
};

export function readSettings(settings) {
  const saved = settings.get(SETTINGS_KEY);
  const config = saved ? JSON.parse(saved) : {};
  return {
    header: {
      ...DEFAULTS.header, ...config.header,
      style: { ...textDefaults, ...config.header?.style }
    },
    primary: {
      ...DEFAULTS.primary, ...config.primary,
      valueStyle: { ...textDefaults, ...config.primary?.valueStyle },
      labelStyle: { ...textDefaults, ...config.primary?.labelStyle }
    },
    secondary: {
      ...DEFAULTS.secondary, ...config.secondary,
      valueStyle: { ...textDefaults, ...config.secondary?.valueStyle },
      labelStyle: { ...textDefaults, ...config.secondary?.labelStyle }
    },
    image: {
      ...DEFAULTS.image, ...config.image,
      src: settings.get(IMAGE_KEY) ?? ''
    }
  };
}

export function renderCard(container, config, metrics) {
  const card = document.createElement('article');
  card.className = 'kpi-card';

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
    section.style.backgroundColor = settings.background ?? '#ffffff';
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

    if (slot === 'primary' && /^data:image\/(png|webp|jpeg);base64,/.test(config.image.src)) {
      section.dataset.imageSide = config.image.side;
      const imageArea = document.createElement('div');
      imageArea.className = 'kpi-image';
      imageArea.style.backgroundColor = config.image.background;
      const image = document.createElement('img');
      image.src = config.image.src;
      image.alt = '';
      imageArea.append(image);
      section.append(imageArea);
    }
    card.append(section);
  }

  container.textContent = '';
  container.append(card);
}

function styleText(element, style) {
  element.style.fontFamily = FONTS[style.font] ?? FONTS['Tableau Medium'];
  element.style.fontSize = `${style.size}pt`;
  element.style.color = style.color;
  if (style.font === 'Tableau Bold') element.style.fontWeight = '700';
}
