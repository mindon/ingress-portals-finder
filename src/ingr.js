var ck = document.cookie.match(/(^|;)\s*csrftoken=([^\s;]+)/i)
  , token = ck && ck[2] || ''
  , api = "//intel.ingress.com/r/getPlexts"
  , oneReqNum = 18;

var port = chrome.extension.connect({name: "ingress-air"})
  , ready = true;

port.onMessage.addListener(function(bounds){
  ready = true;
  if( /-?[\.\d]+,-?[\.\d]+,-?[\.\d]+,-?[\.\d]+/.test( bounds ) ) {
    if( !token ) {
      var ck = document.cookie.match(/(^|;)\s*csrftoken=([^\s;]+)/i);
      token = ck && ck[2] || '';
    }
    
    if( !token ) {
      return port.postMessage('NOAUTH');
    }
    var i = bounds.indexOf('#');
    if( i > 0 ) {
      var cmd = bounds.substr(i +1);
      bounds = bounds.substr(0, i);
      if( cmd == "CLEAR" ) {
        var c = '<li>Query @ ' +(new Date()).toUTCString()+'</li>';
        if( document.getElementById('header') ) {
          c = '<style>@font-face {font-family: coda_regular;src: url("../ttf/coda_regular.ttf");} h1,li{font-family: coda_regular, arial, helvetica, sans-serif;}</style><h1>Ingress Portals Finder</h1>' +c;
        }
        document.write(c);
      }
    }
    ingr( bounds );
  } else {
    port.postMessage('INVALID');
  }
});

port.onDisconnect.addListener(function(){
  ready = false;
});

var reqnum = 0, reqtotal = 0;
function doreq(bl) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (xhr.readyState == 4) {
      if( reqnum > 0 ) reqnum -= 1;
      port.postMessage('GOT:' + (reqtotal - reqnum) +'/' +reqtotal);
      if( !ready && xhr.status != 200 || this.repsonseText == 'User not authenticated' ) {// failed
        xhr = null;
        return port.postMessage('NOAUTH');
      }

      var c = ''
        , resp;
      try {
        resp = JSON.parse(this.responseText);
      } catch(e){}
      if( !resp || resp.error || !resp.result || !resp.result.map ) {
        return port.postMessage('FAILED');
      }
      var md = resp.result.map, et = [], de = [];
      var result = {gameEntities:[], deletedGameEntityGuids:[]};
      for(var qk in md) {
        var vd = md[qk];
        if(vd.gameEntities && vd.gameEntities.length > 0) {
          et = et.concat( vd.gameEntities );
        }
        if(vd.deletedGameEntityGuids && vd.deletedGameEntityGuids.length > 0) {
          de = de.concat( vd.deletedGameEntityGuids );
        }
      }
      if( et.length > 0 ) {
        result.gameEntities = result.gameEntities.concat(et);
      }
      if( de.length > 0 ) {
        result.deletedGameEntityGuids = result.deletedGameEntityGuids.concat(et);
      }
      et = null;
      de = null;
      md = null;
      if( reqnum == 0 )
        result.fin = 1;
      port.postMessage( result );
      xhr.abort();
      xhr = null;
    }
  };

  // var param = {
  //   "boundsParamsList" : bl,
  //   "method": "dashboard.getThinnedEntitiesV4"
  // };
  var param = bl;
  xhr.open("POST", api, true);
  xhr.withCredentials = true;
  xhr.setRequestHeader("X-CSRFToken", token);
  xhr.send( JSON.stringify(param) );
}

function qparams(mapZoom, bounds) {
		mapZoom = parseInt(mapZoom, 10);
  
    var r = rangs(mapZoom, bounds)
      , d = [], b = [];
    var n = 0;
    qks = [];
    for(var y=r[2]; y<r[3]; y++) {
      for(var x=r[0]; x<r[1]; x++) {
        if( n%oneReqNum == 0 ) {
          if(n > 0) b.push(d);
          d = [];
        }
        var qk = mapZoom+'_' +x +'_' +y;
        d.push({id:qk, qk:qk
          , minLatE6: Math.round(tileLat(y, mapZoom) * 1E6)
          , minLngE6:Math.round(tileLat(x, mapZoom) * 1E6)
          , maxLatE6:Math.round(tileLat(y +1, mapZoom) * 1E6)
          , maxLngE6:Math.round(tileLat(x +1, mapZoom) * 1E6)});
        n += 1;
      }
    }
    if(d.length > 0) {
      b.push(d);
    }
    //return b;
    return {
      ascendingTimestampOrder: true
          ,minTimestampMs: new Date().getTime()
          ,maxTimestampMs: -1
          ,'tab': 'all'
          , minLatE6: Math.min(d[0].minLatE6, d[d.length-1].minLatE6)
          , minLngE6: Math.min(d[0].minLngE6, d[d.length-1].minminLngE6LatE6)
          , maxLatE6: Math.max(d[0].maxLatE6, d[d.length-1].maxLatE6)
          , maxLngE6: Math.max(d[0].maxLngE6, d[d.length-1].maxLngE6)
          , v: ''
    };
}

function rangs(mapZoom, bounds) {
    var x1 = lngTile(parseFloat(bounds[1]), mapZoom)
      , x2 = lngTile(parseFloat(bounds[3]), mapZoom)
      , y1 = latTile(parseFloat(bounds[2]), mapZoom)
      , y2 = latTile(parseFloat(bounds[0]), mapZoom);
    return [x1, x2, y1, y2];
}

function lngTile(lng, mapZoom) {
	  return Math.floor((lng + 180) / 360 * Math.pow(2, (mapZoom>12)?mapZoom:(mapZoom+2)));
}
function tileLng(x, mapZoom) {
	  return x / Math.pow(2, (mapZoom>12)?mapZoom:(mapZoom+2)) * 360 - 180;
}

function latTile(lat, mapZoom) {
	  return Math.floor((1 - Math.log( Math.tan(lat * Math.PI / 180)
      + 1 / Math.cos(lat * Math.PI / 180) ) / Math.PI) / 2 * Math.pow(2, (mapZoom>12)?mapZoom:(mapZoom+2)));
}
function tileLat(y, mapZoom) {
	  var n = Math.PI - 2 * Math.PI * y / Math.pow(2,  (mapZoom>12)?mapZoom:(mapZoom+2));
	  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function ingr(bounds) {
  var d = bounds.split(',');
  if( d.length < 4 ) {
    port.postMessage('INVALID');
    return;
  }
  var mapZoom = d[4] ? parseInt(d[4],10) || 12: 12;

  var req = qparams(mapZoom, d);
  // if( req.length > 8 ) {
  //   port.postMessage('MASS:' + req.length);

  reqnum = reqtotal = 1;
  doreq(req);
  // } else if( req.length > 0 ) {
  //   port.postMessage('QUERYING');
  //   reqnum = reqtotal = req.length;
  //   req.forEach(function(v){
  //     doreq(v);
  //   });
  // } else {
  //   reqnum = reqtotal = 0;
  //   port.postMessage('INVALID');
  // }
};

