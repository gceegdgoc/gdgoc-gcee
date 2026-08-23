import PDFDocument from 'pdfkit';
import { formatFullDate } from './dates';

export interface CertificatePdfData {
  certificateId: string;
  studentName: string;
  eventName: string;
  eventDate: string;
  issueDate: string;
  qrCodeDataURL: string;
  verificationUrl: string;
}

const NAVY = '#0b2545';
const DEEP_NAVY = '#07162c';
const ROYAL_BLUE = '#134074';
const GOLD = '#c5a53a';
const GOLD_LIGHT = '#e0c870';
const GOLD_DARK = '#9a7b20';
const GRAY = '#475569';
const GOOGLE_BLUE = '#4285F4';
const GOOGLE_RED = '#EA4335';
const GOOGLE_YELLOW = '#FBBC05';
const GOOGLE_GREEN = '#34A853';

/**
 * Draw premium diagonal geometric corner banners matching reference design.
 */
function drawCornerFlourish(doc: PDFKit.PDFDocument, W: number, H: number) {
  doc.save();

  // ── Top-Left Corner ──
  // Outer deep navy wedge
  doc
    .polygon([0, 0], [170, 0], [0, 210])
    .fill(DEEP_NAVY);

  // Inner royal blue accent wedge
  doc
    .polygon([0, 0], [130, 0], [0, 165])
    .fill(ROYAL_BLUE);

  // Gold accent diagonal stripes
  doc
    .polygon([0, 212], [0, 222], [180, 0], [172, 0])
    .fill(GOLD);
  doc
    .polygon([0, 226], [0, 230], [187, 0], [183, 0])
    .fill(GOLD_LIGHT);

  // ── Bottom-Right Corner ──
  // Outer deep navy wedge
  doc
    .polygon([W, H], [W - 170, H], [W, H - 210])
    .fill(DEEP_NAVY);

  // Inner royal blue accent wedge
  doc
    .polygon([W, H], [W - 130, H], [W, H - 165])
    .fill(ROYAL_BLUE);

  // Gold accent diagonal stripes
  doc
    .polygon([W, H - 212], [W, H - 222], [W - 180, H], [W - 172, H])
    .fill(GOLD);
  doc
    .polygon([W, H - 226], [W, H - 230], [W - 187, H], [W - 183, H])
    .fill(GOLD_LIGHT);

  doc.restore();
}

/**
 * Draw double gold rectangular frame with corner accent knots.
 */
function drawBorders(doc: PDFKit.PDFDocument, W: number, H: number) {
  doc.save();
  const m = 18;

  // Outer primary gold border
  doc.rect(m, m, W - m * 2, H - m * 2).lineWidth(2).stroke(GOLD);

  // Inner hairline gold border
  doc.rect(m + 5, m + 5, W - (m + 5) * 2, H - (m + 5) * 2).lineWidth(0.75).stroke(GOLD_DARK);

  // Corner diamond knots
  const corners = [
    [m, m],
    [W - m, m],
    [m, H - m],
    [W - m, H - m],
  ];
  for (const [cx, cy] of corners) {
    doc.save();
    doc.polygon([cx, cy - 4], [cx + 4, cy], [cx, cy + 4], [cx - 4, cy]).fill(GOLD);
    doc.restore();
  }

  doc.restore();
}

/**
 * Draw the left 3D Gold Ribbon Medal ("BUILD CONNECT INSPIRE").
 */
function drawRibbonBadge(doc: PDFKit.PDFDocument, cx: number, cy: number) {
  doc.save();

  // Hanging blue & gold ribbons
  const rw = 16;
  const rh = 65;
  // Left ribbon
  doc
    .polygon(
      [cx - 18, cy + 15],
      [cx - 18 - rw, cy + 15],
      [cx - 18 - rw + 6, cy + 15 + rh],
      [cx - 18 - rw / 2, cy + 15 + rh - 10],
      [cx - 18, cy + 15 + rh]
    )
    .fill(ROYAL_BLUE);
  // Right ribbon
  doc
    .polygon(
      [cx + 18, cy + 15],
      [cx + 18 + rw, cy + 15],
      [cx + 18 + rw, cy + 15 + rh],
      [cx + 18 + rw / 2, cy + 15 + rh - 10],
      [cx + 18 - 6, cy + 15 + rh]
    )
    .fill(ROYAL_BLUE);

  // Gold scalloped circular medal
  const r = 44;
  const numPoints = 28;
  const outerR = r + 5;
  const innerR = r - 2;

  doc.moveTo(cx + outerR, cy);
  for (let i = 0; i < numPoints * 2; i++) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI * i) / numPoints;
    doc.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }
  doc.closePath().lineWidth(1.5).fillAndStroke(GOLD, GOLD_DARK);

  // Inner concentric ring
  doc.circle(cx, cy, r - 5).lineWidth(2).stroke(GOLD_LIGHT);
  doc.circle(cx, cy, r - 9).lineWidth(1).fillAndStroke(DEEP_NAVY, GOLD);

  // Text inside medal
  doc
    .font('Helvetica-Bold')
    .fontSize(6.5)
    .fillColor(GOLD_LIGHT)
    .text('BUILD', cx - 30, cy - 18, { width: 60, align: 'center' })
    .text('CONNECT', cx - 30, cy - 8, { width: 60, align: 'center' })
    .text('INSPIRE', cx - 30, cy + 2, { width: 60, align: 'center' });

  // 3 Stars inside medal
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor(GOLD)
    .text('★ ★ ★', cx - 30, cy + 13, { width: 60, align: 'center' });

  doc.restore();
}

/**
 * Draw the right Gold Starburst Seal with QR code.
 */
function drawQrBadge(doc: PDFKit.PDFDocument, cx: number, cy: number, qrCodeDataURL?: string) {
  doc.save();

  // Gold scalloped seal
  const r = 48;
  const numPoints = 32;
  const outerR = r + 4;
  const innerR = r - 3;

  doc.moveTo(cx + outerR, cy);
  for (let i = 0; i < numPoints * 2; i++) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI * i) / numPoints;
    doc.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }
  doc.closePath().lineWidth(1.5).fillAndStroke(GOLD, GOLD_DARK);

  // White center background for QR code
  doc.circle(cx, cy, r - 6).fill('#ffffff');

  // Embed QR Code in center
  if (qrCodeDataURL) {
    try {
      const qrSize = 48;
      doc.image(qrCodeDataURL, cx - qrSize / 2, cy - qrSize / 2 - 4, {
        width: qrSize,
        height: qrSize,
      });
    } catch {
      // Fallback
    }
  }

  // Caption beneath QR code
  doc
    .font('Helvetica-Bold')
    .fontSize(5)
    .fillColor(DEEP_NAVY)
    .text('SCAN TO DOWNLOAD', cx - 35, cy + 24, { width: 70, align: 'center' })
    .text('YOUR CERTIFICATE', cx - 35, cy + 30, { width: 70, align: 'center' });

  doc.restore();
}

/**
 * Build a premium A4 landscape certificate PDF matching the exact reference design.
 */
export async function generateCertificatePDF(data: CertificatePdfData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
    autoFirstPage: true,
    bufferPages: true,
  });

  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const W = doc.page.width; // 841.89
  const H = doc.page.height; // 595.28
  const center = W / 2;

  // 1. Crisp white background
  doc.rect(0, 0, W, H).fill('#ffffff');

  // 2. Corner geometric flourishes & double gold frame
  drawCornerFlourish(doc, W, H);
  drawBorders(doc, W, H);

  // 3. Header Section (GDGoC on Left, GCEE on Right)
  // Left: GDGoC Branding
  doc.save();
  // Google brackets < >
  doc.font('Helvetica-Bold').fontSize(16).fillColor(GOOGLE_BLUE).text('<', 145, 48, { continued: true });
  doc.fillColor(GOOGLE_GREEN).text('>', { continued: false });

  doc
    .font('Helvetica-Bold')
    .fontSize(15)
    .fillColor(GOOGLE_BLUE)
    .text('Google ', 172, 44, { continued: true });
  doc.fillColor(NAVY).text('Developer Groups');

  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(GRAY)
    .text('on Campus', 172, 61);

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(NAVY)
    .text('GDGoC GCEE', 172, 73);

  // Right: GCEE Branding
  // College seal circle representation
  const sealX = W - 275;
  const sealY = 62;
  doc.circle(sealX, sealY, 26).lineWidth(1.5).stroke(NAVY);
  doc.circle(sealX, sealY, 22).lineWidth(0.75).stroke(NAVY);
  doc.font('Helvetica-Bold').fontSize(5).fillColor(NAVY).text('GOVERNMENT COLLEGE OF ENGINEERING', sealX - 22, sealY - 18, { width: 44, align: 'center' });
  doc.fontSize(6).text('TAMILNADU', sealX - 22, sealY - 4, { width: 44, align: 'center' });
  doc.fontSize(4).text('KNOWLEDGE IS POWER', sealX - 22, sealY + 12, { width: 44, align: 'center' });

  // College title & tagline
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(NAVY)
    .text('GOVERNMENT COLLEGE', sealX + 36, 42, { align: 'left' });
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(NAVY)
    .text('OF ENGINEERING, ERODE', sealX + 36, 56, { align: 'left' });
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(GOLD)
    .text('LEARN  •  BUILD  •  IMPACT', sealX + 36, 73, { align: 'left' });
  doc.restore();

  // 4. Main Certificate Title
  doc
    .font('Times-Bold')
    .fontSize(40)
    .fillColor(NAVY)
    .text('CERTIFICATE', center - 250, 126, { width: 500, align: 'center' });

  // "— OF PARTICIPATION —" with gold accent divider lines
  const subY = 176;
  doc
    .moveTo(center - 160, subY + 6)
    .lineTo(center - 75, subY + 6)
    .lineWidth(1.5)
    .stroke(GOLD);

  doc
    .font('Helvetica-Bold')
    .fontSize(11.5)
    .fillColor(GOLD_DARK)
    .text('O F   P A R T I C I P A T I O N', center - 70, subY, { width: 140, align: 'center' });

  doc
    .moveTo(center + 75, subY + 6)
    .lineTo(center + 160, subY + 6)
    .lineWidth(1.5)
    .stroke(GOLD);

  // 5. Presentation Line
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(GRAY)
    .text('THIS IS PROUDLY PRESENTED TO', center - 250, 206, { width: 500, align: 'center' });

  // 6. Student Name in large elegant style
  doc
    .font('Times-BoldItalic')
    .fontSize(38)
    .fillColor('#0f2c59')
    .text(data.studentName, center - 300, 226, { width: 600, align: 'center', ellipsis: true });

  // Gold divider with diamond knot
  const divY = 276;
  doc.moveTo(center - 180, divY).lineTo(center - 10, divY).lineWidth(1).stroke(GOLD);
  doc.polygon([center, divY - 3], [center + 4, divY], [center, divY + 3], [center - 4, divY]).fill(GOLD);
  doc.moveTo(center + 10, divY).lineTo(center + 180, divY).lineWidth(1).stroke(GOLD);

  // 7. Event & Participation Details
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor(GRAY)
    .text('for actively participating in the event', center - 250, 290, { width: 500, align: 'center' });

  // Event Name
  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor(NAVY)
    .text(data.eventName, center - 300, 310, { width: 600, align: 'center', ellipsis: true });

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor(GRAY)
    .text('organized by GDGoC GCEE', center - 250, 338, { width: 500, align: 'center' });

  // 8. Event Date Badge (Calendar icon + formatted date)
  const dateFormatted = formatFullDate(data.eventDate || data.issueDate);
  const dateBoxY = 366;
  doc.save();
  // Blue/Gold calendar icon representation
  doc.rect(center - 75, dateBoxY - 2, 14, 14).lineWidth(1).stroke(GOOGLE_BLUE);
  doc.rect(center - 75, dateBoxY - 2, 14, 4).fill(GOOGLE_BLUE);
  doc.font('Helvetica-Bold').fontSize(6).fillColor('#fff').text('·', center - 73, dateBoxY - 4);

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(NAVY)
    .text(dateFormatted, center - 55, dateBoxY, { width: 140, align: 'left' });
  doc.restore();

  // 9. Badges
  // Left Badge: 3D Gold Ribbon Medal
  drawRibbonBadge(doc, 115, 385);

  // Right Badge: Gold Starburst Seal with QR code
  drawQrBadge(doc, W - 115, 410, data.qrCodeDataURL);

  // 10. Bottom Ornamental Scroll & Certificate ID
  const bottomY = H - 52;
  // Ornamental gold scroll flourish
  doc.save();
  doc
    .moveTo(center - 60, bottomY - 10)
    .bezierCurveTo(center - 30, bottomY - 14, center - 10, bottomY - 6, center, bottomY - 10)
    .bezierCurveTo(center + 10, bottomY - 6, center + 30, bottomY - 14, center + 60, bottomY - 10)
    .lineWidth(1)
    .stroke(GOLD);
  doc.polygon([center, bottomY - 13], [center + 3, bottomY - 10], [center, bottomY - 7], [center - 3, bottomY - 10]).fill(GOLD);

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(NAVY)
    .text(`CERTIFICATE ID: ${data.certificateId}`, center - 200, bottomY, {
      width: 400,
      align: 'center',
    });
  doc.restore();

  doc.end();
  return done;
}

export interface StudentRegistrationPdfRow {
  registrationId?: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  year?: string;
  college?: string;
  registeredAt?: Date | string;
}

export async function generateRegistrationListPDFBuffer(opts: {
  eventName: string;
  eventDate: string;
  venue?: string;
  students: StudentRegistrationPdfRow[];
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'portrait',
    margin: 36,
    bufferPages: true,
  });

  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const W = doc.page.width - 72; // 595.28 - 72 = 523.28
  const generatedTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // Header band
  doc.rect(0, 0, doc.page.width, 88).fill(NAVY);

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff').text('GDGoC GCEE', 36, 18, { width: W });
  doc.font('Helvetica').fontSize(9.5).fillColor('#94a3b8').text('Google Developer Groups on Campus — Government College of Engineering, Erode', 36, 38, { width: W });
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#38bdf8').text('STUDENT REGISTRATION REPORT', 36, 56, { width: W });
  doc.font('Helvetica').fontSize(8).fillColor('#cbd5e1').text(`Generated: ${generatedTime} IST`, 36, 70, { width: W, align: 'right' });

  // Event info box
  let y = 104;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text(opts.eventName, 36, y, { width: W });
  y += 18;
  doc.font('Helvetica').fontSize(9).fillColor(GRAY);
  doc.text(`Date: ${opts.eventDate}   |   Venue: ${opts.venue || 'TBA'}   |   Total Registered: ${opts.students.length}`, 36, y, { width: W });
  y += 18;

  doc.moveTo(36, y).lineTo(36 + W, y).lineWidth(1).stroke(NAVY);
  y += 10;

  // Table columns
  const cols = [
    { label: '# / Reg ID', x: 36, w: 72 },
    { label: 'Student Name', x: 112, w: 105 },
    { label: 'Year', x: 220, w: 40 },
    { label: 'Dept', x: 263, w: 55 },
    { label: 'Email', x: 322, w: 120 },
    { label: 'College / Institution', x: 445, w: 114 },
  ];

  function drawTableHeader(curY: number) {
    doc.rect(36, curY - 3, W, 18).fill('#0f172a');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
    for (const col of cols) {
      doc.text(col.label, col.x, curY + 2, { width: col.w, ellipsis: true });
    }
    return curY + 18;
  }

  y = drawTableHeader(y);

  // Table rows
  for (let i = 0; i < opts.students.length; i++) {
    const s = opts.students[i];

    if (y > 750) {
      doc.addPage();
      y = 36;
      doc.rect(0, 0, doc.page.width, 30).fill(NAVY);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text(`GDGoC GCEE — ${opts.eventName} (Registration List)`, 36, 10, { width: W });
      y = 44;
      y = drawTableHeader(y);
    }

    if (i % 2 === 0) {
      doc.rect(36, y - 2, W, 16).fill('#f8fafc');
    }

    doc.font('Helvetica').fontSize(7.5).fillColor('#1e293b');
    const idLabel = s.registrationId ? s.registrationId.replace(/^REG-/, '') : String(i + 1);
    doc.text(idLabel, cols[0].x, y + 2, { width: cols[0].w, ellipsis: true });
    doc.font('Helvetica-Bold').fontSize(7.5).text(s.name || '—', cols[1].x, y + 2, { width: cols[1].w, ellipsis: true });
    doc.font('Helvetica').fontSize(7.5).text(s.year || '—', cols[2].x, y + 2, { width: cols[2].w, ellipsis: true });
    doc.text(s.department || '—', cols[3].x, y + 2, { width: cols[3].w, ellipsis: true });
    doc.text(s.email || '—', cols[4].x, y + 2, { width: cols[4].w, ellipsis: true });
    doc.text(s.college || 'GCE Erode', cols[5].x, y + 2, { width: cols[5].w, ellipsis: true });

    y += 16;
  }

  // Footer on each page
  const pageRange = doc.bufferedPageRange();
  for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
    doc.switchToPage(i);
    doc.moveTo(36, 800).lineTo(36 + W, 800).lineWidth(0.5).stroke('#cbd5e1');
    doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
    doc.text('GDGoC GCEE — Google Developer Groups on Campus, Government College of Engineering, Erode', 36, 808, { width: W / 2 + 100 });
    doc.text(`Page ${i + 1} of ${pageRange.count}`, 36, 808, { width: W, align: 'right' });
  }

  doc.end();
  return done;
}

