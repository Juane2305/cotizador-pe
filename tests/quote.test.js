import test from 'node:test';
import assert from 'node:assert/strict';

import { createEmptyQuote, createQuoteNumber, duplicateQuoteData, normalizeQuote } from '../public/src/data.js';
import { createQuotePdf } from '../public/src/pdf.js';
import { renderQuotePreview } from '../public/src/template.js';

test('createQuoteNumber formats year and sequence', () => {
  const quoteNumber = createQuoteNumber(7, new Date('2026-04-22T12:00:00Z'));
  assert.equal(quoteNumber, 'COT-2026-0007');
});

test('duplicateQuoteData keeps business data but refreshes identifiers', () => {
  const source = normalizeQuote({
    ...createEmptyQuote({ sequence: 3, now: new Date('2026-04-22T12:00:00Z') }),
    client: { fullName: 'Juan Pérez', document: '20-1', phone: '123', email: 'jp@test.com' },
    insurance: {
      type: 'Automotor',
      company: 'Sancor',
      plan: 'Todo riesgo',
      insuredObject: 'Ford Focus',
      validFrom: '2026-04-23',
      validUntil: '2027-04-23',
      paymentMethod: 'Mensual',
      insuredAmount: '$ 20.000.000',
      deductible: '$ 300.000',
      monthlyPremium: '$ 100',
      annualPremium: '$ 1.200'
    },
    notes: 'Incluye granizo.'
  });

  const duplicated = duplicateQuoteData(source, 8, new Date('2026-05-01T12:00:00Z'));
  assert.notEqual(duplicated.id, source.id);
  assert.equal(duplicated.quoteNumber, 'COT-2026-0008');
  assert.equal(duplicated.client.fullName, 'Juan Pérez');
  assert.equal(duplicated.insurance.company, 'Sancor');
});

test('renderQuotePreview injects the main business data and value section', () => {
  const quote = normalizeQuote({
    ...createEmptyQuote({ sequence: 1 }),
    quoteDate: '2026-04-22',
    client: { fullName: 'Ana López', document: '27-123', phone: '261', email: 'ana@test.com' },
    insurance: {
      type: 'Hogar',
      company: 'La Caja',
      plan: 'Integral',
      insuredObject: 'Departamento céntrico',
      validFrom: '2026-05-01',
      validUntil: '2027-05-01',
      paymentMethod: 'Anual',
      insuredAmount: '$ 120.000.000',
      deductible: 'Sin franquicia',
      monthlyPremium: '$ 40.000',
      annualPremium: '$ 480.000'
    },
    coverages: [{ id: '1', coverage: 'Incendio', detail: '$ 10.000.000' }],
    notes: 'Sin franquicia.\nValidez 15 días.'
  });

  const html = renderQuotePreview(quote, { logoUrl: '/logo.png' });
  assert.match(html, /Ana López/);
  assert.match(html, /Hogar/);
  assert.match(html, /Incendio/);
  assert.match(html, /SUMA ASEGURADA Y VALORES/);
  assert.match(html, /logo\.png/);
});

test('createQuotePdf returns a valid pdf payload with the new financial fields', () => {
  const quote = normalizeQuote({
    ...createEmptyQuote({ sequence: 2 }),
    quoteDate: '2026-04-22',
    producer: {
      advisorName: 'Paula Estévez',
      phone: '261-123',
      email: 'paula@test.com',
      registration: '1234',
      logoText: 'PE'
    },
    client: { fullName: 'Carlos Ruiz', document: '20-123', phone: '261-999', email: 'carlos@test.com' },
    insurance: {
      type: 'Automotor',
      company: 'Sancor',
      plan: 'Todo riesgo',
      insuredObject: 'Ford Focus 2020',
      validFrom: '2026-05-01',
      validUntil: '2027-05-01',
      paymentMethod: 'Mensual',
      insuredAmount: '$ 30.000.000',
      deductible: '$ 500.000',
      monthlyPremium: '$ 100.000',
      annualPremium: '$ 1.200.000'
    },
    coverages: [
      { id: '1', coverage: 'Responsabilidad civil', detail: '$ 80.000.000' },
      { id: '2', coverage: 'Granizo', detail: 'Sin franquicia' }
    ],
    notes: 'Cotización sujeta a inspección.\nValidez 15 días.'
  });

  const bytes = createQuotePdf(quote);
  const text = new TextDecoder().decode(bytes);
  assert.match(text, /^%PDF-1.4/);
  assert.match(text, /Productores Asesores de Seguros/);
  assert.match(text, /Carlos Ruiz/);
  assert.match(text, /SUMA ASEGURADA Y VALORES/);
  assert.match(text, /PREMIO MENSUAL/);
  assert.ok(bytes.length > 3200);
});


test('renderQuotePreview builds fleet summary and annex for larger fleets', () => {
  const quote = normalizeQuote({
    ...createEmptyQuote({ sequence: 5 }),
    quoteType: 'fleet',
    client: { fullName: 'Transporte Andino', document: '30-555', phone: '261', email: 'fleet@test.com' },
    insurance: {
      type: 'Automotor',
      company: 'San Cristóbal',
      plan: 'Flota Premium',
      insuredObject: 'Camiones y utilitarios',
      validFrom: '2026-05-01',
      validUntil: '2027-05-01',
      paymentMethod: 'Mensual',
      insuredAmount: '$ 200.000.000',
      deductible: '$ 1.000.000',
      monthlyPremium: '$ 2.500.000',
      annualPremium: '$ 30.000.000'
    },
    fleetVehicles: [
      { id: '1', brand: 'Toyota', model: 'Hilux', year: '2023', insuredAmount: '$ 30.000.000', coverage: 'Todo riesgo', coverageDetail: 'Con granizo' },
      { id: '2', brand: 'Ford', model: 'Ranger', year: '2022', insuredAmount: '$ 28.000.000', coverage: 'Todo riesgo', coverageDetail: 'Sin franquicia' },
      { id: '3', brand: 'Iveco', model: 'Daily', year: '2021', insuredAmount: '$ 35.000.000', coverage: 'Terceros completo', coverageDetail: 'Con cristales' },
      { id: '4', brand: 'Mercedes', model: 'Sprinter', year: '2020', insuredAmount: '$ 25.000.000', coverage: 'Terceros completo', coverageDetail: 'Con robo parcial' }
    ],
    notes: 'Validez 15 días.\nSujeto a inspección.'
  });

  const html = renderQuotePreview(quote, { logoUrl: '/logo.png' });
  assert.match(html, /RESUMEN DE FLOTA/);
  assert.match(html, /ANEXO DE VEHÍCULOS/);
  assert.match(html, /Toyota Hilux/);
  assert.match(html, /Mercedes Sprinter/);
});
