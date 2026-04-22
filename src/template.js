import { formatDisplayDate, getProducerInitials, splitNotesLines } from './data.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderValue(value, fallback = '—') {
  return escapeHtml(value || fallback);
}

function renderInfoRows(rows) {
  return rows
    .map(
      ([label, value]) => `
        <div class="quote-grid__label">${escapeHtml(label)}</div>
        <div class="quote-grid__value">${renderValue(value)}</div>
      `
    )
    .join('');
}

function renderConditionList(notes) {
  const lines = splitNotesLines(notes);
  return lines.length
    ? `<ul class="quote-notes__list">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
    : '<p class="quote-notes__empty">—</p>';
}

function renderBrandMark(quote, logoUrl) {
  if (logoUrl) {
    return `
      <div class="quote-brand__mark quote-brand__mark--logo">
        <img class="quote-brand__logo" src="${escapeHtml(logoUrl)}" alt="Logo del productor asesor" />
      </div>
    `;
  }

  return `<div class="quote-brand__mark">${escapeHtml(getProducerInitials(quote.producer))}</div>`;
}

export function renderQuotePreview(quote, { logoUrl = '' } = {}) {
  const coverageRows = quote.coverages.length
    ? quote.coverages
        .map(
          (item) => `
          <tr>
            <td>${renderValue(item.coverage)}</td>
            <td>${renderValue(item.detail)}</td>
          </tr>
        `
        )
        .join('')
    : '<tr><td>—</td><td>—</td></tr>';

  return `
    <article class="quote-sheet printable-quote">
      <header class="quote-sheet__header">
        ${renderBrandMark(quote, logoUrl)}
        <div class="quote-brand__data">
          <h1>Productores Asesores de Seguros</h1>
          <p>${renderValue(quote.producer.advisorName)}</p>
          <div class="quote-brand__meta">
            <span>Tel: ${renderValue(quote.producer.phone)}</span>
            <span>Email: ${renderValue(quote.producer.email)}</span>
            <span>Mat. N°: ${renderValue(quote.producer.registration)}</span>
          </div>
        </div>
      </header>

      <section class="quote-sheet__title">COTIZACIÓN DE SEGURO</section>

      <section class="quote-sheet__section">
        <div class="quote-section__heading">DATOS DEL CLIENTE</div>
        <div class="quote-grid">
          ${renderInfoRows([
            ['Nombre / Razón social', quote.client.fullName],
            ['DNI / CUIT', quote.client.document],
            ['Teléfono de contacto', quote.client.phone],
            ['Email', quote.client.email],
            ['Fecha de cotización', formatDisplayDate(quote.quoteDate)],
            ['Número de cotización', quote.quoteNumber]
          ])}
        </div>
      </section>

      <section class="quote-sheet__section">
        <div class="quote-section__heading">DETALLE DEL SEGURO COTIZADO</div>
        <div class="quote-grid">
          ${renderInfoRows([
            ['Tipo de seguro', quote.insurance.type],
            ['Compañía aseguradora', quote.insurance.company],
            ['Plan / Modalidad', quote.insurance.plan],
            ['Objeto asegurado', quote.insurance.insuredObject],
            [
              'Vigencia',
              [
                quote.insurance.validFrom ? `Desde ${formatDisplayDate(quote.insurance.validFrom)}` : '',
                quote.insurance.validUntil ? `Hasta ${formatDisplayDate(quote.insurance.validUntil)}` : ''
              ]
                .filter(Boolean)
                .join(' · ')
            ],
            ['Forma de pago', quote.insurance.paymentMethod]
          ])}
        </div>
      </section>

      <section class="quote-sheet__section">
        <div class="quote-section__heading">COBERTURAS INCLUIDAS</div>
        <table class="quote-table">
          <thead>
            <tr>
              <th>Cobertura</th>
              <th>Detalle / Límite</th>
            </tr>
          </thead>
          <tbody>${coverageRows}</tbody>
        </table>
      </section>

      <section class="quote-sheet__section">
        <div class="quote-section__heading">SUMA ASEGURADA Y VALORES</div>
        <div class="quote-values">
          <div class="quote-values__label">Suma asegurada</div>
          <div class="quote-values__value">${renderValue(quote.insurance.insuredAmount)}</div>
          <div class="quote-values__label">Franquicia</div>
          <div class="quote-values__value">${renderValue(quote.insurance.deductible)}</div>
          <div class="quote-values__label quote-values__label--accent">Premio mensual</div>
          <div class="quote-values__value quote-values__value--accent">${renderValue(quote.insurance.monthlyPremium)}</div>
          <div class="quote-values__label quote-values__label--strong">Premio anual</div>
          <div class="quote-values__value quote-values__value--strong">${renderValue(quote.insurance.annualPremium)}</div>
        </div>
      </section>

      <section class="quote-sheet__section">
        <div class="quote-section__heading">OBSERVACIONES Y CONDICIONES</div>
        <div class="quote-notes">${renderConditionList(quote.notes)}</div>
      </section>

      <section class="quote-signatures">
        <div class="quote-signature">
          <div class="quote-signature__line"></div>
          <p>Firma del cliente</p>
          <span>Aclaración: ${renderValue(quote.client.fullName)}</span>
        </div>
        <div class="quote-signature">
          <div class="quote-signature__line quote-signature__line--navy"></div>
          <p>Firma del productor asesor</p>
          <span>Matrícula N°: ${renderValue(quote.producer.registration)}</span>
        </div>
      </section>

      <footer class="quote-footer-note">
        Este documento es una cotización y no constituye contrato de seguro. Ante cualquier consulta, comuníquese con su productor asesor.
      </footer>
    </article>
  `;
}
