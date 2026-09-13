import  {requireApiVersion} from "obsidian"
import {editingToolbarSettings }from "src/settings/settingsData";
let activeDocument: Document;
export const setMenuVisibility = (cMenuVisibility: boolean) => {
  requireApiVersion("0.15.0")?activeDocument=activeWindow.document:activeDocument=window.document;
  
  // Hide all toolbar styles (top, following, fixed)
  const toolbarStyles = ["top", "following", "fixed"];
  toolbarStyles.forEach((style) => {
    const toolbars = activeDocument.querySelectorAll(
      `.editingToolbarModalBar[data-toolbar-style="${style}"]`
    );
    toolbars.forEach((toolbar) => {
      if (cMenuVisibility) {
        (toolbar as HTMLElement).setCssStyles({ display: "" });
        (toolbar as HTMLElement).setCssStyles({ visibility: "visible" });
      } else {
        (toolbar as HTMLElement).setCssStyles({ display: "none" });
      }
    });
  });
  
  // Also check for legacy ID-based toolbar (backward compatibility)
  const legacyToolbar = activeDocument.getElementById("editingToolbarModalBar");
  if (legacyToolbar) {
    if (cMenuVisibility) {
      legacyToolbar.setCssStyles({ display: "" });
      legacyToolbar.setCssStyles({ visibility: "visible" });
    } else {
      legacyToolbar.setCssStyles({ display: "none" });
    }
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

