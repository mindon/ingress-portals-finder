var Base64 = {};
Base64.code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
Base64.encode = function(str, utf8encode) {
  utf8encode =  (typeof utf8encode == 'undefined') ? false : utf8encode;
  var o1, o2, o3, bits, h1, h2, h3, h4, e=[], pad = '', c, plain, coded;
  var b64 = Base64.code;
   
  plain = utf8encode ? Utf8.encode(str) : str;
  
  c = plain.length % 3;
  if (c > 0) { while (c++ < 3) { pad += '='; plain += '\0'; } }
  for (c=0; c<plain.length; c+=3) {
    o1 = plain.charCodeAt(c);
    o2 = plain.charCodeAt(c+1);
    o3 = plain.charCodeAt(c+2);
      
    bits = o1<<16 | o2<<8 | o3;
      
    h1 = bits>>18 & 0x3f;
    h2 = bits>>12 & 0x3f;
    h3 = bits>>6 & 0x3f;
    h4 = bits & 0x3f;

    e[c/3] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
  }
  coded = e.join('');
  coded = coded.slice(0, coded.length-pad.length) + pad;
  return coded;
}

var Utf8 = {};
Utf8.encode = function(strUni) {
  var strUtf = strUni.replace(
      /[\u0080-\u07ff]/g,
      function(c) { 
        var cc = c.charCodeAt(0);
        return String.fromCharCode(0xc0 | cc>>6, 0x80 | cc&0x3f); }
    );
  strUtf = strUtf.replace(
      /[\u0800-\uffff]/g,
      function(c) { 
        var cc = c.charCodeAt(0); 
        return String.fromCharCode(0xe0 | cc>>12, 0x80 | cc>>6&0x3F, 0x80 | cc&0x3f); }
    );
  return strUtf;
}

// escape xml
function vxml( s ) {
  if( !s && !s.toString )
    return '';

  if( typeof(s) !== 'string' )
    s = s.toString();

  return s.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');     
}

function kml(img, level) {
  var n = [0,1,2,3,4,5,6,7,8]
    , krxp
    , trxp;

  if( !isNaN(level) ) 
    n = [level];

  var v = $('#mykey').val();
  if( /\S/.test(v) ) {
    krxp = new RegExp( '(' +v.replace(/^\s+|\s+$/g,'').toLowerCase().replace(/\s*,\s*/g, '|') +')', 'ig' );
  }

  var t = [];
  if( $('#enlightened:checked').length ) {
    t.push('ALIENS');
  }
  if( $('#resistance:checked').length ) {
    t.push('RESISTANCE');
  }
  if( $('#neutral:checked').length ) {
    t.push('NEUTRAL');
  }

  var kmlstr = '';
  var styles = '<Style id="ALIENS"><IconStyle><color>ff00aa55</color></IconStyle><LabelStyle><color>ff00aa00</color></LabelStyle></Style><Style id="RESISTANCE"><IconStyle><color>ffaa0000</color></IconStyle><LabelStyle><color>ffaa0000</color></LabelStyle></Style><Style id="NEUTRAL"><IconStyle><color>ff333366</color></IconStyle><LabelStyle><color>ff333366</color></LabelStyle></Style>'
    , colors = {'ALIENS':'#00aa00','RESISTANCE':'#0000aa','NEUTRAL':'#663333'};

  n.forEach(function(v){
    var idx = levels[v];
    if( !idx || idx.length == 0 )
      return;

    idx.sort(function(a,b){
      var u = portals[a], v = portals[b], c = u.links - v.links;
      return !u||!v||c==0?0:(c>0?1:-1);
    });
    idx.forEach(function(u) {
      var l = portals[u]
        , valid = l ? true : false
        , matched = krxp ? krxp.test(l.addr) : true
        , same = t.length ? t.indexOf(l.team) > -1 : false;

      if( valid && matched && same ) {
        kmlstr += '<Placemark><name>' + vxml(l.name) +'</name><description><![CDATA[<table>';
        kmlstr += '<tr><td style="color:'+colors[l.team]+'"><p>'+vxml(l.addr)+'</p><ul><li>Resonators: ' +vxml(l.resonators.join('') || '-') +'</li>';
        kmlstr += '<li>Level: '+(0+l.level)+'</li>';
        kmlstr += '<li>Energy: '+(0+l.energyLevel)+'</li>';
        kmlstr += '<li>Links: '+(0+l.links)+'</li>';
        kmlstr += '<li>Mods: '+(0+l.mods)+'</li></ul>';
        kmlstr += '</td>'+(img?'<td width="120"><div style="background-position:center center;background-size:contain;background-repeat: no-repeat;width:120px;height: 160px;background-image:url('+l.imageUrl+')"></div></td>':'')+'</tr></table>';
        kmlstr += ']]></description><styleUrl>#'+l.team+'</styleUrl><Point><coordinates>'+l.lng+','+l.lat+',0</coordinates></Point></Placemark>';
      }
    });
  });

  return 'data:application/vnd.google-earth.kml+xml;base64,'+Base64.encode('<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://earth.google.com/kml/2.2"><Document><name>Ingress Portals Finder</name><description>"Ingress Portals Finder" Chrome Extension, Developed by Mindon from http://mindon.github.com/</description><open>1</open>' +styles + kmlstr +'</Document></kml>', true);
}

function csv(img, level) {
  var n = [0,1,2,3,4,5,6,7,8]
    , krxp
    , trxp;

  if( !isNaN(level) ) 
    n = [level];

  var v = $('#mykey').val();
  if( /\S/.test(v) ) {
    krxp = new RegExp( '(' +v.replace(/^\s+|\s+$/g,'').toLowerCase().replace(/\s*,\s*/g, '|') +')', 'ig' );
  }

  var t = [];
  if( $('#enlightened:checked').length ) {
    t.push('ALIENS');
  }
  if( $('#resistance:checked').length ) {
    t.push('RESISTANCE');
  }
  if( $('#neutral:checked').length ) {
    t.push('NEUTRAL');
  }

  var csvstr = '"Team","Level","Name","Address","Energy","Links","Mods","Resonators","PHOTO"\n';

  n.forEach(function(v){
    var idx = levels[v];
    if( !idx || idx.length == 0 )
      return;

    idx.sort(function(a,b){
      var u = portals[a], v = portals[b], c = u.links - v.links;
      return !u||!v||c==0?0:(c>0?1:-1);
    });
    idx.forEach(function(u) {
      var l = portals[u]
        , valid = l ? true : false
        , matched = krxp ? krxp.test(l.addr) : true
        , same = t.length ? t.indexOf(l.team) > -1 : false;

      if( valid && matched && same ) {
        csvstr += '"'+(l.team=='ALIENS'?'ENLIGHTENED':l.team)+'"';
        csvstr += ',"'+(0+l.level)+'"';
        csvstr += ',"'+l.name.replace(/\"/g, '\'\'')+'"';
        csvstr += ',"'+l.addr.replace(/\"/g, '\'\'')+'"';
        csvstr += ',"'+(0+l.energyLevel)+'"';
        csvstr += ',"'+(0+l.links)+'"';
        csvstr += ',"'+(0+l.mods)+'"';
        csvstr += ',"'+vxml(l.resonators.join('') || '-')+'"';
        csvstr += ',"'+(l.imageUrl||'')+'"\n';
      }
    });
  });

  return 'data:text/comma-separated-values;base64,'+Base64.encode(csvstr, true);
}