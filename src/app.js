import { createEmptyQuote, DEFAULT_COVERAGE, formatDisplayDate, normalizeQuote } from './data.js';
import { renderQuotePreview } from './template.js';
import {
  createDuplicateQuote,
  getNextSequence,
  loadProducerProfile,
  loadQuotes,
  reserveSequence,
  saveProducerProfile,
  upsertQuote
} from './storage.js';

const PRODUCER_LOGO_URL = new URL('../public/logo.png', import.meta.url).href;

const state = {
  quotes: loadQuotes(),
  producerProfile: loadProducerProfile(),
  selectedQuoteId: null,
  currentQuote: null,
  search: ''
};

const form = document.querySelector('#quote-form');
const coveragesContainer = document.querySelector('#coverage-rows');
const previewContainer = document.querySelector('#quote-preview');
const historyList = document.querySelector('#history-list');
const historySearch = document.querySelector('#history-search');
const statusNode = document.querySelector('#status-message');
const duplicateButton = document.querySelector('#duplicate-quote');
const downloadButton = document.querySelector('#download-pdf');
const printButton = document.querySelector('#print-quote');
const newButton = document.querySelector('#new-quote');
const saveButton = document.querySelector('#save-quote');

const fieldMap = {
  producerAdvisorName: ['producer', 'advisorName'],
  producerPhone: ['producer', 'phone'],
  producerEmail: ['producer', 'email'],
  producerRegistration: ['producer', 'registration'],
  clientFullName: ['client', 'fullName'],
  clientDocument: ['client', 'document'],
  clientPhone: ['client', 'phone'],
  clientEmail: ['client', 'email'],
  quoteDate: ['quoteDate'],
  quoteNumber: ['quoteNumber'],
  insuranceType: ['insurance', 'type'],
  insuranceCompany: ['insurance', 'company'],
  insurancePlan: ['insurance', 'plan'],
  insuranceInsuredObject: ['insurance', 'insuredObject'],
  insuranceValidFrom: ['insurance', 'validFrom'],
  insuranceValidUntil: ['insurance', 'validUntil'],
  insurancePaymentMethod: ['insurance', 'paymentMethod'],
  insuranceInsuredAmount: ['insurance', 'insuredAmount'],
  insuranceDeductible: ['insurance', 'deductible'],
  insuranceMonthlyPremium: ['insurance', 'monthlyPremium'],
  insuranceAnnualPremium: ['insurance', 'annualPremium'],
  notes: ['notes']
};

function setDeepValue(target, path, value) {
  const lastKey = path[path.length - 1];
  const parent = path.slice(0, -1).reduce((acc, key) => acc[key], target);
  parent[lastKey] = value;
}

function getDeepValue(target, path) {
  return path.reduce((acc, key) => acc?.[key], target) ?? '';
}

function createFreshQuote() {
  const sequence = getNextSequence();
  reserveSequence(sequence);
  return createEmptyQuote({ producer: state.producerProfile, sequence });
}

function setStatus(message, tone = 'neutral') {
  statusNode.textContent = message;
  statusNode.dataset.tone = tone;
}

function syncProducerProfileFromQuote() {
  state.producerProfile = saveProducerProfile(state.currentQuote.producer);
}

function updateQuoteFromField(name, value) {
  const path = fieldMap[name];
  if (!path) return;
  setDeepValue(state.currentQuote, path, value);
  state.currentQuote.updatedAt = new Date().toISOString();
  if (path[0] === 'producer') syncProducerProfileFromQuote();
  renderPreview();
}

function renderCoveragesRows() {
  coveragesContainer.innerHTML = '';
  state.currentQuote.coverages.forEach((coverage) => {
    const row = document.createElement('div');
    const coverageInput = document.createElement('input');
    const detailInput = document.createElement('textarea');
    const removeButton = document.createElement('button');

    row.className = 'coverage-row';

    coverageInput.type = 'text';
    coverageInput.placeholder = 'Cobertura';
    coverageInput.value = coverage.coverage;
    coverageInput.dataset.coverageId = coverage.id;
    coverageInput.dataset.field = 'coverage';

    detailInput.rows = 2;
    detailInput.placeholder = 'Detalle / límite';
    detailInput.value = coverage.detail;
    detailInput.dataset.coverageId = coverage.id;
    detailInput.dataset.field = 'detail';

    removeButton.type = 'button';
    removeButton.className = 'ghost danger';
    removeButton.dataset.removeCoverage = coverage.id;
    removeButton.disabled = state.currentQuote.coverages.length === 1;
    removeButton.textContent = 'Eliminar';

    row.append(coverageInput, detailInput, removeButton);
    coveragesContainer.appendChild(row);
  });
}

function renderForm() {
  Object.entries(fieldMap).forEach(([name, path]) => {
    const field = form.elements.namedItem(name);
    if (field) field.value = getDeepValue(state.currentQuote, path);
  });
  renderCoveragesRows();
}

function renderPreview() {
  previewContainer.innerHTML = renderQuotePreview(state.currentQuote, { logoUrl: PRODUCER_LOGO_URL });
}

function formatHistoryMeta(quote) {
  return `${formatDisplayDate(quote.quoteDate)} · ${quote.insurance.type || 'Seguro'} · ${quote.insurance.company || 'Sin compañía'}`;
}

function renderHistory() {
  const term = state.search.trim().toLowerCase();
  const filtered = state.quotes.filter((quote) => {
    if (!term) return true;
    const haystack = [
      quote.quoteNumber,
      quote.client.fullName,
      quote.client.document,
      quote.insurance.type,
      quote.insurance.company
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });

  historyList.innerHTML = '';
  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Todavía no hay cotizaciones guardadas.';
    historyList.appendChild(empty);
    return;
  }

  filtered.forEach((quote) => {
    const item = document.createElement('button');
    const title = document.createElement('strong');
    const number = document.createElement('span');
    const meta = document.createElement('small');
    item.type = 'button';
    item.className = `history-item ${quote.id === state.currentQuote.id ? 'is-active' : ''}`;
    item.dataset.quoteId = quote.id;
    title.textContent = quote.client.fullName || 'Cliente sin nombre';
    number.textContent = quote.quoteNumber;
    meta.textContent = formatHistoryMeta(quote);
    item.append(title, number, meta);
    historyList.appendChild(item);
  });
}

function renderActions() {
  duplicateButton.disabled = !state.quotes.length;
  downloadButton.disabled = !state.currentQuote;
  printButton.disabled = !state.currentQuote;
  saveButton.textContent = state.quotes.some((quote) => quote.id === state.currentQuote.id)
    ? 'Actualizar cotización'
    : 'Guardar cotización';
}

function render() {
  renderForm();
  renderPreview();
  renderHistory();
  renderActions();
}

function selectQuote(quoteId) {
  const found = state.quotes.find((quote) => quote.id === quoteId);
  if (!found) return;
  state.currentQuote = structuredClone(found);
  state.selectedQuoteId = found.id;
  setStatus(`Revisando ${found.quoteNumber}.`, 'neutral');
  render();
}

function saveCurrentQuote() {
  state.currentQuote = normalizeQuote({
    ...state.currentQuote,
    updatedAt: new Date().toISOString()
  });
  state.quotes = upsertQuote(state.currentQuote);
  state.selectedQuoteId = state.currentQuote.id;
  setStatus(`Listo: ${state.currentQuote.quoteNumber} quedó guardada.`, 'success');
  render();
}

function openQuoteDocument(mode = 'print') {
  const popup = window.open('', '_blank', 'width=920,height=1240');
  if (!popup) {
    setStatus('El navegador bloqueó la ventana de impresión.', 'error');
    return;
  }

  const html = renderQuotePreview(state.currentQuote, { logoUrl: PRODUCER_LOGO_URL });
  const stylesheetUrl = new URL('../styles.css', window.location.href).href;
  const hint = mode === 'download'
    ? 'Este archivo sale EXACTAMENTE del mismo HTML del preview. Elegí Guardar como PDF en el diálogo.'
    : 'Usá el diálogo del navegador para imprimir o guardar como PDF.';

  popup.document.write(`
    <html lang="es">
      <head>
        <title>${state.currentQuote.quoteNumber}</title>
        <link rel="stylesheet" href="${stylesheetUrl}" />
        <style>
          @page { size: A4; margin: 12mm; }
          body { background: #fff; padding: 24px; }
          .print-only-hint { margin: 0 0 12px; color: #1d3e6f; font: 600 14px/1.4 Inter, sans-serif; }
          @media print {
            body { padding: 0; }
            .print-only-hint { display: none; }
            .quote-sheet { width: 100%; max-width: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <p class="print-only-hint">${hint}</p>
        ${html}
        <script>
          window.onload = () => window.print();
        <\/script>
      </body>
    </html>
  `);
  popup.document.close();
}

function downloadPdf() {
  openQuoteDocument('download');
  setStatus(`Abrí el diálogo para guardar ${state.currentQuote.quoteNumber} como PDF.`, 'success');
}

function printQuote() {
  openQuoteDocument('print');
}

function duplicateCurrentQuote() {
  const baseQuote = state.currentQuote?.id
    ? state.quotes.find((quote) => quote.id === state.currentQuote.id) || state.currentQuote
    : state.quotes[0];

  if (!baseQuote) return;
  state.currentQuote = createDuplicateQuote(baseQuote);
  state.selectedQuoteId = null;
  setStatus(`Duplicada como ${state.currentQuote.quoteNumber}.`, 'success');
  render();
}

function addCoverage() {
  state.currentQuote.coverages.push(DEFAULT_COVERAGE());
  state.currentQuote.updatedAt = new Date().toISOString();
  render();
}

function removeCoverage(id) {
  state.currentQuote.coverages = state.currentQuote.coverages.filter((item) => item.id !== id);
  if (!state.currentQuote.coverages.length) state.currentQuote.coverages.push(DEFAULT_COVERAGE());
  render();
}

function initEvents() {
  form.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;

    if (target.dataset.coverageId) {
      const item = state.currentQuote.coverages.find((coverage) => coverage.id === target.dataset.coverageId);
      if (!item) return;
      item[target.dataset.field] = target.value;
      state.currentQuote.updatedAt = new Date().toISOString();
      renderPreview();
      return;
    }

    updateQuoteFromField(target.name, target.value);
  });

  coveragesContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const removeId = target.getAttribute('data-remove-coverage');
    if (removeId) removeCoverage(removeId);
  });

  document.querySelector('#add-coverage').addEventListener('click', addCoverage);
  newButton.addEventListener('click', () => {
    state.currentQuote = createFreshQuote();
    state.selectedQuoteId = null;
    setStatus('Nueva cotización lista para cargar.', 'neutral');
    render();
  });
  duplicateButton.addEventListener('click', duplicateCurrentQuote);
  downloadButton.addEventListener('click', downloadPdf);
  printButton.addEventListener('click', printQuote);

  historySearch.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderHistory();
  });

  historyList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-quote-id]');
    if (!button) return;
    selectQuote(button.dataset.quoteId);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveCurrentQuote();
  });
}

function bootstrap() {
  if (state.quotes.length) {
    state.currentQuote = structuredClone(state.quotes[0]);
    state.selectedQuoteId = state.currentQuote.id;
    setStatus(`Cargamos la última cotización: ${state.currentQuote.quoteNumber}.`, 'neutral');
  } else {
    state.currentQuote = createFreshQuote();
    setStatus('Arrancá cargando los datos y guardá la primera cotización.', 'neutral');
  }
  render();
  initEvents();
}

bootstrap();
