// Reglas de apertura, cierre y totales de una campaña. Puro: lo usan la API, la página
// pública y el backoffice, y se prueba en tests/campaign.test.ts.

export type CampaignMode = 'target' | 'open';

export interface CampaignLike {
  project_status: string;
  campaign_mode?: CampaignMode | string | null;
  end_date?: string | null;
  current_amount?: number | string | null;
  base_amount?: number | string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Instante en que la campaña deja de admitir aportaciones: inicio (UTC) del día siguiente a end_date. */
export function campaignDeadline(endDate: string | null | undefined): Date | null {
  if (!endDate) return null;
  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate() + 1)
  );
}

export function isCampaignOpen(campaign: CampaignLike, now: Date = new Date()): boolean {
  if (campaign.project_status !== 'active') return false;
  const deadline = campaignDeadline(campaign.end_date);
  return deadline === null || now.getTime() < deadline.getTime();
}

/** Días enteros que faltan; el propio end_date es el día 0. Nunca negativo. null sin fecha. */
export function daysLeft(endDate: string | null | undefined, now: Date = new Date()): number | null {
  const deadline = campaignDeadline(endDate);
  if (!deadline) return null;
  return Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / DAY_MS));
}

export interface CampaignTimeline {
  /** Días de campaña, inicio y cierre incluidos. */
  totalDays: number;
  /** Día en curso (1..totalDays). */
  dayNumber: number;
  /** Porcentaje de tiempo transcurrido (0..100). */
  percent: number;
}

/** Progreso temporal entre start_date y end_date (ambos incluidos). null sin fechas válidas. */
export function campaignTimeline(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  now: Date = new Date()
): CampaignTimeline | null {
  if (!startDate) return null;
  const parsedStart = new Date(startDate);
  const deadline = campaignDeadline(endDate);
  if (Number.isNaN(parsedStart.getTime()) || !deadline) return null;
  const start = Date.UTC(
    parsedStart.getUTCFullYear(),
    parsedStart.getUTCMonth(),
    parsedStart.getUTCDate()
  );
  const span = deadline.getTime() - start;
  if (span <= 0) return null;

  const totalDays = Math.round(span / DAY_MS);
  const elapsed = Math.min(Math.max(now.getTime() - start, 0), span);
  const dayNumber = Math.min(Math.max(Math.floor(elapsed / DAY_MS) + 1, 1), totalDays);
  return { totalDays, dayNumber, percent: (elapsed / span) * 100 };
}

export function campaignTotals(campaign: Pick<CampaignLike, 'current_amount' | 'base_amount'>) {
  const raised = Number(campaign.current_amount) || 0;
  const base = Number(campaign.base_amount) || 0;
  return { raised, base, total: Math.round((raised + base) * 100) / 100 };
}

/** "29 de octubre" (o '' sin fecha). */
export function formatEndDate(endDate: string | null | undefined, locale = 'es-ES'): string {
  if (!endDate) return '';
  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' });
}
