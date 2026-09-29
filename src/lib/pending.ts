// Pendientes del backoffice: aportaciones por confirmar y mensajes por moderar. Puro.

export function countByProject(
  rows: { project_id: string }[] | null
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows ?? []) {
    counts[row.project_id] = (counts[row.project_id] ?? 0) + 1;
  }
  return counts;
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** "2 aportaciones por confirmar y 1 mensaje por moderar"; null si no hay nada pendiente. */
export function pendingSummary(
  contributions: number,
  messages: number
): string | null {
  const parts: string[] = [];
  if (contributions > 0)
    parts.push(
      `${plural(contributions, 'aportación', 'aportaciones')} por confirmar`
    );
  if (messages > 0)
    parts.push(`${plural(messages, 'mensaje', 'mensajes')} por moderar`);
  return parts.length > 0 ? parts.join(' y ') : null;
}
