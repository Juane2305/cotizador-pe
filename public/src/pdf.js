import { calculateMonthlyInstallment, formatDisplayDate, getProducerInitials, splitNotesLines } from './data.js';

const PAGE = { width: 595.28, height: 841.89, margin: 38 };
const COLORS = {
  navy: [29 / 255, 62 / 255, 111 / 255],
  orange: [241 / 255, 122 / 255, 5 / 255],
  lightBlue: [220 / 255, 232 / 255, 248 / 255],
  strongBlue: [196 / 255, 212 / 255, 238 / 255],
  softOrange: [1, 241 / 255, 228 / 255],
  border: [188 / 255, 200 / 255, 214 / 255],
  text: [40 / 255, 40 / 255, 40 / 255],
  muted: [110 / 255, 110 / 255, 110 / 255],
  white: [1, 1, 1],
  gray: [170 / 255, 170 / 255, 170 / 255]
};

function pdfEscape(value = '') {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function fmt(value) {
  return Number(value).toFixed(2).replace(/\.00$/, '');
}

function colorCmd([r, g, b], stroke = false) {
  return `${fmt(r)} ${fmt(g)} ${fmt(b)} ${stroke ? 'RG' : 'rg'}`;
}

function approxTextWidth(text, size) {
  return String(text || '').length * size * 0.5;
}

function wrapText(text, maxWidth, size) {
  const normalized = String(text || '—').replace(/\s+/g, ' ').trim();
  if (!normalized) return ['—'];
  const words = normalized.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (approxTextWidth(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

class PdfDocument {
  constructor() {
    this.pages = [];
    this.currentPage = this.createPage();
  }

  createPage() {
    const page = { commands: [] };
    this.pages.push(page);
    return page;
  }

  add(command) {
    this.currentPage.commands.push(command);
  }

  ensurePage(spaceNeeded, cursorY) {
    if (cursorY + spaceNeeded <= PAGE.height - PAGE.margin) return cursorY;
    this.currentPage = this.createPage();
    return PAGE.margin;
  }

  rect(x, top, width, height, { fill, stroke, lineWidth = 1 } = {}) {
    const bottom = PAGE.height - top - height;
    if (fill) this.add(colorCmd(fill));
    if (stroke) this.add(colorCmd(stroke, true));
    if (lineWidth) this.add(`${fmt(lineWidth)} w`);
    const op = fill && stroke ? 'B' : fill ? 'f' : 'S';
    this.add(`${fmt(x)} ${fmt(bottom)} ${fmt(width)} ${fmt(height)} re ${op}`);
  }

  line(x1, top1, x2, top2, { stroke = COLORS.border, lineWidth = 1 } = {}) {
    const y1 = PAGE.height - top1;
    const y2 = PAGE.height - top2;
    this.add(colorCmd(stroke, true));
    this.add(`${fmt(lineWidth)} w`);
    this.add(`${fmt(x1)} ${fmt(y1)} m ${fmt(x2)} ${fmt(y2)} l S`);
  }

  text(x, top, text, { size = 11, font = 'F1', color = COLORS.text, align = 'left', width } = {}) {
    const raw = String(text || '—');
    let finalX = x;
    if (align !== 'left' && width) {
      const measured = approxTextWidth(raw, size);
      if (align === 'center') finalX = x + Math.max(0, (width - measured) / 2);
      if (align === 'right') finalX = x + Math.max(0, width - measured);
    }
    const y = PAGE.height - top - size;
    this.add('BT');
    this.add(colorCmd(color));
    this.add(`/${font} ${fmt(size)} Tf`);
    this.add(`${fmt(finalX)} ${fmt(y)} Td`);
    this.add(`(${pdfEscape(raw)}) Tj`);
    this.add('ET');
  }

  multiLineText(x, top, text, width, { size = 11, font = 'F1', color = COLORS.text, lineGap = 4 } = {}) {
    const lines = wrapText(text, width, size);
    lines.forEach((line, index) => {
      this.text(x, top + index * (size + lineGap), line, { size, font, color, width });
    });
    return lines.length * size + Math.max(0, lines.length - 1) * lineGap;
  }

  build() {
    const objects = [];
    const addObject = (content) => {
      objects.push(content);
      return objects.length;
    };

    const font1 = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const font2 = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    const pageEntries = this.pages.map((page) => {
      const stream = page.commands.join('\n');
      const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      return { contentId };
    });

    const pagesId = addObject('placeholder');
    pageEntries.forEach((entry) => {
      entry.pageId = addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${fmt(PAGE.width)} ${fmt(PAGE.height)}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${entry.contentId} 0 R >>`
      );
    });

    objects[pagesId - 1] = `<< /Type /Pages /Count ${pageEntries.length} /Kids [${pageEntries
      .map((entry) => `${entry.pageId} 0 R`)
      .join(' ')}] >>`;

    const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets[index + 1] = pdf.length;
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new TextEncoder().encode(pdf);
  }
}

function drawHeader(doc, quote, cursorY) {
  const brandTop = cursorY;
  const markWidth = 118;
  const brandHeight = 88;
  const contentWidth = PAGE.width - PAGE.margin * 2;

  doc.rect(PAGE.margin, brandTop, contentWidth, brandHeight, { stroke: COLORS.border });
  doc.rect(PAGE.margin, brandTop, markWidth, brandHeight, { fill: COLORS.navy });
  doc.rect(PAGE.margin + markWidth, brandTop, contentWidth - markWidth, brandHeight, { fill: COLORS.navy });

  doc.text(PAGE.margin + 30, brandTop + 24, getProducerInitials(quote.producer), {
    size: 32,
    font: 'F2',
    color: COLORS.white
  });

  doc.text(PAGE.margin + markWidth + 14, brandTop + 18, 'Productores Asesores de Seguros', {
    size: 16,
    font: 'F2',
    color: COLORS.white
  });
  doc.text(PAGE.margin + markWidth + 14, brandTop + 40, quote.producer.advisorName || '—', {
    size: 11,
    color: COLORS.white
  });

  const meta = [
    `Tel: ${quote.producer.phone || '—'}`,
    `Email: ${quote.producer.email || '—'}`,
    `Mat. N°: ${quote.producer.registration || '—'}`
  ];
  meta.forEach((item, index) => {
    doc.text(PAGE.margin + markWidth + 14 + index * 128, brandTop + 60, item, {
      size: 9.25,
      color: COLORS.white
    });
  });

  const titleTop = brandTop + brandHeight + 18;
  doc.rect(PAGE.margin, titleTop, contentWidth, 30, { fill: COLORS.orange });
  doc.text(PAGE.margin, titleTop + 8, 'COTIZACIÓN DE SEGURO', {
    size: 19,
    font: 'F2',
    color: COLORS.white,
    align: 'center',
    width: contentWidth
  });

  return titleTop + 48;
}

function drawSectionTitle(doc, title, cursorY) {
  const contentWidth = PAGE.width - PAGE.margin * 2;
  doc.rect(PAGE.margin, cursorY, contentWidth, 22, { fill: COLORS.navy });
  doc.text(PAGE.margin + 8, cursorY + 6, title, { size: 11, font: 'F2', color: COLORS.white });
  return cursorY + 22;
}

function drawKeyValueTable(doc, rows, cursorY) {
  const labelWidth = 150;
  const rowHeight = 24;
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const valueWidth = contentWidth - labelWidth;

  rows.forEach(([label, value]) => {
    doc.rect(PAGE.margin, cursorY, labelWidth, rowHeight, { fill: COLORS.lightBlue, stroke: COLORS.border });
    doc.rect(PAGE.margin + labelWidth, cursorY, valueWidth, rowHeight, { fill: COLORS.white, stroke: COLORS.border });
    doc.text(PAGE.margin + 8, cursorY + 7, label, { size: 10, font: 'F2', color: COLORS.navy });
    const linesHeight = doc.multiLineText(PAGE.margin + labelWidth + 8, cursorY + 7, value || '—', valueWidth - 16, {
      size: 9.5,
      color: COLORS.text
    });
    if (linesHeight > rowHeight - 10) {
      const extra = linesHeight - (rowHeight - 10);
      doc.rect(PAGE.margin, cursorY, labelWidth, rowHeight + extra, { fill: COLORS.lightBlue, stroke: COLORS.border });
      doc.rect(PAGE.margin + labelWidth, cursorY, valueWidth, rowHeight + extra, { fill: COLORS.white, stroke: COLORS.border });
      doc.text(PAGE.margin + 8, cursorY + 7, label, { size: 10, font: 'F2', color: COLORS.navy });
      doc.multiLineText(PAGE.margin + labelWidth + 8, cursorY + 7, value || '—', valueWidth - 16, { size: 9.5 });
      cursorY += rowHeight + extra;
    } else {
      cursorY += rowHeight;
    }
  });

  return cursorY + 18;
}

function coverageRowHeight(item) {
  const leftLines = wrapText(item.coverage || '—', 175, 9.5).length;
  const rightLines = wrapText(item.detail || '—', 280, 9.5).length;
  return Math.max(24, Math.max(leftLines, rightLines) * 13 + 10);
}

function drawCoverageTable(doc, items, cursorY) {
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const leftWidth = 200;
  const rightWidth = contentWidth - leftWidth;

  const drawTableHead = (top) => {
    doc.rect(PAGE.margin, top, leftWidth, 24, { fill: COLORS.navy, stroke: COLORS.border });
    doc.rect(PAGE.margin + leftWidth, top, rightWidth, 24, { fill: COLORS.orange, stroke: COLORS.border });
    doc.text(PAGE.margin, top + 7, 'Cobertura', {
      size: 10,
      font: 'F2',
      color: COLORS.white,
      width: leftWidth,
      align: 'center'
    });
    doc.text(PAGE.margin + leftWidth, top + 7, 'Detalle / Límite', {
      size: 10,
      font: 'F2',
      color: COLORS.white,
      width: rightWidth,
      align: 'center'
    });
    return top + 24;
  };

  cursorY = drawTableHead(cursorY);

  const list = items.length ? items : [{ coverage: '—', detail: '—' }];
  for (const item of list) {
    const rowHeight = coverageRowHeight(item);
    cursorY = doc.ensurePage(rowHeight + 30, cursorY);
    if (cursorY === PAGE.margin) {
      cursorY = drawSectionTitle(doc, 'COBERTURAS INCLUIDAS', cursorY);
      cursorY = drawTableHead(cursorY);
    }
    doc.rect(PAGE.margin, cursorY, leftWidth, rowHeight, { fill: COLORS.white, stroke: COLORS.border });
    doc.rect(PAGE.margin + leftWidth, cursorY, rightWidth, rowHeight, { fill: COLORS.white, stroke: COLORS.border });
    doc.multiLineText(PAGE.margin + 8, cursorY + 7, item.coverage || '—', leftWidth - 16, { size: 9.5 });
    doc.multiLineText(PAGE.margin + leftWidth + 8, cursorY + 7, item.detail || '—', rightWidth - 16, { size: 9.5 });
    cursorY += rowHeight;
  }

  return cursorY + 18;
}

function drawValuesTable(doc, quote, cursorY) {
  const labelWidth = 150;
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const valueWidth = contentWidth - labelWidth;
  const rows = quote.quoteType === 'fleet'
    ? [
        ['PREMIO SEMESTRAL', quote.insurance.annualPremium || '—', COLORS.orange, COLORS.softOrange, COLORS.white],
        [
          'VALOR CUOTA MENSUAL',
          calculateMonthlyInstallment(quote.insurance.annualPremium) || quote.insurance.monthlyPremium || '—',
          COLORS.navy,
          COLORS.strongBlue,
          COLORS.white
        ]
      ]
    : [
        ['Suma asegurada', quote.insurance.insuredAmount || '—', COLORS.lightBlue, COLORS.white, COLORS.navy],
        ['Franquicia', quote.insurance.deductible || '—', COLORS.lightBlue, COLORS.white, COLORS.navy],
        ['PREMIO MENSUAL', quote.insurance.monthlyPremium || '—', COLORS.orange, COLORS.softOrange, COLORS.white],
        ['PREMIO ANUAL', quote.insurance.annualPremium || '—', COLORS.navy, COLORS.strongBlue, COLORS.white]
      ];

  rows.forEach(([label, value, labelFill, valueFill, labelColor]) => {
    doc.rect(PAGE.margin, cursorY, labelWidth, 28, { fill: labelFill, stroke: COLORS.border });
    doc.rect(PAGE.margin + labelWidth, cursorY, valueWidth, 28, { fill: valueFill, stroke: COLORS.border });
    doc.text(PAGE.margin + 8, cursorY + 8, label, { size: 10, font: 'F2', color: labelColor });
    doc.text(PAGE.margin + labelWidth + 10, cursorY + 8, value, {
      size: 12,
      font: 'F2',
      color: COLORS.navy
    });
    cursorY += 28;
  });

  return cursorY + 20;
}

function drawObservations(doc, quote, cursorY) {
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const notes = splitNotesLines(quote.notes);
  const lines = notes.length ? notes : ['—'];
  const noteHeight = Math.max(86, lines.length * 18 + 18);

  doc.rect(PAGE.margin, cursorY, contentWidth, 22, { fill: COLORS.navy });
  doc.text(PAGE.margin + 8, cursorY + 6, 'OBSERVACIONES Y CONDICIONES', {
    size: 11,
    font: 'F2',
    color: COLORS.white
  });

  doc.rect(PAGE.margin, cursorY + 22, contentWidth, noteHeight, { fill: COLORS.white, stroke: COLORS.border });
  lines.forEach((line, index) => {
    const top = cursorY + 38 + index * 18;
    doc.text(PAGE.margin + 14, top, '•', { size: 12, color: COLORS.text });
    doc.multiLineText(PAGE.margin + 28, top, line, contentWidth - 42, { size: 10, color: COLORS.text });
  });

  return cursorY + 22 + noteHeight + 22;
}

function drawSignatures(doc, quote, cursorY) {
  cursorY = doc.ensurePage(92, cursorY);
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const columnWidth = (contentWidth - 50) / 2;
  const leftX = PAGE.margin + 14;
  const rightX = PAGE.margin + columnWidth + 50 - 14;

  doc.line(leftX, cursorY + 18, leftX + columnWidth - 28, cursorY + 18, { stroke: COLORS.gray });
  doc.line(rightX, cursorY + 18, rightX + columnWidth - 28, cursorY + 18, { stroke: COLORS.navy });

  doc.text(leftX + 44, cursorY + 22, 'Firma del cliente', { size: 10, color: COLORS.gray });
  doc.text(leftX + 58, cursorY + 42, `Aclaración: ${quote.client.fullName || '—'}`, { size: 10, color: COLORS.muted });

  doc.text(rightX + 18, cursorY + 22, 'Firma del productor asesor', { size: 10, color: COLORS.navy });
  doc.text(rightX + 42, cursorY + 42, `Matrícula N°: ${quote.producer.registration || '—'}`, {
    size: 10,
    color: COLORS.muted
  });

  return cursorY + 70;
}

function drawFooterNote(doc, cursorY) {
  const contentWidth = PAGE.width - PAGE.margin * 2;
  doc.line(PAGE.margin, cursorY, PAGE.margin + contentWidth, cursorY, { stroke: COLORS.orange, lineWidth: 1.1 });
  doc.multiLineText(
    PAGE.margin + 20,
    cursorY + 8,
    'Este documento es una cotización y no constituye contrato de seguro. Ante cualquier consulta, comuníquese con su productor asesor.',
    contentWidth - 40,
    { size: 8.8, color: COLORS.gray }
  );
}

export function createQuotePdf(quote) {
  const doc = new PdfDocument();
  let cursorY = PAGE.margin;

  cursorY = drawHeader(doc, quote, cursorY);
  cursorY = drawSectionTitle(doc, 'DATOS DEL CLIENTE', cursorY);
  cursorY = drawKeyValueTable(
    doc,
    [
      ['Nombre / Razón social', quote.client.fullName || '—'],
      ['DNI / CUIT', quote.client.document || '—'],
      ['Teléfono de contacto', quote.client.phone || '—'],
      ['Email', quote.client.email || '—'],
      ['Fecha de cotización', formatDisplayDate(quote.quoteDate) || '—'],
      ['Número de cotización', quote.quoteNumber || '—']
    ],
    cursorY
  );

  cursorY = doc.ensurePage(215, cursorY);
  if (cursorY === PAGE.margin) cursorY = drawHeader(doc, quote, cursorY);
  cursorY = drawSectionTitle(doc, 'DETALLE DEL SEGURO COTIZADO', cursorY);
  cursorY = drawKeyValueTable(
    doc,
    [
      ['Tipo de seguro', quote.insurance.type || '—'],
      ['Compañía aseguradora', quote.insurance.company || '—'],
      ['Plan / Modalidad', quote.insurance.plan || '—'],
      ['Objeto asegurado', quote.insurance.insuredObject || '—'],
      [
        'Vigencia',
        [
          quote.insurance.validFrom ? `Desde ${formatDisplayDate(quote.insurance.validFrom)}` : '',
          quote.insurance.validUntil ? `Hasta ${formatDisplayDate(quote.insurance.validUntil)}` : ''
        ]
          .filter(Boolean)
          .join(' · ') || '—'
      ],
      ['Forma de pago', quote.insurance.paymentMethod || '—']
    ],
    cursorY
  );

  cursorY = doc.ensurePage(170, cursorY);
  if (cursorY === PAGE.margin) cursorY = drawHeader(doc, quote, cursorY);
  cursorY = drawSectionTitle(doc, 'COBERTURAS INCLUIDAS', cursorY);
  cursorY = drawCoverageTable(doc, quote.coverages, cursorY);

  cursorY = doc.ensurePage(240, cursorY);
  if (cursorY === PAGE.margin) cursorY = drawHeader(doc, quote, cursorY);
  cursorY = drawSectionTitle(doc, 'SUMA ASEGURADA Y VALORES', cursorY);
  cursorY = drawValuesTable(doc, quote, cursorY);
  cursorY = drawObservations(doc, quote, cursorY);
  cursorY = drawSignatures(doc, quote, cursorY);
  drawFooterNote(doc, cursorY);

  return doc.build();
}
