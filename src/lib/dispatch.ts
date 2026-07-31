/** Build WhatsApp / SMS deep links for crisis caregiver dispatch. */

export type CareContact = {
  whatsappCountry: string;
  whatsappNumber: string;
  emergencyContact: string;
};

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** E.164-ish digits for wa.me (country code + number, no +). */
export function resolveWhatsAppDigits(contact: CareContact): string | null {
  const fromWhatsApp = `${digitsOnly(contact.whatsappCountry)}${digitsOnly(contact.whatsappNumber)}`;
  if (fromWhatsApp.length >= 8) return fromWhatsApp;
  const emergency = digitsOnly(contact.emergencyContact);
  if (emergency.length >= 8) return emergency;
  return null;
}

export function resolveSmsNumber(contact: CareContact): string | null {
  const emergency = contact.emergencyContact.trim();
  if (emergency) return emergency.replace(/[^\d+]/g, "");
  const wa = resolveWhatsAppDigits(contact);
  return wa ? `+${wa}` : null;
}

export function buildCrisisMessage(flags: string[]): string {
  const flagText =
    flags.length > 0
      ? ` Red flags noted: ${flags.join(", ")}.`
      : " They opened Crisis Flare Mode and asked me to reach you.";
  return `Nora crisis alert: your contact needs support right now.${flagText} Please check in when you can.`;
}

export function buildWhatsAppUrl(contact: CareContact, message: string): string | null {
  const digits = resolveWhatsAppDigits(contact);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildSmsUrl(contact: CareContact, message: string): string | null {
  const number = resolveSmsNumber(contact);
  if (!number) return null;
  // iOS uses &body=, Android commonly accepts ?body=
  return `sms:${number}?body=${encodeURIComponent(message)}`;
}

export function openExternal(url: string): void {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}
