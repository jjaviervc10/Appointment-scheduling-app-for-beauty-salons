export function getMexicanPhoneLocalDigits(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '');

  if (digits.length >= 13 && digits.startsWith('521')) {
    return digits.slice(3, 13);
  }

  if (digits.length >= 12 && digits.startsWith('52')) {
    return digits.slice(2, 12);
  }

  return digits.slice(0, 10);
}

export function isValidMexicanPhoneInput(rawValue: string): boolean {
  return getMexicanPhoneLocalDigits(rawValue).length === 10;
}

export function toMexicanPhoneForAuthApi(rawValue: string): string {
  const localDigits = getMexicanPhoneLocalDigits(rawValue);

  if (localDigits.length === 10) {
    return `+52${localDigits}`;
  }

  return rawValue.trim().replace(/\s+/g, '');
}

export function formatMexicanPhoneForDisplay(rawValue: string): string {
  const localDigits = getMexicanPhoneLocalDigits(rawValue);

  if (localDigits.length !== 10) {
    return rawValue;
  }

  return `+52 ${localDigits.slice(0, 3)} ${localDigits.slice(3, 6)} ${localDigits.slice(6)}`;
}
