import QRCode from 'qrcode';

/** Generate a QR code as a data URL (PNG). */
export async function generateQRCodeDataURL(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    width: 320,
    margin: 1,
    color: {
      dark: '#0b1b33',
      light: '#ffffff',
    },
  });
}
