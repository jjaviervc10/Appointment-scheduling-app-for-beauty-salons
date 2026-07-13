export function buildWhatsAppLink(phone: string, message?: string): string {
  const phoneDigits = phone.replace(/\D/g, '');
  const trimmedMessage = message?.trim();

  if (!phoneDigits) {
    throw new Error('A WhatsApp phone number is required.');
  }

  return trimmedMessage
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(trimmedMessage)}`
    : `https://wa.me/${phoneDigits}`;
}
