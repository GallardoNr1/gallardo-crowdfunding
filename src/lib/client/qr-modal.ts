// Enlaces del código QR (`[data-qr-modal="<id>"]`): si el JS de los modales está cargado
// (`window.openModal`, lo define UI/Modal.astro) abren el modal; si no, el enlace navega a la hoja
// imprimible /…/qr. Los clics con modificadores (nueva pestaña) se respetan.

type WithModals = Window & { openModal?: (id: string) => void };

export function initQrLinks(root: Document | HTMLElement = document) {
  root.addEventListener('click', (event) => {
    if (!(event instanceof MouseEvent)) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0)
      return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLElement>('[data-qr-modal]');
    const id = link?.dataset.qrModal;
    const open = (window as WithModals).openModal;
    if (!id || typeof open !== 'function') return;
    event.preventDefault();
    open(id);
  });
}
