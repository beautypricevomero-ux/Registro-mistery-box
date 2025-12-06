export type LabelLayoutType =
  | 'TYPE1_BEAUTYPRICE'
  | 'TYPE2_SPEDISCI_ONLINE'
  | 'TYPE3_GLS_BRIANZA'
  | 'UNKNOWN';

export type ParsedFields = {
  name?: string;
  address?: string;
  cap?: string;
  city?: string;
  province?: string;
  phone?: string;
  tracking?: string;
  layoutType?: LabelLayoutType;
};

const normalizeText = (text: string) => text.toLowerCase();
const normalizeSpaces = (text: string) => text.replace(/\s+/g, ' ').trim();
const addressPrefixes = ['via ', 'viale ', 'piazza ', 'corso ', 'p.zza ', 'vico ', 'vicolo ', 'contrada ', 'strada '];

function isAddressLine(line: string) {
  const l = normalizeText(line);
  return addressPrefixes.some((p) => l.startsWith(p));
}

function findCap(text: string) {
  const match = text.match(/\b\d{5}\b/);
  return match ? match[0] : undefined;
}

function findPhone(text: string) {
  const match = text.match(/\b(?:\+39)?\s?\d{8,12}\b/);
  return match ? match[0] : undefined;
}

function isSimilarWord(word: string, target: string) {
  const clean = normalizeText(word).replace(/[^a-z]/g, '');
  const tgt = normalizeText(target).replace(/[^a-z]/g, '');
  if (clean.includes(tgt) || tgt.includes(clean)) return true;
  // very small edit-distance heuristic
  if (Math.abs(clean.length - tgt.length) > 2) return false;
  let mismatches = 0;
  for (let i = 0; i < Math.min(clean.length, tgt.length); i++) {
    if (clean[i] !== tgt[i]) mismatches++;
    if (mismatches > 2) return false;
  }
  return true;
}

export function detectLabelLayout(ocrText: string): LabelLayoutType {
  const lower = normalizeText(ocrText);
  if (lower.includes('beautyprice') || (/mc\./i.test(ocrText) && /kg\./i.test(ocrText))) {
    return 'TYPE1_BEAUTYPRICE';
  }
  if (lower.includes('spedisci') || lower.includes('spedisci.online') || (lower.includes('destinat') && lower.includes('cliente'))) {
    return 'TYPE2_SPEDISCI_ONLINE';
  }
  if (lower.includes('brianza') || lower.includes('gls') || lower.includes('gls-italy.com')) {
    return 'TYPE3_GLS_BRIANZA';
  }
  return 'UNKNOWN';
}

export function parseLabelFields(ocrText: string): ParsedFields {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const lowerLines = lines.map((l) => normalizeText(l));
  const layoutType = detectLabelLayout(ocrText);
  const parsed: ParsedFields = { layoutType };

  if (layoutType === 'TYPE1_BEAUTYPRICE') {
    const idx = lowerLines.findIndex((l) => l.includes('beautyprice'));
    if (idx >= 0) {
      parsed.name = lines[idx + 1] || parsed.name;
      const addressLine = lines.slice(idx + 1).find((line) => isAddressLine(line));
      if (addressLine) {
        parsed.address = addressLine;
        const addrIdx = lines.indexOf(addressLine);
        const cityCandidate = lines[addrIdx + 1];
        if (cityCandidate && /[A-Z]{2}$/.test(cityCandidate)) {
          const tokens = cityCandidate.split(/\s+/);
          const province = tokens[tokens.length - 1];
          parsed.province = province;
          parsed.city = normalizeSpaces(tokens.slice(0, -1).join(' ')) || parsed.city;
        }
      }
    }
    const flatText = ocrText.replace(/\n/g, ' ');
    const rifMatch = flatText.match(/ri[fF][\.\:\s]*([0-9\s]{8,})/i);
    if (rifMatch && rifMatch[1]) {
      const onlyDigits = rifMatch[1].replace(/\D/g, '');
      if (onlyDigits.length >= 6) {
        parsed.tracking = onlyDigits;
      }
    }
    parsed.cap = parsed.cap || findCap(ocrText);
    parsed.phone = parsed.phone || findPhone(ocrText);
    return parsed;
  }

  if (layoutType === 'TYPE2_SPEDISCI_ONLINE') {
    let destIndex = lowerLines.findIndex((l) => isSimilarWord(l, 'destinatario'));
    if (destIndex === -1) {
      destIndex = lowerLines.findIndex((l) => l.includes('destinat'));
    }
    if (destIndex >= 0) {
      parsed.name = lines[destIndex + 1] || parsed.name;
      parsed.address = lines[destIndex + 2] || parsed.address;
      const capCityLine = lines[destIndex + 3];
      if (capCityLine) {
        const capMatch = capCityLine.match(/\b\d{5}\b/);
        if (capMatch) parsed.cap = capMatch[0];
        const provinceMatch = capCityLine.match(/\(([A-Z]{2})\)/);
        if (provinceMatch) parsed.province = provinceMatch[1];
        if (capMatch) {
          const afterCap = capCityLine.slice(capMatch.index! + capMatch[0].length);
          const cityPart = afterCap.split('(')[0].replace(/^[,\s]+/, '');
          if (cityPart) parsed.city = normalizeSpaces(cityPart);
        }
      }
    }
    const telLine = lines.find((l) => /tel/i.test(l));
    if (telLine) {
      const phoneMatch = telLine.match(/\b(?:\+39)?\s?\d{8,12}\b/);
      if (phoneMatch) parsed.phone = phoneMatch[0];
    }
    const trackingCandidate = lines.find(
      (l) => l.length >= 8 && l.length <= 25 && /[A-Z0-9]/.test(l) && !isAddressLine(l) && !/destinat/i.test(l)
    );
    if (trackingCandidate) {
      parsed.tracking = trackingCandidate;
    }
    if (!parsed.tracking) {
      const codeMatch = ocrText.match(/\b[A-Z0-9]{8,}\b/);
      if (codeMatch) {
        parsed.tracking = codeMatch[0];
      }
    }
    parsed.cap = parsed.cap || findCap(ocrText);
    parsed.phone = parsed.phone || findPhone(ocrText);
    return parsed;
  }

  if (layoutType === 'TYPE3_GLS_BRIANZA') {
    const idx = lowerLines.findIndex((l) => l.includes('brianza') || l.includes('gls'));
    if (idx >= 0) {
      parsed.name = lines[idx + 1] || parsed.name;
      parsed.address = lines[idx + 2] || parsed.address;
      parsed.city = lines[idx + 3] || parsed.city;
      const provinceCandidate = lines[idx + 4];
      if (provinceCandidate && /^[A-Z]{2}$/.test(provinceCandidate)) {
        parsed.province = provinceCandidate;
      }
    }
    const trackingLine = lines
      .slice(-4)
      .find((l) => /^\s*[A-Z]{2}\s?\d{3,}/.test(l) || /gls/i.test(l));
    if (trackingLine) parsed.tracking = trackingLine.trim();
    if (!parsed.tracking) {
      const codeMatch = ocrText.match(/\b[A-Z0-9]{8,}\b/);
      if (codeMatch) {
        parsed.tracking = codeMatch[0];
      }
    }
    parsed.cap = parsed.cap || findCap(ocrText);
    parsed.phone = parsed.phone || findPhone(ocrText);
    return parsed;
  }

  // UNKNOWN fallback
  const keyLineIndex = lowerLines.findIndex((l) => l.includes('destinatario') || l.includes('cliente') || l.includes('to'));
  if (keyLineIndex >= 0 && lines[keyLineIndex + 1]) {
    parsed.name = lines[keyLineIndex + 1];
  } else {
    parsed.name = lines.find((l) => {
      const lower = normalizeText(l);
      const words = lower.split(/\s+/);
      return words.length >= 2 && !isAddressLine(l) && lower !== lower.toUpperCase();
    });
  }
  parsed.address = lines.find((l) => isAddressLine(l)) || parsed.address;
  const capMatch = ocrText.match(/\b\d{5}\b/);
  if (capMatch) {
    parsed.cap = capMatch[0];
    const lineWithCap = lines.find((l) => l.includes(capMatch[0]));
    if (lineWithCap) {
      const afterCap = lineWithCap.slice(lineWithCap.indexOf(capMatch[0]) + capMatch[0].length);
      const cityPart = afterCap.split('(')[0].replace(/^[,\s]+/, '');
      if (cityPart) parsed.city = normalizeSpaces(cityPart);
      const provinceMatch = lineWithCap.match(/\(([A-Z]{2})\)/) || lineWithCap.match(/\b([A-Z]{2})\b/);
      if (provinceMatch) parsed.province = provinceMatch[1];
    }
  }
  parsed.phone = parsed.phone || findPhone(ocrText);
  const trackingFallback = lines.find(
    (l) => l.length >= 8 && l.length <= 25 && /[A-Z0-9]/.test(l) && !isAddressLine(l) && !/destinat/i.test(l)
  );
  if (trackingFallback) parsed.tracking = trackingFallback;
  parsed.layoutType = 'UNKNOWN';
  return parsed;
}
