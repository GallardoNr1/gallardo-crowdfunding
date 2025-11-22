/**
 * Utilidades para manejar fechas y mostrar tiempo relativo en español
 */

import React from 'react';

export interface TimeAgoOptions {
  locale?: 'es' | 'en';
  short?: boolean; // Formato corto (ej: "2h" vs "hace 2 horas")
  addPrefix?: boolean; // Agregar "hace" al inicio
  maxDays?: number; // Máximo días antes de mostrar fecha exacta
}

/**
 * Calcula el tiempo transcurrido desde una fecha dada
 * @param dateInput - Fecha en formato string o Date object
 * @param options - Opciones de configuración
 * @returns String con el tiempo relativo (ej: "hace 2 horas")
 */
export function getTimeAgo(
  dateInput: string | Date,
  options: TimeAgoOptions = {}
): string {
  const {
    locale = 'es',
    short = false,
    addPrefix = true,
    maxDays = 30,
  } = options;

  try {
    // Convertir string a Date si es necesario
    const date =
      typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    // Validar fecha
    if (isNaN(date.getTime())) {
      throw new Error('Fecha inválida');
    }

    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    // Si supera el máximo de días, mostrar fecha exacta
    if (diffInDays > maxDays) {
      return formatExactDate(date, locale);
    }

    // Si es en el futuro
    if (diffInMs < 0) {
      return getFutureTime(Math.abs(diffInSeconds), { locale, short });
    }

    // Determinar el texto apropiado
    let timeText = '';

    if (diffInSeconds < 60) {
      timeText = getSecondsText(diffInSeconds, { locale, short });
    } else if (diffInMinutes < 60) {
      timeText = getMinutesText(diffInMinutes, { locale, short });
    } else if (diffInHours < 24) {
      timeText = getHoursText(diffInHours, { locale, short });
    } else if (diffInDays < 7) {
      timeText = getDaysText(diffInDays, { locale, short });
    } else if (diffInWeeks < 4) {
      timeText = getWeeksText(diffInWeeks, { locale, short });
    } else if (diffInMonths < 12) {
      timeText = getMonthsText(diffInMonths, { locale, short });
    } else {
      timeText = getYearsText(diffInYears, { locale, short });
    }

    // Agregar prefijo si está habilitado
    if (addPrefix && locale === 'es' && !short) {
      return `hace ${timeText}`;
    } else if (addPrefix && locale === 'en' && !short) {
      return `${timeText} ago`;
    }

    return timeText;
  } catch (error) {
    console.error('Error al calcular tiempo relativo:', error);
    return 'Fecha inválida';
  }
}

/**
 * Formatea una fecha exacta cuando supera el límite de días
 */
function formatExactDate(date: Date, locale: 'es' | 'en'): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  if (locale === 'es') {
    return date.toLocaleDateString('es-ES', options);
  } else {
    return date.toLocaleDateString('en-US', options);
  }
}

/**
 * Maneja fechas futuras
 */
function getFutureTime(
  seconds: number,
  options: { locale: 'es' | 'en'; short: boolean }
): string {
  const { locale, short } = options;

  if (locale === 'es') {
    if (seconds < 60) return short ? 'ahora' : 'en unos momentos';
    if (seconds < 3600)
      return short
        ? `en ${Math.floor(seconds / 60)}m`
        : `en ${Math.floor(seconds / 60)} minutos`;
    if (seconds < 86400)
      return short
        ? `en ${Math.floor(seconds / 3600)}h`
        : `en ${Math.floor(seconds / 3600)} horas`;
    return short
      ? `en ${Math.floor(seconds / 86400)}d`
      : `en ${Math.floor(seconds / 86400)} días`;
  } else {
    if (seconds < 60) return short ? 'now' : 'in a few moments';
    if (seconds < 3600)
      return short
        ? `in ${Math.floor(seconds / 60)}m`
        : `in ${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400)
      return short
        ? `in ${Math.floor(seconds / 3600)}h`
        : `in ${Math.floor(seconds / 3600)} hours`;
    return short
      ? `in ${Math.floor(seconds / 86400)}d`
      : `in ${Math.floor(seconds / 86400)} days`;
  }
}

// Funciones auxiliares para cada unidad de tiempo
function getSecondsText(
  seconds: number,
  options: { locale: 'es' | 'en'; short: boolean }
): string {
  const { locale, short } = options;

  if (seconds < 5) {
    return locale === 'es'
      ? short
        ? 'ahora'
        : 'unos momentos'
      : short
      ? 'now'
      : 'moments';
  }

  if (locale === 'es') {
    return short ? `${seconds}s` : `${seconds} segundos`;
  } else {
    return short ? `${seconds}s` : `${seconds} seconds`;
  }
}

function getMinutesText(
  minutes: number,
  options: { locale: 'es' | 'en'; short: boolean }
): string {
  const { locale, short } = options;

  if (locale === 'es') {
    if (short) return `${minutes}m`;
    return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
  } else {
    if (short) return `${minutes}m`;
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }
}

function getHoursText(
  hours: number,
  options: { locale: 'es' | 'en'; short: boolean }
): string {
  const { locale, short } = options;

  if (locale === 'es') {
    if (short) return `${hours}h`;
    return hours === 1 ? '1 hora' : `${hours} horas`;
  } else {
    if (short) return `${hours}h`;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
}

function getDaysText(
  days: number,
  options: { locale: 'es' | 'en'; short: boolean }
): string {
  const { locale, short } = options;

  if (locale === 'es') {
    if (short) return `${days}d`;
    return days === 1 ? '1 día' : `${days} días`;
  } else {
    if (short) return `${days}d`;
    return days === 1 ? '1 day' : `${days} days`;
  }
}

function getWeeksText(
  weeks: number,
  options: { locale: 'es' | 'en'; short: boolean }
): string {
  const { locale, short } = options;

  if (locale === 'es') {
    if (short) return `${weeks}sem`;
    return weeks === 1 ? '1 semana' : `${weeks} semanas`;
  } else {
    if (short) return `${weeks}w`;
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
}

function getMonthsText(
  months: number,
  options: { locale: 'es' | 'en'; short: boolean }
): string {
  const { locale, short } = options;

  if (locale === 'es') {
    if (short) return `${months}mes`;
    return months === 1 ? '1 mes' : `${months} meses`;
  } else {
    if (short) return `${months}mo`;
    return months === 1 ? '1 month' : `${months} months`;
  }
}

function getYearsText(
  years: number,
  options: { locale: 'es' | 'en'; short: boolean }
): string {
  const { locale, short } = options;

  if (locale === 'es') {
    if (short) return `${years}a`;
    return years === 1 ? '1 año' : `${years} años`;
  } else {
    if (short) return `${years}y`;
    return years === 1 ? '1 year' : `${years} years`;
  }
}

/**
 * Utilidad adicional para obtener información detallada sobre la diferencia de tiempo
 */
export function getTimeDifference(dateInput: string | Date): {
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
  weeks: number;
  months: number;
  years: number;
  humanReadable: string;
} {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);

  return {
    seconds: diffInSeconds,
    minutes: Math.floor(diffInSeconds / 60),
    hours: Math.floor(diffInSeconds / 3600),
    days: Math.floor(diffInSeconds / 86400),
    weeks: Math.floor(diffInSeconds / 604800),
    months: Math.floor(diffInSeconds / 2629746),
    years: Math.floor(diffInSeconds / 31556952),
    humanReadable: getTimeAgo(date),
  };
}

/**
 * Hook de React para tiempo en vivo (se actualiza automáticamente)
 */
export function useTimeAgo(
  dateInput: string | Date,
  options: TimeAgoOptions = {}
) {
  const [timeAgo, setTimeAgo] = React.useState(() =>
    getTimeAgo(dateInput, options)
  );

  React.useEffect(() => {
    const updateTimeAgo = () => {
      setTimeAgo(getTimeAgo(dateInput, options));
    };

    // Actualizar inmediatamente
    updateTimeAgo();

    // Configurar intervalo de actualización basado en la antigüedad
    const date =
      typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const diffInMs = Date.now() - date.getTime();
    const diffInMinutes = diffInMs / (1000 * 60);

    let intervalMs: number;
    if (diffInMinutes < 1) {
      intervalMs = 1000; // Actualizar cada segundo si es muy reciente
    } else if (diffInMinutes < 60) {
      intervalMs = 60000; // Actualizar cada minuto
    } else {
      intervalMs = 3600000; // Actualizar cada hora
    }

    const interval = setInterval(updateTimeAgo, intervalMs);

    return () => clearInterval(interval);
  }, [dateInput, options]);

  return timeAgo;
}

// Exportar funciones de conveniencia
export const timeAgo = {
  // Formatos principales
  default: (date: string | Date) => getTimeAgo(date),
  short: (date: string | Date) => getTimeAgo(date, { short: true }),
  withoutPrefix: (date: string | Date) =>
    getTimeAgo(date, { addPrefix: false }),
  english: (date: string | Date) => getTimeAgo(date, { locale: 'en' }),

  // Casos específicos
  comment: (date: string | Date) =>
    getTimeAgo(date, { short: false, maxDays: 7 }),
  post: (date: string | Date) => getTimeAgo(date, { short: true, maxDays: 30 }),
  notification: (date: string | Date) =>
    getTimeAgo(date, { short: true, maxDays: 3 }),
};

/**
 * Ejemplos de uso:
 *
 * // Uso básico
 * getTimeAgo('2025-07-09 21:08:56.180522+00') // "hace 2 horas"
 *
 * // Formato corto
 * getTimeAgo('2025-07-09 21:08:56.180522+00', { short: true }) // "2h"
 *
 * // Sin prefijo
 * getTimeAgo('2025-07-09 21:08:56.180522+00', { addPrefix: false }) // "2 horas"
 *
 * // En inglés
 * getTimeAgo('2025-07-09 21:08:56.180522+00', { locale: 'en' }) // "2 hours ago"
 *
 * // Con funciones de conveniencia
 * timeAgo.comment('2025-07-09 21:08:56.180522+00') // Para comentarios
 * timeAgo.short('2025-07-09 21:08:56.180522+00') // Formato corto
 *
 * // Hook para React (actualización automática)
 * const timeText = useTimeAgo('2025-07-09 21:08:56.180522+00');
 */
