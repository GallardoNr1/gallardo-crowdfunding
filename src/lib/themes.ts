// Temas visuales por proyecto: colores (sobrescriben los tokens de src/styles/tokens.css)
// y emojis decorativos. Se guarda el id en page_content.theme. Puro: se usa en SSR y en tests.

export const THEME_IDS = ['fiesta', 'aventura', 'navidad', 'fantasia', 'viaje', 'tecnologia'] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME_ID: ThemeId = 'fiesta';

export interface ThemeEmojis {
  /** Título de la sección de niveles ("🏰 Niveles de Contribución"). */
  levels: string;
  /** Título de la sección del mensaje familiar ("💝 Mensaje de Nuestra Familia"). */
  message: string;
  /** Icono grande junto al mensaje familiar. */
  messageIcon: string;
  /** Título del muro de mensajes de apoyo. */
  support: string;
  /** Título de la sección de miembros de la familia. */
  family: string;
  /** Icono del modal de contribución. */
  modal: string;
  /** "Chispas" de los botones de contribuir. */
  spark: string;
  /** Insignia de contribuidor / nivel sin emoji propio. */
  contributor: string;
  /** Muro vacío. */
  empty: string;
  /** Partículas flotantes del hero de cierre (mín. 5). */
  hero: string[];
  /** Confeti de la celebración (mín. 5). */
  confetti: string[];
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  /** Tres colores para la tarjeta del backoffice y la home: principal, acción, fondo. */
  swatch: [string, string, string];
  colors: Record<string, string>;
  emojis: ThemeEmojis;
}

const colors = (c: {
  primary: string; action: string; actionAlt: string; yellow: string;
  green: string; greenDark: string; greenLight: string; purple: string; purpleDark: string;
  headerBg: string; headerText: string; headerSubtitle: string;
  bodyFrom: string; bodyMid: string; bodyTo: string;
  progressFrom: string; progressTo: string; levelsFrom: string; levelsTo: string; sectionAccent: string;
  accent: string; accentDark: string; accentLight: string; accentBg: string;
}): Record<string, string> => ({
  '--color-brand-primary': c.primary,
  '--color-brand-orange': c.action,
  '--color-brand-orange-alt': c.actionAlt,
  '--color-brand-yellow': c.yellow,
  '--color-brand-green': c.green,
  '--color-brand-green-dark': c.greenDark,
  '--color-brand-green-light': c.greenLight,
  '--color-brand-purple': c.purple,
  '--color-brand-purple-dark': c.purpleDark,
  '--color-header-bg': c.headerBg,
  '--color-header-text': c.headerText,
  '--color-header-subtitle': c.headerSubtitle,
  '--color-body-bg-from': c.bodyFrom,
  '--color-body-bg-mid': c.bodyMid,
  '--color-body-bg-to': c.bodyTo,
  '--color-section-progress-from': c.progressFrom,
  '--color-section-progress-to': c.progressTo,
  '--color-section-levels-from': c.levelsFrom,
  '--color-section-levels-to': c.levelsTo,
  '--color-section-orange-accent': c.sectionAccent,
  '--color-accent': c.accent,
  '--color-accent-dark': c.accentDark,
  '--color-accent-light': c.accentLight,
  '--color-accent-bg': c.accentBg,
});

export const THEMES: Record<ThemeId, Theme> = {
  fiesta: {
    id: 'fiesta',
    name: '🎉 Fiesta',
    description: 'Naranja, rojo y amarillo. El look de siempre.',
    swatch: ['#d32f2f', '#ff6b35', '#ffcc02'],
    colors: colors({
      primary: '#d32f2f', action: '#ff6b35', actionAlt: '#f7931e', yellow: '#ffcc02',
      green: '#4caf50', greenDark: '#2e7d32', greenLight: '#8bc34a', purple: '#667eea', purpleDark: '#764ba2',
      headerBg: '#1f2937', headerText: '#f3f4f6', headerSubtitle: '#d1d5db',
      bodyFrom: '#bcbec0', bodyMid: '#e6e7e8', bodyTo: '#a7a8aa',
      progressFrom: '#fff3e0', progressTo: '#ffcc02', levelsFrom: '#e8f5e8', levelsTo: '#c8e6c8', sectionAccent: '#e65100',
      accent: '#e91e63', accentDark: '#c2185b', accentLight: '#f8bbd9', accentBg: '#fce4ec',
    }),
    emojis: {
      levels: '🏰', message: '💝', messageIcon: '🏰', support: '💬', family: '🌸', modal: '🧡',
      spark: '✨', contributor: '⭐', empty: '👋',
      hero: ['🎉', '✨', '🎊', '💛', '🎁', '⭐', '🎉'],
      confetti: ['🎉', '✨', '🌟', '💫', '🎊', '🎁', '💝', '💛', '⭐'],
    },
  },
  aventura: {
    id: 'aventura',
    name: '🚴 Aventura',
    description: 'Verde bosque, tierra y cielo. Bicis, montaña y aire libre.',
    swatch: ['#1b5e20', '#388e3c', '#ffd54f'],
    colors: colors({
      primary: '#1b5e20', action: '#388e3c', actionAlt: '#66bb6a', yellow: '#ffd54f',
      green: '#43a047', greenDark: '#1b5e20', greenLight: '#a5d6a7', purple: '#0277bd', purpleDark: '#01579b',
      headerBg: '#1b3a2a', headerText: '#f1f8e9', headerSubtitle: '#c5e1a5',
      bodyFrom: '#dcedc8', bodyMid: '#f1f8e9', bodyTo: '#c5e1a5',
      progressFrom: '#fff8e1', progressTo: '#ffe082', levelsFrom: '#e8f5e9', levelsTo: '#c8e6c9', sectionAccent: '#ef6c00',
      accent: '#2e7d32', accentDark: '#1b5e20', accentLight: '#a5d6a7', accentBg: '#e8f5e9',
    }),
    emojis: {
      levels: '🧭', message: '🏕️', messageIcon: '🏔️', support: '🌲', family: '🌞', modal: '🚴',
      spark: '🌿', contributor: '⛰️', empty: '🥾',
      hero: ['🚴', '🏔️', '🌲', '🌞', '🧭', '🌿', '🚵'],
      confetti: ['🚴', '🌲', '🍃', '🌞', '⛰️', '🧭', '💚', '⭐', '🌿'],
    },
  },
  navidad: {
    id: 'navidad',
    name: '🎄 Navidad',
    description: 'Rojo, verde y dorado sobre blanco nieve.',
    swatch: ['#b71c1c', '#c62828', '#ffd700'],
    colors: colors({
      primary: '#b71c1c', action: '#c62828', actionAlt: '#e53935', yellow: '#ffd700',
      green: '#2e7d32', greenDark: '#1b5e20', greenLight: '#81c784', purple: '#1565c0', purpleDark: '#0d47a1',
      headerBg: '#14532d', headerText: '#fff8e1', headerSubtitle: '#ffe082',
      bodyFrom: '#dbe9f6', bodyMid: '#ffffff', bodyTo: '#c9dcec',
      progressFrom: '#fff8e1', progressTo: '#ffd700', levelsFrom: '#e8f5e9', levelsTo: '#c8e6c9', sectionAccent: '#b71c1c',
      accent: '#c62828', accentDark: '#8e0000', accentLight: '#ef9a9a', accentBg: '#ffebee',
    }),
    emojis: {
      levels: '🎄', message: '🎁', messageIcon: '🔔', support: '❄️', family: '🦌', modal: '🎅',
      spark: '⭐', contributor: '🎁', empty: '🕯️',
      hero: ['🎄', '🎁', '⭐', '❄️', '🔔', '🎉', '✨'],
      confetti: ['❄️', '🎄', '⭐', '🎁', '🔔', '✨', '❤️', '💚', '🌟'],
    },
  },
  fantasia: {
    id: 'fantasia',
    name: '🐉 Fantasía',
    description: 'Morado, oro y azul noche. Dragones y castillos.',
    swatch: ['#4a148c', '#6a1b9a', '#ffca28'],
    colors: colors({
      primary: '#4a148c', action: '#6a1b9a', actionAlt: '#8e24aa', yellow: '#ffca28',
      green: '#00897b', greenDark: '#00695c', greenLight: '#4db6ac', purple: '#5e35b1', purpleDark: '#311b92',
      headerBg: '#1a1040', headerText: '#ede7f6', headerSubtitle: '#b39ddb',
      bodyFrom: '#d1c4e9', bodyMid: '#f3e5f5', bodyTo: '#b39ddb',
      progressFrom: '#fff8e1', progressTo: '#ffd54f', levelsFrom: '#ede7f6', levelsTo: '#d1c4e9', sectionAccent: '#ff8f00',
      accent: '#8e24aa', accentDark: '#6a1b9a', accentLight: '#ce93d8', accentBg: '#f3e5f5',
    }),
    emojis: {
      levels: '🏰', message: '📜', messageIcon: '🐉', support: '🔮', family: '🛡️', modal: '🐉',
      spark: '✨', contributor: '⚔️', empty: '🧙',
      hero: ['🐉', '🏰', '⚔️', '✨', '🛡️', '🔥', '🌟'],
      confetti: ['🐉', '✨', '⚔️', '🏰', '🔥', '💜', '⭐', '🌟', '🛡️'],
    },
  },
  viaje: {
    id: 'viaje',
    name: '✈️ Viaje',
    description: 'Turquesa, arena y coral. Maletas y mapas.',
    swatch: ['#00838f', '#ff7043', '#ffe082'],
    colors: colors({
      primary: '#00838f', action: '#ff7043', actionAlt: '#ffab91', yellow: '#ffe082',
      green: '#26a69a', greenDark: '#00695c', greenLight: '#80cbc4', purple: '#0288d1', purpleDark: '#01579b',
      headerBg: '#004d5a', headerText: '#e0f7fa', headerSubtitle: '#80deea',
      bodyFrom: '#b2ebf2', bodyMid: '#fffde7', bodyTo: '#80deea',
      progressFrom: '#fff8e1', progressTo: '#ffe082', levelsFrom: '#e0f2f1', levelsTo: '#b2dfdb', sectionAccent: '#ff7043',
      accent: '#ff7043', accentDark: '#e64a19', accentLight: '#ffab91', accentBg: '#fbe9e7',
    }),
    emojis: {
      levels: '🧳', message: '🗺️', messageIcon: '✈️', support: '🌍', family: '☀️', modal: '✈️',
      spark: '🌴', contributor: '🌍', empty: '📸',
      hero: ['✈️', '🌍', '🧳', '☀️', '🗺️', '🎉', '🌴'],
      confetti: ['✈️', '🌍', '☀️', '🌴', '🧳', '💙', '⭐', '🎉', '🗺️'],
    },
  },
  tecnologia: {
    id: 'tecnologia',
    name: '💻 Tecnología',
    description: 'Índigo y cian. Pantallas, cohetes y rayos.',
    swatch: ['#283593', '#3949ab', '#00acc1'],
    colors: colors({
      primary: '#283593', action: '#3949ab', actionAlt: '#5c6bc0', yellow: '#b2ebf2',
      green: '#00acc1', greenDark: '#006064', greenLight: '#4dd0e1', purple: '#3f51b5', purpleDark: '#1a237e',
      headerBg: '#0d1b3e', headerText: '#e8eaf6', headerSubtitle: '#9fa8da',
      bodyFrom: '#c5cae9', bodyMid: '#f5f7fb', bodyTo: '#9fa8da',
      progressFrom: '#e0f7fa', progressTo: '#80deea', levelsFrom: '#e8eaf6', levelsTo: '#c5cae9', sectionAccent: '#00acc1',
      accent: '#3949ab', accentDark: '#283593', accentLight: '#9fa8da', accentBg: '#e8eaf6',
    }),
    emojis: {
      levels: '💻', message: '💌', messageIcon: '📱', support: '💬', family: '⚡', modal: '🚀',
      spark: '⚡', contributor: '🚀', empty: '🤖',
      hero: ['🚀', '💻', '📱', '⚡', '✨', '🎉', '🛰️'],
      confetti: ['🚀', '⚡', '💻', '📱', '✨', '💙', '⭐', '🛰️', '🎉'],
    },
  },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

/** Tema por id; cualquier valor desconocido devuelve el tema por defecto. */
export function getTheme(id: string | null | undefined): Theme {
  return isThemeId(id) ? THEMES[id] : THEMES[DEFAULT_THEME_ID];
}

/** CSS con un bloque `html[data-theme="id"]` por tema que sobrescribe los tokens. */
export function themeCss(): string {
  return THEME_IDS.map((id) => {
    const decl = Object.entries(THEMES[id].colors)
      .map(([k, v]) => `${k}:${v}`)
      .join(';');
    return `html[data-theme="${id}"]{${decl}}`;
  }).join('\n');
}
