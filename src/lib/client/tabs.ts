// Pestañas accesibles (role=tablist/tab/tabpanel) para la edición de proyecto.
// - La pestaña activa se refleja en la URL (?tab=<id>, sin parámetro para la primera) para que
//   una recarga o el POST de un formulario "al momento" vuelvan a la misma pestaña.
// - Al entrar en una pestaña, muestra su aviso `[data-dirty-note]` si el formulario principal
//   tiene cambios sin guardar (lo dice la barra de guardado a través de `isDirty`).

export interface TabsOptions {
  isDirty?: () => boolean;
  /** Nombre del parámetro de la URL. */
  param?: string;
}

export interface TabsApi {
  select(id: string): void;
  current(): string;
}

const KEYS: Record<string, number | 'first' | 'last'> = {
  ArrowRight: 1,
  ArrowLeft: -1,
  Home: 'first',
  End: 'last',
};

export function initTabs(
  root: HTMLElement | null,
  { isDirty, param = 'tab' }: TabsOptions = {}
): TabsApi {
  let currentId = '';
  if (!root) return { select: () => {}, current: () => currentId };

  const tabs = Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]'));
  const idOf = (tab: HTMLElement) => tab.dataset.tab ?? tab.id;
  const panelOf = (tab: HTMLElement) => {
    const id = tab.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  };

  const syncUrl = (id: string) => {
    const url = new URL(location.href);
    if (id === idOf(tabs[0]!)) url.searchParams.delete(param);
    else url.searchParams.set(param, id);
    history.replaceState(history.state, '', url);
  };

  const select = (id: string, focus = false) => {
    const target = tabs.find((t) => idOf(t) === id);
    if (!target) return;
    currentId = id;
    for (const tab of tabs) {
      const active = tab === target;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = panelOf(tab);
      if (panel) {
        panel.hidden = !active;
        const note = panel.querySelector<HTMLElement>('[data-dirty-note]');
        if (note && active) note.hidden = !(isDirty?.() ?? false);
      }
    }
    syncUrl(id);
    if (focus) target.focus();
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => select(idOf(tab)));
    tab.addEventListener('keydown', (event) => {
      const move = KEYS[event.key];
      if (move === undefined) return;
      event.preventDefault();
      const index = tabs.indexOf(tab);
      const next =
        move === 'first'
          ? 0
          : move === 'last'
            ? tabs.length - 1
            : (index + move + tabs.length) % tabs.length;
      select(idOf(tabs[next]!), true);
    });
  }

  const initial =
    tabs.find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs[0];
  if (initial) {
    currentId = idOf(initial);
    for (const tab of tabs) tab.tabIndex = tab === initial ? 0 : -1;
  }

  return { select: (id) => select(id), current: () => currentId };
}
