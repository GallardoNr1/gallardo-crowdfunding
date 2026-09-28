// Selector de tema del formulario de proyecto: rejilla compacta de fichas (radio) y, debajo,
// un panel por tema con su descripción, emojis y textos; solo se muestra el del tema elegido.
// Los rellenos por programa (borrador de IA) disparan "change" en el radio, así que también
// actualizan el panel.

export function initThemePicker(root: HTMLElement | null) {
  if (!root) return;
  const details = Array.from(
    root.querySelectorAll<HTMLElement>('[data-theme-detail]')
  );
  const show = (id: string) => {
    for (const detail of details)
      detail.hidden = detail.dataset.themeDetail !== id;
  };

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      target.name === 'theme' &&
      target.checked
    ) {
      show(target.value);
    }
  });

  const checked = root.querySelector<HTMLInputElement>(
    'input[name="theme"]:checked'
  );
  if (checked) show(checked.value);
}
