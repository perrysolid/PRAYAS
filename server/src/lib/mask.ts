/** 9876543210 → ******3210 */
export const maskMobile = (mobile: string) => `******${mobile.slice(-4)}`;

/** Kamla Devi → K**** D*** */
export const maskName = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => (part ? part[0] + "*".repeat(Math.max(part.length - 1, 1)) : part))
    .join(" ");
