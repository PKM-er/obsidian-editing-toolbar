import  {requireApiVersion} from "obsidian"
import {editingToolbarSettings }from "src/settings/settingsData";
let activeDocument: Document;
export const setMenuVisibility = (cMenuVisibility: boolean) => {
  requireApiVersion("0.15.0")?activeDocument=activeWindow.document:activeDocument=window.document;
  let editingToolbarModalBar = activeDocument.getElementById("editingToolbarModalBar");
  if (editingToolbarModalBar) {
    cMenuVisibility == false
      ? (editingToolbarModalBar.style.visibility = "hidden")
      : (editingToolbarModalBar.style.visibility = "visible");
  }
};

// export const setBottomValue = (
//   settings: any
// ) => {
//   requireApiVersion("0.15.0")?activeDocument=activeWindow.document:activeDocument=window.document;
//   let editingToolbarModalBar = activeDocument.getElementById("editingToolbarModalBar");

//   if (editingToolbarModalBar) {
    
//     settings.positionStyle == "following" ? editingToolbarModalBar.style.visibility = "hidden" : true;
//     if(settings.positionStyle == "fixed")
//     {
//       editingToolbarModalBar.setAttribute("style", `left: calc(50% - calc(${editingToolbarModalBar.offsetWidth}px / 2)); bottom: ${settings.cMenuBottomValue}em; grid-template-columns: ${"1fr ".repeat(settings.cMenuNumRows)}`);
//     }
// }

// };

export const setBottomValue = (
  settings: editingToolbarSettings
) => {
  requireApiVersion("0.15.0")?activeDocument=activeWindow.document:activeDocument=window.document;
  activeDocument.documentElement.style.setProperty('--toolbar-vertical-offset', `${settings.verticalPosition}px`);


};
export const setHorizontalValue = (settings: editingToolbarSettings) =>{
  requireApiVersion("0.15.0")?activeDocument=activeWindow.document:activeDocument=window.document;
  activeDocument.documentElement.style.setProperty('--toolbar-horizontal-offset', `${settings.horizontalPosition}px`);
}

