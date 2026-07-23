export enum BankName {
  BANK_BCA = "BANK_BCA",
  BANK_BRI = "BANK_BRI",
  BANK_MANDIRI = "BANK_MANDIRI",
  BANK_BNI = "BANK_BNI",
}

export const BANK_OPTIONS = [
  { value: BankName.BANK_BCA, label: "Bank BCA" },
  { value: BankName.BANK_BRI, label: "Bank BRI" },
  { value: BankName.BANK_MANDIRI, label: "Bank Mandiri" },
  { value: BankName.BANK_BNI, label: "Bank BNI" },
] as const;

export const BANK_LABEL_MAP: Record<string, string> = {
  BANK_BCA: "Bank BCA",
  BANK_BRI: "Bank BRI",
  BANK_MANDIRI: "Bank Mandiri",
  BANK_BNI: "Bank BNI",
  // Backward compatibility
  BCA: "Bank BCA",
  BRI: "Bank BRI",
  MANDIRI: "Bank Mandiri",
  BNI: "Bank BNI",
};

export function formatBankLabel(bankName?: string | null): string {
  if (!bankName) return "-";
  return BANK_LABEL_MAP[bankName] || bankName;
}

export function parseBankEnum(input?: string | null): BankName | null {
  if (!input) return null;
  const clean = input.toString().trim().toUpperCase();
  if (clean === "BCA" || clean === "BANK_BCA" || clean === "BANK BCA") {
    return BankName.BANK_BCA;
  }
  if (clean === "BRI" || clean === "BANK_BRI" || clean === "BANK BRI") {
    return BankName.BANK_BRI;
  }
  if (clean === "MANDIRI" || clean === "BANK_MANDIRI" || clean === "BANK MANDIRI") {
    return BankName.BANK_MANDIRI;
  }
  if (clean === "BNI" || clean === "BANK_BNI" || clean === "BANK BNI") {
    return BankName.BANK_BNI;
  }
  return null;
}
