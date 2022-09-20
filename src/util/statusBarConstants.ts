import  {requireApiVersion} from "obsidian"
let activeDocument: Document;
export const setMenuVisibility = (cMenuVisibility: boolean) => {
  requireApiVersion("0.15.0")?activeDocument=activeWindow.document:activeDocument=window.document;
  let cMenuToolbarModalBar = activeDocument.getElementById("cMenuToolbarModalBar");
  if (cMenuToolbarModalBar) {
    cMenuVisibility == false
      ? (cMenuToolbarModalBar.style.visibility = "hidden")
      : (cMenuToolbarModalBar.style.visibility = "visible");
  }
};

export const setBottomValue = (
  settings: any
) => {
  requireApiVersion("0.15.0")?activeDocument=activeWindow.document:activeDocument=window.document;
  let cMenuToolbarModalBar = activeDocument.getElementById("cMenuToolbarModalBar");

  if (cMenuToolbarModalBar) {
    
    settings.positionStyle == "following" ? cMenuToolbarModalBar.style.visibility = "hidden" : true;
    if(settings.positionStyle == "fixed")
    {
      cMenuToolbarModalBar.setAttribute("style", `left: calc(50% - calc(${cMenuToolbarModalBar.offsetWidth}px / 2)); bottom: ${settings.cMenuBottomValue}em; grid-template-columns: ${"1fr ".repeat(settings.cMenuNumRows)}`);
    }
}

};

