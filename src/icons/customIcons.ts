import * as featherIcons from "feather-icons";
import * as remixicons from "react-icons/ri/";
//import * as boxicons from "react-icons/bi/";
import { renderToString } from "react-dom/server";
import { addIcon } from "obsidian";

export interface Icon {
  id: string;
  name: string;
}

const icons: Record<string, string> = {
  cMenuToolbar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M19 10H5c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2zM5 20v-8h14l.002 8H5zM5 6h14v2H5zm2-4h10v2H7z" fill="currentColor"/></svg>`,
  cMenuToolbarSub:`<svg t="1661526346488" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="16880"  ><path d="M597.333333 85.333333h-341.333333C187.733333 85.333333 128 140.8 128 213.333333v597.333334c0 72.533333 59.733333 128 128 128h426.666667c72.533333 0 128-55.466667 128-128V298.666667l-213.333334-213.333334z m170.666667 725.333334c0 46.933333-38.4 85.333333-85.333333 85.333333H256c-46.933333 0-85.333333-38.4-85.333333-85.333333V213.333333c0-46.933333 38.4-85.333333 85.333333-85.333333h298.666667v213.333333h213.333333v469.333334z m-320-234.666667h128c12.8 0 21.333333 8.533333 21.333333 21.333333s-8.533333 21.333333-21.333333 21.333334h-128v128c0 12.8-8.533333 21.333333-21.333333 21.333333s-21.333333-8.533333-21.333334-21.333333v-128h-128c-12.8 0-21.333333-8.533333-21.333333-21.333334s8.533333-21.333333 21.333333-21.333333h128v-128c0-12.8 8.533333-21.333333 21.333334-21.333333s21.333333 8.533333 21.333333 21.333333v128z" fill="#8a8a8a" p-id="16881"></path></svg>`,
  cMenuToolbarAdd: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="white" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4z" fill="white"/><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10s10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8s8 3.589 8 8s-3.589 8-8 8z" fill="white"/></svg>`,
  cMenuToolbarDelete: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="white" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8h2V6h-4V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H3v2h2zM9 4h6v2H9zM8 8h9v12H7V8z" fill="white"/><path d="M9 10h2v8H9zm4 0h2v8h-2z" fill="white"/></svg>`,
  cMenuToolbarReload: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="white" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M19 10H5c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2zM5 20v-8h14l.002 8H5zM5 6h14v2H5zm2-4h10v2H7z" fill="white"/></svg>`,
  "codeblock-glyph": `<svg xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path fill="currentColor" d="M20 3H4c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zM4 19V7h16l.002 12H4z" fill="currentColor"/><path d="M9.293 9.293L5.586 13l3.707 3.707l1.414-1.414L8.414 13l2.293-2.293zm5.414 0l-1.414 1.414L15.586 13l-2.293 2.293l1.414 1.414L18.414 13z"/></svg>`,
  "underline-glyph": `<svg xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 1024 1024"><path fill="currentColor" d="M824 804H200c-4.4 0-8 3.4-8 7.6v60.8c0 4.2 3.6 7.6 8 7.6h624c4.4 0 8-3.4 8-7.6v-60.8c0-4.2-3.6-7.6-8-7.6zm-312-76c69.4 0 134.6-27.1 183.8-76.2C745 602.7 772 537.4 772 468V156c0-6.6-5.4-12-12-12h-60c-6.6 0-12 5.4-12 12v312c0 97-79 176-176 176s-176-79-176-176V156c0-6.6-5.4-12-12-12h-60c-6.6 0-12 5.4-12 12v312c0 69.4 27.1 134.6 76.2 183.8C377.3 701 442.6 728 512 728z"/></svg>`,
  "superscript-glyph": `<svg xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path fill="currentColor"d="M16 7.41L11.41 12L16 16.59L14.59 18L10 13.41L5.41 18L4 16.59L8.59 12L4 7.41L5.41 6L10 10.59L14.59 6L16 7.41M21.85 9h-4.88V8l.89-.82c.76-.64 1.32-1.18 1.7-1.63c.37-.44.56-.85.57-1.23a.884.884 0 0 0-.27-.7c-.18-.19-.47-.28-.86-.29c-.31.01-.58.07-.84.17l-.66.39l-.45-1.17c.27-.22.59-.39.98-.53S18.85 2 19.32 2c.78 0 1.38.2 1.78.61c.4.39.62.93.62 1.57c-.01.56-.19 1.08-.54 1.55c-.34.48-.76.93-1.27 1.36l-.64.52v.02h2.58V9z"/></svg>`,
  "subscript-glyph": `<svg xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path fill="currentColor" d="M16 7.41L11.41 12L16 16.59L14.59 18L10 13.41L5.41 18L4 16.59L8.59 12L4 7.41L5.41 6L10 10.59L14.59 6L16 7.41m5.85 13.62h-4.88v-1l.89-.8c.76-.65 1.32-1.19 1.7-1.63c.37-.44.56-.85.57-1.24a.898.898 0 0 0-.27-.7c-.18-.16-.47-.28-.86-.28c-.31 0-.58.06-.84.18l-.66.38l-.45-1.17c.27-.21.59-.39.98-.53s.82-.24 1.29-.24c.78.04 1.38.25 1.78.66c.4.41.62.93.62 1.57c-.01.56-.19 1.08-.54 1.55c-.34.47-.76.92-1.27 1.36l-.64.52v.02h2.58v1.35z"/></svg>`,
  "bot-glyph": `<svg xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path fill="currentColor" d="M21.928 11.607c-.202-.488-.635-.605-.928-.633V8c0-1.103-.897-2-2-2h-6V4.61c.305-.274.5-.668.5-1.11a1.5 1.5 0 0 0-3 0c0 .442.195.836.5 1.11V6H5c-1.103 0-2 .897-2 2v2.997l-.082.006A1 1 0 0 0 1.99 12v2a1 1 0 0 0 1 1H3v5c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-5a1 1 0 0 0 1-1v-1.938a1.006 1.006 0 0 0-.072-.455zM5 20V8h14l.001 3.996L19 12v2l.001.005l.001 5.995H5z" fill="currentColor"/><ellipse cx="8.5" cy="12" rx="1.5" ry="2" fill="currentColor"/><ellipse cx="15.5" cy="12" rx="1.5" ry="2" fill="currentColor"/><path d="M8 16h8v2H8z" fill="currentColor"/></svg>`,
  "header-1":`<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill="currentColor"  d="M835.626667 349.397333A42.666667 42.666667 0 0 1 853.333333 384v426.666667a42.666667 42.666667 0 0 1-85.333333 0v-367.488l-71.850667 23.978666a42.666667 42.666667 0 0 1-26.965333-80.981333l128-42.666667a42.666667 42.666667 0 0 1 38.4 5.888zM128 170.666667a42.666667 42.666667 0 0 1 42.666667 42.666666v256h256V213.333333a42.666667 42.666667 0 1 1 85.333333 0v597.333334a42.666667 42.666667 0 1 1-85.333333 0v-256H170.666667v256a42.666667 42.666667 0 1 1-85.333334 0V213.333333a42.666667 42.666667 0 0 1 42.666667-42.666666z" p-id="1635"></path></svg>`,
  "header-2":`<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M768 426.666667a85.333333 85.333333 0 0 0-85.333333 85.333333v21.333333a42.666667 42.666667 0 1 1-85.333334 0V512a170.666667 170.666667 0 0 1 170.666667-170.666667h7.338667a163.328 163.328 0 0 1 115.498666 278.869334L742.997333 768H896a42.666667 42.666667 0 1 1 0 85.333333h-256a42.666667 42.666667 0 0 1-30.165333-72.832l220.672-220.672A77.994667 77.994667 0 0 0 775.338667 426.666667H768zM128 170.666667a42.666667 42.666667 0 0 1 42.666667 42.666666v256h256V213.333333a42.666667 42.666667 0 1 1 85.333333 0v597.333334a42.666667 42.666667 0 1 1-85.333333 0v-256H170.666667v256a42.666667 42.666667 0 1 1-85.333334 0V213.333333a42.666667 42.666667 0 0 1 42.666667-42.666666z" p-id="1791"></path></svg>`,
  "header-3":`<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M597.333333 384a42.666667 42.666667 0 0 1 42.666667-42.666667h256a42.666667 42.666667 0 0 1 30.165333 72.832l-105.941333 105.984A170.752 170.752 0 0 1 768 853.333333a170.666667 170.666667 0 0 1-160.938667-113.877333 42.666667 42.666667 0 0 1 80.469334-28.373333A85.333333 85.333333 0 1 0 768 597.333333h-42.666667a42.666667 42.666667 0 0 1-30.165333-72.832L793.002667 426.666667H640a42.666667 42.666667 0 0 1-42.666667-42.666667zM128 170.666667a42.666667 42.666667 0 0 1 42.666667 42.666666v256h256V213.333333a42.666667 42.666667 0 1 1 85.333333 0v597.333334a42.666667 42.666667 0 1 1-85.333333 0v-256H170.666667v256a42.666667 42.666667 0 1 1-85.333334 0V213.333333a42.666667 42.666667 0 0 1 42.666667-42.666666z" p-id="1949"></path></svg>`,
  "header-4":`<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M780.714667 343.296a42.666667 42.666667 0 0 1 28.032 53.418667L719.36 682.666667H896a42.666667 42.666667 0 1 1 0 85.333333h-234.666667a42.666667 42.666667 0 0 1-40.704-55.381333l106.666667-341.333334a42.666667 42.666667 0 0 1 53.418667-27.989333z" p-id="2107"></path><path d="M853.333333 554.666667a42.666667 42.666667 0 0 1 42.666667 42.666666v213.333334a42.666667 42.666667 0 1 1-85.333333 0v-213.333334a42.666667 42.666667 0 0 1 42.666666-42.666666zM128 170.666667a42.666667 42.666667 0 0 1 42.666667 42.666666v256h256V213.333333a42.666667 42.666667 0 1 1 85.333333 0v597.333334a42.666667 42.666667 0 1 1-85.333333 0v-256H170.666667v256a42.666667 42.666667 0 1 1-85.333334 0V213.333333a42.666667 42.666667 0 0 1 42.666667-42.666666z" p-id="2108"></path></svg>`,
  "header-5":`
  <svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M683.946667 373.674667A42.666667 42.666667 0 0 1 725.333333 341.333333h170.666667a42.666667 42.666667 0 1 1 0 85.333334h-137.301333l-22.016 88.234666A170.666667 170.666667 0 1 1 640 795.562667a42.666667 42.666667 0 1 1 64-56.448 85.333333 85.333333 0 1 0 0-112.896 42.666667 42.666667 0 0 1-73.386667-38.528l53.333334-214.016zM128 170.666667a42.666667 42.666667 0 0 1 42.666667 42.666666v256h256V213.333333a42.666667 42.666667 0 1 1 85.333333 0v597.333334a42.666667 42.666667 0 1 1-85.333333 0v-256H170.666667v256a42.666667 42.666667 0 1 1-85.333334 0V213.333333a42.666667 42.666667 0 0 1 42.666667-42.666666z" p-id="2264"></path></svg>`,
  "header-6":`<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M831.274667 303.957333a42.666667 42.666667 0 0 1 16.725333 57.984l-83.498667 151.466667a170.453333 170.453333 0 0 1 88.746667 22.741333 169.557333 169.557333 0 0 1 62.506667 232.277334 171.093333 171.093333 0 0 1-232.96 62.165333 169.557333 169.557333 0 0 1-62.805334-231.850667l153.301334-278.016a42.666667 42.666667 0 0 1 57.984-16.768z m-20.48 306.176a85.76 85.76 0 0 0-116.736 31.018667 84.224 84.224 0 0 0 31.189333 115.456 85.76 85.76 0 0 0 116.736-31.018667 84.224 84.224 0 0 0-31.232-115.456zM128 170.666667a42.666667 42.666667 0 0 1 42.666667 42.666666v256h256V213.333333a42.666667 42.666667 0 1 1 85.333333 0v597.333334a42.666667 42.666667 0 1 1-85.333333 0v-256H170.666667v256a42.666667 42.666667 0 1 1-85.333334 0V213.333333a42.666667 42.666667 0 0 1 42.666667-42.666666z" p-id="2422"></path></svg>`,
  "header-n":`<svg  viewBox="0 0 24 24" ><path d="M2 3a1 1 0 0 0-1 1v16a1 1 0 1 0 2 0v-7h9v7a1 1 0 1 0 2 0V4a1 1 0 1 0-2 0v7H3V4a1 1 0 0 0-1-1Zm14 9a1 1 0 0 1 1.984-.177 4.099 4.099 0 0 1 1.757-.576 3.447 3.447 0 0 1 3.759 3.432V20a1 1 0 1 1-2 0v-5.32c0-.851-.73-1.519-1.578-1.442A2.114 2.114 0 0 0 18 15.344V20a1 1 0 1 1-2 0v-8Z" fill="currentColor"></path></svg>`,
};

export default function addIcons() {
  Object.keys(icons).forEach((key) => {
    addIcon(key, icons[key]);
  });
}

export function addFeatherIcons(appIcons: string[]) {
  Object.values(featherIcons.icons).forEach((icon) => {
    const svg = icon.toSvg({
      viewBox: "0 0 24 24",
      width: "100",
      height: "100",
      "stroke-width": "2",
    });
    addIcon("feather-" + icon.name, svg);
    appIcons.push("feather-" + icon.name);
  });
}

export function addRemixIcons(appIcons: string[]) {
  const iconKeys: Icon[] = [];
  for (const icon in remixicons) {
    iconKeys.push({
      id: icon,
      name: icon.substring(2),
    });
    const svg = renderToString(
      // @ts-ignore
      remixicons[icon]({
        size: "100",
      })
    );
    addIcon("remix-" + icon.substring(2), svg);
    appIcons.push("remix-" + icon.substring(2));
  }
}

/* export function addBoxIcons(appIcons: string[]) {
  const iconKeys: Icon[] = [];
  for (const icon in boxicons) {
    iconKeys.push({
      id: icon,
      name: icon.substring(2),
    });
    const svg = renderToString(
      // @ts-ignore
      boxicons[icon]({
        size: "100",
      })
    );
    addIcon("bx-" + icon.substring(2), svg);
    appIcons.push("bx-" + icon.substring(2));
  }
}
 */
