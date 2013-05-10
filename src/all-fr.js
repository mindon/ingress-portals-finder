var air = chrome.extension.getBackgroundPage();
$(document).ready(function(){
  $('#all-fr').load(function() {
    this.contentWindow.postMessage({center: air.center, portals: air.portals, level: air.level, lvi: air.lvi}, '*');
    air.all = true;
  });
});
$(window).unload(function(){
  air.all = false;
});