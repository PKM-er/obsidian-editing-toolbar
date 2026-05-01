import { moment } from "obsidian";

export function getCurrentLocale(): string {
  return moment.locale();
}

export function isChineseLocale(locale: string = getCurrentLocale()): boolean {
  const normalizedLocale = locale.toLowerCase();
  return normalizedLocale === "zh" || normalizedLocale.startsWith("zh-");
}

export function shouldShowAIFeatures(_locale: string = getCurrentLocale()): boolean {
  return true;
}
