export const defaultLocale = "vi"
export const locales = ["vi", "en"] as const
export type Locale = (typeof locales)[number]

export const localeNames: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
}
