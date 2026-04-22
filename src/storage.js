import {
  APP_STORAGE_KEYS,
  createProducerProfile,
  duplicateQuoteData,
  normalizeQuote
} from './data.js';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadProducerProfile() {
  return createProducerProfile(readJson(APP_STORAGE_KEYS.producerProfile, {}));
}

export function saveProducerProfile(producer) {
  const normalized = createProducerProfile(producer);
  writeJson(APP_STORAGE_KEYS.producerProfile, normalized);
  return normalized;
}

export function loadQuotes() {
  const rawQuotes = readJson(APP_STORAGE_KEYS.quotes, []);
  if (!Array.isArray(rawQuotes)) return [];
  return rawQuotes.map(normalizeQuote).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function saveQuotes(quotes) {
  const normalized = quotes.map(normalizeQuote);
  writeJson(APP_STORAGE_KEYS.quotes, normalized);
  return normalized;
}

export function getNextSequence() {
  const meta = readJson(APP_STORAGE_KEYS.meta, { lastSequence: 0 });
  return (meta.lastSequence || 0) + 1;
}

export function reserveSequence(sequence) {
  writeJson(APP_STORAGE_KEYS.meta, { lastSequence: sequence });
}

export function upsertQuote(quote) {
  const quotes = loadQuotes();
  const normalized = normalizeQuote(quote);
  const index = quotes.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    quotes[index] = normalized;
  } else {
    quotes.unshift(normalized);
  }
  return saveQuotes(quotes);
}

export function createDuplicateQuote(quote) {
  const sequence = getNextSequence();
  reserveSequence(sequence);
  return duplicateQuoteData(quote, sequence);
}
