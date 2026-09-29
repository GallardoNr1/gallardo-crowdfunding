// Código QR de la página pública de un proyecto, como SVG en línea (se imprime bien).
import QRCode from 'qrcode';

export function projectQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#111111', light: '#ffffff' },
  });
}
