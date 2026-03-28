import { moment } from "obsidian";

export function getCurrentLocale(): string {
  return moment.locale();
}

export function isChineseLocale(locale: string = getCurrentLocale()): boolean {
  const normalizedLocale = locale.toLowerCase();
  return normalizedLocale === "zh" || normalizedLocale.startsWith("zh-");
}

export function shouldShowAIFeatures(locale: string = getCurrentLocale()): boolean {
  return isChineseLocale(locale);
}
