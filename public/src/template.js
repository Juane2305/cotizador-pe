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

function vehicleTitle(vehicle) {
  return [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Vehículo sin definir';
}

function renderCoverageSection(quote, isFleet) {
  const hasGeneralCoverage = quote.coverages.some((item) => item.coverage || item.detail);
  if (isFleet && !hasGeneralCoverage) return '';

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
    <section class="quote-sheet__section">
      <div class="quote-section__heading">${isFleet ? 'COBERTURAS GENERALES (OPCIONAL)' : 'COBERTURAS INCLUIDAS'}</div>
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
  `;
}

function renderFleetSummary(vehicles) {
  const rows = vehicles.length
    ? vehicles
        .map(
          (vehicle) => `
            <tr>
              <td>${renderValue(vehicleTitle(vehicle))}</td>
              <td>${renderValue(vehicle.year)}</td>
              <td>${renderValue(vehicle.insuredAmount)}</td>
              <td>${renderValue(vehicle.coverage)}</td>
            </tr>
          `
        )
        .join('')
    : '<tr><td>—</td><td>—</td><td>—</td><td>—</td></tr>';

  return `
    <section class="quote-sheet__section">
      <div class="quote-section__heading">RESUMEN DE FLOTA</div>
      <p class="quote-fleet-count">Vehículos incluidos: <strong>${vehicles.length}</strong></p>
      <table class="quote-table quote-table--fleet">
        <thead>
          <tr>
            <th>Vehículo</th>
            <th>Año</th>
            <th>Suma asegurada</th>
            <th>Cobertura</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function renderFleetDetailCards(vehicles, title) {
  return `
    <section class="quote-sheet__section">
      <div class="quote-section__heading">${title}</div>
      <div class="quote-fleet-card-grid">
        ${vehicles
          .map(
            (vehicle, index) => `
              <article class="quote-fleet-card">
                <h3>${index + 1}. ${renderValue(vehicleTitle(vehicle))}</h3>
                <div class="quote-fleet-card__grid">
                  <div><span>Marca</span><strong>${renderValue(vehicle.brand)}</strong></div>
                  <div><span>Modelo</span><strong>${renderValue(vehicle.model)}</strong></div>
                  <div><span>Año</span><strong>${renderValue(vehicle.year)}</strong></div>
                  <div><span>Suma asegurada</span><strong>${renderValue(vehicle.insuredAmount)}</strong></div>
                  <div><span>Cobertura</span><strong>${renderValue(vehicle.coverage)}</strong></div>
                  <div class="quote-fleet-card__detail"><span>Detalle de cobertura</span><strong>${renderValue(vehicle.coverageDetail)}</strong></div>
                </div>
              </article>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}

export function renderQuotePreview(quote, { logoUrl = '' } = {}) {
  const isFleet = quote.quoteType === 'fleet';
  const vehicles = quote.fleetVehicles || [];
  const fleetObjectLabel = vehicles.length
    ? `Flota de ${vehicles.length} vehículo${vehicles.length === 1 ? '' : 's'}`
    : 'Flota';
  const inlineFleetDetails = isFleet && vehicles.length > 0 && vehicles.length <= 3;
  const annexFleetDetails = isFleet && vehicles.length > 3;

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
            ['Tipo de cotización', isFleet ? 'Flota' : 'Individual'],
            ['Tipo de seguro', quote.insurance.type],
            ['Compañía aseguradora', quote.insurance.company],
            ['Plan / Modalidad', quote.insurance.plan],
            ['Objeto asegurado', isFleet ? quote.insurance.insuredObject || fleetObjectLabel : quote.insurance.insuredObject],
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

      ${isFleet ? renderFleetSummary(vehicles) : ''}
      ${renderCoverageSection(quote, isFleet)}

      ${inlineFleetDetails ? renderFleetDetailCards(vehicles, 'DETALLE DE VEHÍCULOS') : ''}

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

      ${annexFleetDetails ? `<section class="quote-annex-page">${renderFleetDetailCards(vehicles, 'ANEXO DE VEHÍCULOS')}</section>` : ''}
    </article>
  `;
}
