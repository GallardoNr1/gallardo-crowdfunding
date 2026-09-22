// Formulario de proyecto del backoffice: muestra solo los campos del modo de campaña elegido.
// Se ejecuta en el navegador (lo importan new.astro y edit.astro).
//
// Convenciones en el HTML:
//   - <input type="radio" name="campaign_mode" value="target|open">
//   - [data-mode="target"] / [data-mode="open"]: bloques que solo se ven en ese modo
//   - [data-required-in="target|open"]: campos obligatorios solo en ese modo

export function applyCampaignMode(form: HTMLElement, mode: string) {
  form.querySelectorAll<HTMLElement>('[data-mode]').forEach((el) => {
    el.hidden = el.dataset.mode !== mode;
  });
  form
    .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      '[data-required-in]'
    )
    .forEach((field) => {
      field.required = field.dataset.requiredIn === mode;
    });
}

export function initCampaignForm(form: HTMLElement | null) {
  if (!form) return;
  const radios = Array.from(
    form.querySelectorAll<HTMLInputElement>('input[name="campaign_mode"]')
  );
  const current = () => radios.find((r) => r.checked)?.value ?? 'target';
  radios.forEach((r) => r.addEventListener('change', () => applyCampaignMode(form, current())));
  applyCampaignMode(form, current());
}
