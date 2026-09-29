// Reduce las imágenes en el navegador antes de subirlas (portada, fotos de la familia, avatar):
// como mucho `maxSize` px de lado y re-codificadas, para no subir fotos de varios MB.
// La parte pura (decisiones y tamaños) se prueba; el canvas se usa solo en `resizeImageFile`.

export const DEFAULT_MAX_SIZE = 1600;
/** Por encima de este peso se re-codifica aunque quepa en el tamaño máximo. */
export const DEFAULT_MIN_BYTES = 1_000_000;
const QUALITY = 0.85;

export interface ResizeOptions {
  maxSize?: number;
  minBytes?: number;
}

export function fitWithin(
  width: number,
  height: number,
  max: number
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** jpeg/png/webp se reducen manteniendo su formato; gif (animaciones) y el resto se dejan igual. */
export function outputType(type: string): string | null {
  return type === 'image/jpeg' || type === 'image/png' || type === 'image/webp'
    ? type
    : null;
}

export function shouldResize(
  file: { type: string; size: number },
  width: number,
  height: number,
  {
    maxSize = DEFAULT_MAX_SIZE,
    minBytes = DEFAULT_MIN_BYTES,
  }: ResizeOptions = {}
): boolean {
  if (!outputType(file.type)) return false;
  return width > maxSize || height > maxSize || file.size > minBytes;
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function renamedFile(name: string, type: string): string {
  const ext = EXT[type] ?? 'jpg';
  return `${name.replace(/\.[^.]+$/, '')}.${ext}`;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/** Devuelve el archivo reducido, o el original si no hace falta o el navegador no puede. */
export async function resizeImageFile(
  file: File,
  options: ResizeOptions = {}
): Promise<File> {
  const type = outputType(file.type);
  if (!type) return file;
  try {
    const image = await decode(file);
    const width = image.width;
    const height = image.height;
    if (!shouldResize(file, width, height, options)) return file;

    const size = fitWithin(width, height, options.maxSize ?? DEFAULT_MAX_SIZE);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, size.width, size.height);
    if ('close' in image) image.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], renamedFile(file.name, type), { type });
  } catch {
    return file;
  }
}

/**
 * Al elegir archivos en el input, los sustituye por sus versiones reducidas antes de enviar.
 * Mientras trabaja, deshabilita el botón de envío del formulario para no subir a medias.
 */
export function attachImageResize(
  input: HTMLInputElement | null,
  options: ResizeOptions = {}
) {
  if (!input || typeof DataTransfer === 'undefined') return;
  input.addEventListener('change', async () => {
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;
    const form = input.form;
    const submits = form
      ? Array.from(
          form.querySelectorAll<HTMLButtonElement>('button[type="submit"]')
        )
      : [];
    submits.forEach((b) => (b.disabled = true));
    try {
      const resized = await Promise.all(
        files.map((f) => resizeImageFile(f, options))
      );
      if (resized.some((f, i) => f !== files[i])) {
        const transfer = new DataTransfer();
        resized.forEach((f) => transfer.items.add(f));
        input.files = transfer.files;
      }
    } finally {
      submits.forEach((b) => (b.disabled = false));
    }
  });
}
