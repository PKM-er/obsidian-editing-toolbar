import { getCurrentLocale, isChineseLocale } from "src/util/locale";

const PKMER_CHINESE_AI_PAGE = "https://pkmer.cn/products/UserProfile/";
const PKMER_CHINESE_QUOTA_PAGE = `${PKMER_CHINESE_AI_PAGE}#tab-ai-token`;
const PKMER_ENGLISH_LOGIN_BASE = "https://pkmer.net/en/signin/";
const PKMER_ENGLISH_WEBSITE = "https://pkmer.net";
const PKMER_ENGLISH_AI_PAGE = "https://pkmer.net/en/products/ai-token";
const PKMER_OAUTH_APP_NAME = "Editing Toolbar";

export function getPKMerAuthorizationEntryUrl(authorizationUrl: string, locale: string = getCurrentLocale()): string {
  if (isChineseLocale(locale)) {
    return authorizationUrl;
  }

  const loginUrl = new URL(PKMER_ENGLISH_LOGIN_BASE);
  loginUrl.searchParams.set("redirect", authorizationUrl);
  loginUrl.searchParams.set("app_name", PKMER_OAUTH_APP_NAME);
  loginUrl.searchParams.set("website", PKMER_ENGLISH_WEBSITE);
  return loginUrl.toString();
}

export function getPKMerAIEntryUrl(locale: string = getCurrentLocale()): string {
  return isChineseLocale(locale) ? PKMER_CHINESE_AI_PAGE : PKMER_ENGLISH_AI_PAGE;
}

export function getPKMerAIQuotaUrl(locale: string = getCurrentLocale()): string {
  return isChineseLocale(locale) ? PKMER_CHINESE_QUOTA_PAGE : PKMER_ENGLISH_AI_PAGE;
}
