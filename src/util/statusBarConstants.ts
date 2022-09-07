
export const setMenuVisibility = (cMenuVisibility: boolean) => {
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
  let cMenuToolbarModalBar = activeDocument.getElementById("cMenuToolbarModalBar");
  if (cMenuToolbarModalBar) {

    if(settings.positionStyle == "top")
    {
  
      cMenuToolbarModalBar.setAttribute("style", `position: relative; grid-template-columns: repeat(auto-fit, minmax(28px, 1fr));`);
      cMenuToolbarModalBar.className +=" top";
    }else
    {
      cMenuToolbarModalBar.setAttribute("style", `left: calc(50% - calc(${cMenuToolbarModalBar.offsetWidth}px / 2)); bottom: ${settings.cMenuBottomValue}em; grid-template-columns: ${"1fr ".repeat(settings.cMenuNumRows)}`);
    }
}

};

