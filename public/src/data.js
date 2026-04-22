export const APP_STORAGE_KEYS = {
  quotes: 'insurance-quotes-v2',
  producerProfile: 'insurance-producer-profile-v2',
  meta: 'insurance-meta-v2'
};

export const DEFAULT_CONDITIONS = [
  'Esta cotización tiene una validez de 15 días desde la fecha de emisión.',
  'Los valores pueden estar sujetos a modificaciones por parte de la compañía aseguradora.',
  'La cobertura estará vigente una vez abonado el primer premio y emitida la póliza correspondiente.'
].join('\n');

export const DEFAULT_COVERAGE = () => ({
  id: cryptoSafeId(),
  coverage: '',
  detail: ''
});

export function cryptoSafeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
}

export function createQuoteNumber(sequence = 1, date = new Date()) {
  const year = date.getFullYear();
  return `COT-${year}-${String(sequence).padStart(4, '0')}`;
}

export function createEmptyQuote({ producer = {}, sequence = 1, now = new Date() } = {}) {
  return {
    id: cryptoSafeId(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    quoteNumber: createQuoteNumber(sequence, now),
    quoteDate: formatDateInput(now),
    producer: {
      advisorName: producer.advisorName || '',
      phone: producer.phone || '',
      email: producer.email || '',
      registration: producer.registration || '',
      logoText: producer.logoText || ''
    },
    client: {
      fullName: '',
      document: '',
      phone: '',
      email: ''
    },
    insurance: {
      type: '',
      company: '',
      plan: '',
      insuredObject: '',
      validFrom: '',
      validUntil: '',
      paymentMethod: '',
      insuredAmount: '',
      deductible: '',
      monthlyPremium: '',
      annualPremium: ''
    },
    coverages: [DEFAULT_COVERAGE()],
    notes: DEFAULT_CONDITIONS
  };
}

export function normalizeQuote(rawQuote) {
  return {
    ...rawQuote,
    producer: {
      advisorName: rawQuote?.producer?.advisorName?.trim() || '',
      phone: rawQuote?.producer?.phone?.trim() || '',
      email: rawQuote?.producer?.email?.trim() || '',
      registration: rawQuote?.producer?.registration?.trim() || '',
      logoText: rawQuote?.producer?.logoText?.trim() || ''
    },
    client: {
      fullName: rawQuote?.client?.fullName?.trim() || '',
      document: rawQuote?.client?.document?.trim() || '',
      phone: rawQuote?.client?.phone?.trim() || '',
      email: rawQuote?.client?.email?.trim() || ''
    },
    insurance: {
      type: rawQuote?.insurance?.type?.trim() || '',
      company: rawQuote?.insurance?.company?.trim() || '',
      plan: rawQuote?.insurance?.plan?.trim() || '',
      insuredObject: rawQuote?.insurance?.insuredObject?.trim() || '',
      validFrom: rawQuote?.insurance?.validFrom || '',
      validUntil: rawQuote?.insurance?.validUntil || '',
      paymentMethod: rawQuote?.insurance?.paymentMethod?.trim() || '',
      insuredAmount: rawQuote?.insurance?.insuredAmount?.trim() || '',
      deductible: rawQuote?.insurance?.deductible?.trim() || '',
      monthlyPremium:
        rawQuote?.insurance?.monthlyPremium?.trim() || rawQuote?.insurance?.installmentValue?.trim() || '',
      annualPremium: rawQuote?.insurance?.annualPremium?.trim() || rawQuote?.insurance?.totalPremium?.trim() || ''
    },
    coverages: Array.isArray(rawQuote?.coverages) && rawQuote.coverages.length
      ? rawQuote.coverages.map((item) => ({
          id: item.id || cryptoSafeId(),
          coverage: item.coverage?.trim() || '',
          detail: item.detail?.trim() || ''
        }))
      : [DEFAULT_COVERAGE()],
    notes: rawQuote?.notes?.trim() || DEFAULT_CONDITIONS
  };
}

export function createProducerProfile(rawProducer = {}) {
  return {
    advisorName: rawProducer.advisorName?.trim() || '',
    phone: rawProducer.phone?.trim() || '',
    email: rawProducer.email?.trim() || '',
    registration: rawProducer.registration?.trim() || '',
    logoText: rawProducer.logoText?.trim() || ''
  };
}

export function getProducerInitials(producer = {}) {
  const base = producer.logoText || producer.advisorName || 'PS';
  return base
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'PS';
}

export function splitNotesLines(notes) {
  return String(notes || '')
    .split('\n')
    .map((line) => line.replace(/^\s*[•\-*]?\s*/, '').trim())
    .filter(Boolean);
}

export function duplicateQuoteData(quote, sequence = 1, now = new Date()) {
  const cloned = structuredClone(quote);
  cloned.id = cryptoSafeId();
  cloned.createdAt = now.toISOString();
  cloned.updatedAt = now.toISOString();
  cloned.quoteDate = formatDateInput(now);
  cloned.quoteNumber = createQuoteNumber(sequence, now);
  return cloned;
}

export function quoteMatchesSearch(quote, term) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    quote.quoteNumber,
    quote.client.fullName,
    quote.client.document,
    quote.insurance.type,
    quote.insurance.company
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(normalized);
}
