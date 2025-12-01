// Code from https://github.com/valentine195/obsidian-admonition/blob/master/src/lang/helpers.ts

import { moment } from 'obsidian';

import ar from './locale/ar';
import cz from './locale/cz';
import da from './locale/da';
import de from './locale/de';
import en from './locale/en';
import enGB from './locale/en-gb';
const localeMap: { [k: string]: Partial<typeof en> } = {
  ar,
  cs: cz,
  da,
  de,
  en,
  'en-gb': enGB,
  es,
  fr,
  hi,
  id,
  it,
  ja,
  ko,
  nl,
  nn: no,
  pl,
  pt,
  'pt-br': ptBR,
  ro,
  ru,
  tr,
  'zh-cn': zhCN,
  'zh-tw': zhTW,
};

const locale = localeMap[moment.locale()];

export function t(str: keyof typeof en): string {
  return (locale && locale[str]) || en[str];
}
