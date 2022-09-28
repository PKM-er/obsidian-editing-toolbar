import { App,MarkdownView,requireApiVersion } from "obsidian";
let activeDocument: Document;
export function workplacefullscreenMode(app: App)
{
    requireApiVersion("0.15.0")?activeDocument=activeWindow.document:activeDocument=window.document;
 let rightleaf= activeDocument.body?.querySelector(" .mod-right-split.is-collapsed");      
 let leftleaf= activeDocument.body?.querySelector(" .mod-left-split.is-collapsed");    
 if(rightleaf&&!leftleaf)   //@ts-ignore 
 app.commands.executeCommandById("app:toggle-left-sidebar");  
 if(!rightleaf&&leftleaf)   //@ts-ignore 
 app.commands.executeCommandById("app:toggle-right-sidebar");  
 if(!rightleaf&&!leftleaf||rightleaf&&leftleaf) {

 //@ts-ignore
  app.commands.executeCommandById("app:toggle-left-sidebar");
   //@ts-ignore
 app.commands.executeCommandById("app:toggle-right-sidebar")}


}


//full screen mode
export function fullscreenMode(app: App) {
  const leaf = app.workspace.getActiveViewOfType(MarkdownView)
        if (!leaf)
            return;
        let el = leaf.containerEl ;
        let modroot= document.body?.querySelector(".mod-vertical.mod-root") as HTMLElement
        let fullscreenMutationObserver: MutationObserver;
        fullscreenMutationObserver = new MutationObserver(function (mutationRecords) {
          mutationRecords.forEach(function (mutationRecord) {
              mutationRecord.addedNodes.forEach(function (node) {
                if(isFull(modroot)){
              try{
                
                  document.body.removeChild(node);
                  el.appendChild(node);
              }catch (error) 
              {
                console.log(error.message)
              }

                }else
                {
                 return;
                }
              });
          });
     
      });
      el.addEventListener("fullscreenchange", function (event: any) {
        if (!isFull(modroot)) {
            fullscreenMutationObserver.disconnect();
        }    
    });
     if(isFull(modroot))
     {
      fullscreenMutationObserver.disconnect();
 
     exitFull()
 
     }else
     {
    
    beFull(modroot)
  fullscreenMutationObserver.observe(document.body, { childList: true });

 }
}

Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFull = exports.isFull = exports.exitFull = exports.beFull = void 0;
let DOC_EL = document.documentElement;
let headEl = DOC_EL.querySelector('head');
let styleEl = document.createElement('style');
let TYPE_REQUEST_FULL_SCREEN = 'requestFullscreen';
let TYPE_EXIT_FULL_SCREEN = 'exitFullscreen';
let TYPE_FULL_SCREEN_ELEMENT = 'fullscreenElement';
let TYPE_ON_FULL_SCREEN_CHANGE = 'onfullscreenchange';
if ("webkitRequestFullScreen" in DOC_EL) {
    TYPE_REQUEST_FULL_SCREEN = 'webkitRequestFullScreen';
    TYPE_EXIT_FULL_SCREEN = 'webkitExitFullscreen';
    TYPE_FULL_SCREEN_ELEMENT = 'webkitFullscreenElement';
    TYPE_ON_FULL_SCREEN_CHANGE = 'onwebkitfullscreenchange';
}
else if ("msRequestFullscreen" in DOC_EL) {
    TYPE_REQUEST_FULL_SCREEN = 'msRequestFullscreen';
    TYPE_EXIT_FULL_SCREEN = 'msExitFullscreen';
    TYPE_FULL_SCREEN_ELEMENT = 'msFullscreenElement';
    TYPE_ON_FULL_SCREEN_CHANGE = 'MSFullscreenChange';
}
else if ("mozRequestFullScreen" in DOC_EL) {
    TYPE_REQUEST_FULL_SCREEN = 'mozRequestFullScreen';
    TYPE_EXIT_FULL_SCREEN = 'mozCancelFullScreen';
    TYPE_FULL_SCREEN_ELEMENT = 'mozFullScreenElement';
    TYPE_ON_FULL_SCREEN_CHANGE = 'onmozfullscreenchange';
}
else if (!("requestFullscreen" in DOC_EL)) {
    throw "\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301Fullscreen API !";
}
function getCurrentElement(el: HTMLElement) {
    return el instanceof HTMLElement ? el : DOC_EL;
}
function beFull(el: HTMLElement) {

    return getCurrentElement(el)[TYPE_REQUEST_FULL_SCREEN]();
}
exports.beFull = beFull;
function exitFull() {
    if (DOC_EL.contains(styleEl)) {
        headEl === null || headEl === void 0 ? void 0 : headEl.removeChild(styleEl);
    }
    return document[TYPE_EXIT_FULL_SCREEN]();
}
exports.exitFull = exitFull;
function isFull(el: any) {
    return getCurrentElement(el) === document[TYPE_FULL_SCREEN_ELEMENT];
}
exports.isFull = isFull;
function toggleFull(el: any) {
    if (isFull(el)) {
        exitFull();
        return false;
    }
    else {
        beFull(el);
        return true;
    }
}
exports.toggleFull = toggleFull;


