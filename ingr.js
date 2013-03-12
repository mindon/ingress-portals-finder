var ck = document.cookie.match(/(^|;)\s*csrftoken=([^\s;]+)/i)
  , token = ck && ck[2] || ''
  , api = "//www.ingress.com/rpc/dashboard.getThinnedEntitiesV2"
  , qk = '013212223212'
  , param = {
    "minLevelOfDetail" : 0,
    "boundsParamsList" : [ {
      "id" : qk,
      "minLatE6": 22370051,
      "minLngE6": 112850632,
      "maxLatE6": 22811906,
      "maxLngE6": 115340553,
      "qk": qk
    } ],
    "method": "dashboard.getThinnedEntitiesV2"
  };

var port = chrome.extension.connect({name: "ingress-air"})
  , ready = true;

port.onMessage.addListener(function(bounds){
  ready = true;
  if( /-?[\.\d]+,-?[\.\d]+,-?[\.\d]+,-?[\.\d]+/.test( bounds ) ) {
    if( !token ) {
      var ck = document.cookie.match(/(^|;)\s*csrftoken=([^\s;]+)/i);
      token = ck && ck[2] || '';
      if( token )
        xhr.setRequestHeader("X-CSRFToken", token);
    }
    
    if( !token ) {
      return port.postMessage('NOAUTH');
    }
    ingr( bounds );
  } else {
    port.postMessage('INVALID');
  }
});

port.onDisconnect.addListener(function(){
  ready = false;
});

var result = {};

var xhr = new XMLHttpRequest();
xhr.onreadystatechange = function(){
  if (xhr.readyState == 4) {
    if( !ready && xhr.status != 200 || this.repsonseText == 'User not authenticated' ) // failed
      return port.postMessage('NOAUTH');

    var resp;
    try {
      resp = JSON.parse(this.responseText);
    } catch(e){}
    if( !resp || resp.error || !resp.result || !resp.result.map[qk] ) {
      return port.postMessage('FAILED');
    }
    var data = resp.result.map[qk];
    port.postMessage( data );
  }
};

function ingr(bounds) {
  if( xhr.readyState && xhr.readyState != 4 ) {
    xhr.abort();
  }
  result = {};
  var d = bounds.replace(/\./g, '').split(',');
  qk = '0'+(bounds+',').replace(/\d{4},/g,'').replace(/\-/g, '0').replace(/\./g, '');
  param.boundsParamsList[0].minLatE6 = parseInt(d[0]);
  param.boundsParamsList[0].minLngE6 = parseInt(d[1]);
  param.boundsParamsList[0].maxLatE6 = parseInt(d[2]);
  param.boundsParamsList[0].maxLngE6 = parseInt(d[3]);
  param.boundsParamsList[0].id = qk;
  param.boundsParamsList[0].qk = qk;
  port.postMessage('QUERYING');

  xhr.open("POST", api, true);
  xhr.setRequestHeader("X-CSRFToken", token);
  xhr.withCredentials = true;
  xhr.send( JSON.stringify(param) );
}
