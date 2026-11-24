export const SETTINGS_KEY = 'quickKpiCard';
export const SLOTS = ['primary', 'secondary'];
export const ALIGNMENTS = ['left', 'center', 'right'];
export const LABEL_POSITIONS = ['below', 'above', 'left', 'right'];
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

const textDefaults = { font: 'Tableau Medium', size: 14, color: '#000000' };
const metricDefaults = {
  alignment: 'center',
  background: '#ffffff',
  label: '',
  valueStyle: textDefaults,
  labelStyle: textDefaults
};

export const DEFAULTS = {
  header: {
    title: 'Quick KPI Card',
    height: 32,
    background: '#f28e2b',
    alignment: 'center',
    style: textDefaults
  },
  primary: metricDefaults,
  secondary: { ...metricDefaults, background: '#f3f3f3', labelPosition: 'below' },
  image: { side: 'left', name: '', src: '' }
};

export const SAMPLE_METRICS = {
  primary: { label: 'Main Marks', value: '25,196' },
  secondary: { label: 'Weight (lb)', value: '26,662,776#' }
};

let centeredImage = { source: '', displaySource: '' };
const imageObservers = new WeakMap();

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
      side: config.image?.side ?? DEFAULTS.image.side,
      name: config.image?.name ?? DEFAULTS.image.name,
      src: config.image?.src ?? DEFAULTS.image.src
    }
  };
}

export function renderCard(container, config, metrics) {
  imageObservers.get(container)?.disconnect();
  imageObservers.delete(container);
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
    section.dataset.alignment = settings.alignment;
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

    if (slot === 'primary' && /^data:image\/(png|jpeg|webp);base64,/.test(config.image.src)) {
      const side = config.image.side === 'right' ? 'right' : 'left';
      section.dataset.imageSide = side;
      const pane = document.createElement('div');
      pane.className = 'kpi-image';
      const image = document.createElement('img');
      if (settings.alignment === 'center' && typeof ResizeObserver === 'function') {
        const sizeImage = () => {
          if (!image.naturalHeight) return;
          const height = Math.max(0, contents.getBoundingClientRect().height - 8);
          const width = height * image.naturalWidth / image.naturalHeight;
          section.style.setProperty('--center-image-width', `${width}px`);
        };
        const observer = new ResizeObserver(() => {
          requestAnimationFrame(() => {
            if (contents.isConnected) sizeImage();
          });
        });
        imageObservers.set(container, observer);
        observer.observe(contents);
        image.addEventListener('load', sizeImage);
      }
      setCenteredImage(image, config.image.src);
      image.alt = '';
      pane.append(image);
      if (side === 'left') section.prepend(pane);
      else section.append(pane);
    }

    card.append(section);
  }

  container.textContent = '';
  container.append(card);
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

function styleText(element, style) {
  const font = FONTS[style.font] ? style.font : textDefaults.font;
  element.style.fontFamily = FONTS[font];
  element.style.fontSize = `${style.size}pt`;
  element.style.color = style.color;
  element.style.fontWeight = tableauFontWeights[font] ?? '';
}
