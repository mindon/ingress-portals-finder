var ingrUrl = /^http[s]?:\/\/(www\.)?ingress\.com/i; 
// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
    if( ingrUrl.test(tab.url) ) {
        chrome.pageAction.show(tabId);
    }
}

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);

var win, aw, data = 'INIT';
var portals, center, level;

function tabClicked(tab) {
  if( ingrUrl.test( tab.url ) ) {
    if(win && win.active) {
      try{chrome.tabs.remove([win.id]);}catch(e){}
    }

    chrome.tabs.executeScript(tab.id, { file: "ingr.js", runAt: 'document_start' });

    chrome.windows.create({'url': 'view.html', 'type': 'popup', 'width': 720, 'height':570, 'focused': true}
      , function(chromeWindow) {
        win = chromeWindow.tabs[0];
      });

  } else {
    if(aw && aw.active) {
      try{chrome.tabs.remove([aw.id]);}catch(e){}
    }

    chrome.windows.create({'url': 'about.html', 'type': 'popup', 'width': 720, 'height':570, 'focused': true}
    , function(chromeWindow) {
      aw = chromeWindow.tabs[0];
      chromeWindow.alwaysOnTop = true;
    });
  }
}
if(chrome.pageAction && chrome.pageAction.onClicked) {
  chrome.pageAction.onClicked.addListener(tabClicked);
}
chrome.browserAction.onClicked.addListener(tabClicked);

var gpack, gbounds;
function response(pack) {
  if( typeof pack != 'string' ) {
    gpack = pack;
  }
  if(window.notify) {
    window.notify( pack );
  }
}

var gport, gtid;
chrome.extension.onConnect.addListener(function(port) {
  if( port.name != 'ingress-air' ) {
    return false;
  }

  gport = port;
  gport.onMessage.addListener(response);
});

var qn = 0;
function query(bounds) {
  if( gtid )
    clearTimeout(gtid);

  if( !gport ) {
    qn += 1;

    if( qn == 100 ) {
      qn = 0;
      return window.notify && window.notify('FAILED');
    }

    return setTimeout(function(){
      query(bounds);
    }, 100);
  }
  gbounds = bounds;
  gport.postMessage(bounds, '*');
}

var _BUFFER_EXPIRED = 5 * 50 * 1000;
function expire() {
  if(gtid) clearTimeout(gtid);
  gtid = setTimeout(function(){
    gpack = null;
  }, _BUFFER_EXPIRED);
}

function di(src, n, cb){
  if( typeof n == 'function' ) {
    cb = n;
    n = undefined;
  }
  var c = document.createElement("canvas");
  c.width = c.height = 32;
  var ctx = c.getContext("2d");
  var ni = new Image();
  ni.onload = function(){
    ctx.drawImage(this,0,0);
    var d;
    if( n !== undefined ) {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 9pt "coda_regular"';
      ctx.fillText(n.toString(), 25, 31);
      d = [c.toDataURL("image/png")];
      for(var i=n-1; i>-1; i--){
        ctx.clearRect(23, 22, 9, 10);
        ctx.fillText(i.toString(), 23, 31);
        d.push(c.toDataURL("image/png"));
      }
      d.reverse();
    } else {
      d = c.toDataURL("image/png");
    }
    cb( d, n );

    document.body.appendChild(c);
    c = ctx = null;
    ni.onload = null;
    ni = null;
  };
  ni.src = src;
}

var lvi = {};
di('a.png', 9, function(d){
  lvi['a'] = d || false;
});
di('r.png', 9, function(d){
  lvi['r'] = d || false;
});
