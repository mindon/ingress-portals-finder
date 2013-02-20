var ready, dr, portals, levels, nzlevel, teams, stat, tid, tn = 0;
var EnergyMax = [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000 ];
var air = chrome.extension.getBackgroundPage();
var mapWin, center = [22.528176, 113.928448];

var vs = {}, vsc = {}, sortKey;

window.oncontextmenu = function(){return false};

window.addEventListener('message', function(event) {
  if( event.data == 'render-ready' ) {
    ready = true;
    dr = event.source;
    dr.postMessage({template: $('#tmpl_view').val()}, '*'); // prepare render

  } else if( event.data == 'map-ready' ) {
    mapWin = event.source;

    $('#mapkey').hide();
    
    updateMap();
  } else if( event.data == 'map-failed' ) {
    $('#mapkey').show();
    $('#mymapkey').focus();

  } else if( event.data ) {
    if( event.data.bounds ) {
      updateBounds( event.data );

    } else {
      view( event.data );
    }
  }
});

function updateBounds( data ) {
  var d = data.center;
  if( d && d.length == 2 ) {
    center = d;
  }
  if( data.zoom ) {
    localStorage['zoom'] = data.zoom;
  }
  d = data.bounds;
  if( d && d.length == 2 ) {
    if( Math.abs(d[1][0] - d[0][0]) > 1.0
      || Math.abs(d[1][1] - d[0][1]) > 1.2 ) {
      $('#myrange').show();
    }

    $('#mymin').val( d[0].join(',') );
    $('#mymax').val( d[1].join(',') );
  }
}

function view( html, simple ) {
  $('.LevelBar div[class]').unbind('click');
  $('.scene[u],a.map,#myreload').unbind('click');

  $('#mystage').html( html );
  
  if( !simple ) {
    $('.portal .addr, .portal .name').each(function(){
      if( this.scrollWidth > this.offsetWidth ) {
        this.title = this.innerHTML;
      }
    });

    $('.stat[lv]').each(function(){
      var v = $(this).attr('lv');
      if( stat[v] ) {
        var st = stat[v]
          , c = (st['ALIENS']||0) + (st['RESISTANCE']||0) +(st['NEUTRAL']||0);

        $(this).html(c +' = <label class="enlightened">' +(st['ALIENS']||0) +'</label> + <label class="resistance">'
          + (st['RESISTANCE']||0) +'</label> + <label class="neutral">' +(st['NEUTRAL']||0) +'</label>');
      } else {
        $(this).html('');
      }
    });

    $('#mysubmit').get(0).disabled = false;

    $('.LevelBar:first').css('border-top-width', '2px');

    $('.scene[u]').click(function(){
      window.open( $(this).attr('u') );
    });

    air.center = center.join(',');

    if( mapWin ) {
      updateMap();
    }
    $('.LevelBar div[class]').filter('.energy,.links,.mods').click(function(){
      var key = $(this).attr('class');
      if( sortKey != key ) {
        sortKey = key;
      } else {
        sortKey = '-' +key;
      }
      sort( sortKey );

      render();
    }).css('cursor', 'pointer').attr('title', 'Click to sort');

    $('.LevelBar .export').click(function(event){
      if(!window.kml) {
        return false;
      }

      var offset = $(this).offset()
        , lv = $(this).attr('lv');
      $('#myexport b').html( lv );

      $('#myexport').attr('lv', lv).css({right: 4, top: offset.top -36}).show();

      event.stopPropagation();
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    });
    $('.LevelBar .export-csv').click(function(event){
      if(!window.csv) {
        return false;
      }
      var now = new Date()
        , timestr = 'T'+ (now.getMonth() > 8 ? '' : '0') + (1+now.getMonth()) +(now.getDate() > 9 ? '' : '0') + now.getDate();
      var lv = $(this).attr('lv');
      $(this).attr('download', 'Ingress-IPf-Level-'+lv+'-'+timestr+'.csv');
      $(this).attr('href', csv(true, lv));
    });
  }
}

var INED = '<p style="color:#fc6;font-size:10pt">If already in, try following steps: <br/>1) close this window; &nbsp; &nbsp; &nbsp;<br/>2) reload the /intel page;<br/>3) re-open this window. &nbsp;</ol></p>'
, NOTIFYS = {
  'FAILED': 'Query Failed - Sign-In Required!' + INED
 ,'INVALID': 'Invalid Query!'
 ,'QUERYING': 'Querying Portals, It Takes Time ...<div class="spinning"><div class="ball"></div><div class="ball1"></div></div>'
 ,'NOAUTH': 'Sign-In Required!' + INED
 ,'ERROR': 'Query Error! [ <a id="myreload">Reload</a> ]'
 ,'UNKNOWN': 'Unknown Error! [ <a id="myreload">Reload</a> ]'
};

function fail( data ) {
  view( '<div class="notify">' +( NOTIFYS[data] || NOTIFYS.UNKNOWN ) +'</div>', true );
  $('#myreload').click(function(){
    window.location.reload();
  });
  if( data != 'QUERYING' ) {
    $('#mysubmit').get(0).disabled = false;
  }
}

var sortFn;
function sort(sortKey) {
  if( sortKey == 'energy' ) {
    sortFn = function(a,b){
      var u = portals[a], v = portals[b], c = u.energyLevel - v.energyLevel;
      return !u||!v||c==0?0:(c>0?1:-1);
    };
  } else if( sortKey == '-energy' ) {
    sortFn = function(a,b){
      var u = portals[a], v = portals[b], c = v.energyLevel - u.energyLevel;
      return !u||!v||c==0?0:(c>0?1:-1);
    };
  } else if( sortKey == 'links' ) {
    sortFn = function(a,b){
      var u = portals[a], v = portals[b], c = u.links - v.links;
      return !u||!v||c==0?0:(c>0?1:-1);
    };
  } else if( sortKey == '-links' ) {
    sortFn = function(a,b){
      var u = portals[a], v = portals[b], c = v.links - u.links;
      return !u||!v||c==0?0:(c>0?1:-1);
    };
  } else if( sortKey == 'mods' ) {
    sortFn = function(a,b){
      var u = portals[a], v = portals[b], c = u.mods - v.mods;
      return !u||!v||c==0?0:(c>0?1:-1);
    };
  } else if( sortKey == '-mods' ) {
    sortFn = function(a,b){
      var u = portals[a], v = portals[b], c = v.mods - u.mods;
      return !u||!v||c==0?0:(c>0?1:-1);
    };
  }
}

function filter( results ) {
  var n = []
    , krxp
    , trxp;
  $('#mylevels a.active').each(function() {
    n.push( parseInt($(this).attr('lv')) );
  });
  if( n.length == 0 ) {
    n = [nzlevel];
    $('#mylevels a[lv="'+nzlevel+'"]').addClass('active');
  } else {
    n.sort();
  }
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

  var r = [], num = {};
  stat = {};
  vsc = {};

  n.forEach(function(v){
    var idx = levels[v];

    var st = {}
      , n = 0;

    if( idx ) {
      var LevelBar = '<div class="LevelBar"><div class="note"><div class="level" style="height:11px;background-position:0 -98px"></div>Level <div class="energy" style="height:11px;background-position:-16px -98px"></div>Energy <div class="links" style="height:11px;background-position:-32px -98px"></div>Links  <div class="mods" style="height:11px;background-position:-48px -98px"></div>Mods</div>Level - <b>' + v +'</b> &nbsp;<span class="stat" lv="'+v+'"></span><div class="export" lv="'+v+'" title="Export KML">KML</div><a class="export-csv" lv="'+v+'" title="Export Current Level as CSV">CSV</a></div>';
      if( sortKey && sortFn ) {
        idx.sort(sortFn);
      }

      idx.forEach(function(u) {
        var l = portals[u]
          , valid = l ? true : false
          , matched = krxp ? krxp.test(l.addr) : true
          , same = t.length ? t.indexOf(l.team) > -1 : false;

        if( valid && matched && same ) {
          l.nameV = (l.name||'').replace(/\"/g, '&quot;');
          // preapre data for view template
          l.levelV = (l.level +1) * 11;
          l.energyV = Math.ceil( l.energyLevel * 0.98 ) +11;
          if( l.energyV > 109 )
            l.energyV = 109;

          l.linksV = (l.links +1) * 11;
          l.modsV = (l.mods +1) * 11;
          l.addrV = krxp ? (l.addr||'').replace(/</g, '&lt;').replace(krxp, '<b class="hightlight">$1</b>') : (l.addr||'').replace(/</g, '&lt;');

          if( LevelBar ) {
            l.LevelBar = LevelBar;
            LevelBar = null;
          } else if(l.LevelBar) {
            delete l.LevelBar;
          }
          if(!st[l.team]) {
            st[l.team] = 1;
          } else {
            st[l.team] +=1;
          }
          n += 1;

          r.push( l );

          if( !vsc[l.level] ) {
            vsc[l.level] = {};
          }
          vsc[l.level][l.team] = (vsc[l.level][l.team] || 0) +1;

        }
      });
    }

    num[v] = n;

    stat[v] = st;

  });

  var n = 0;
  $('#mylevels a.active[lv]').each(function() {
    var v = parseInt($(this).attr('lv'));
    $(this).find('u').html( num[v]||0 );
    n += num[v]||0;
    if( v != '0' ) {
      var y = -15;
      if(!vsc[v] || !vsc[v]['ALIENS']) {
        y = !vsc[v] || !vsc[v]['RESISTANCE'] ? -60 : -30;
      } else if(!vsc[v]['RESISTANCE']) {
        y = 0;
      } else {
        y = -30 + Math.round(30*vsc[v]['ALIENS']/(vsc[v]['ALIENS'] + vsc[v]['RESISTANCE']));
      }
      $('#mylevels a[lv="'+v+'"]').css('background-position-y', y);
    }
  });

  $('#mycurr').html(n);

  return r;
}

function render() {
  if( window.gdata == 'QUERYING' || !window.gdata ) {
    return false;
  }
  if( !portals ) {
    return fail('FAILED');
  }

  if( !ready ) {
    return tn++ < 100 ? tid = setTimeout(render, 100) : fail('ERROR');
  }

  var r = filter(portals);
  if( r && r.length > 0 ) {
    dr.postMessage({result: {list: r}}, '*');
  } else {
    view( '<div class="notify">No Portals Matched This Level</div>', true );
  }
}

air.notify = function(data){
  window.gdata = data;

  air.expire();

  tn = 0;
  tid && clearTimeout(tid);
  if( !data || typeof data == 'string' ) {
    fail(data);

  } else {
    sortKey = '';
    $('#mylevels a[lv] u').html( 0 ).removeData('num');

    // deleted
    var deleted = {};
    
    if( data.deletedGameEntityGuids ) {
      data.deletedGameEntityGuids.forEach(function(v){
        deleted[v] = true;
      });
    }

    // entities
    if( data.gameEntities ) {
      var results = []
        , dE6 = /(\d{6})$/
        , n = 0;

      // reset global data
      air.portals = portals = [];
      levels = {};
      teams = {};

      var dupc = {}; //avoid duplicate

      data.gameEntities.forEach(function(v) {
        var d = v[2];

        // skip
        if(!d || deleted[v[0]] || !d.resonatorArray || dupc[v[0]])
          return;
        dupc[v[0]] = true;

        // name, addr, lng, lat, team
        var result = {
          name: d.portalV2 && d.portalV2.descriptiveText ? d.portalV2.descriptiveText.TITLE || 'No Name' : 'No Name'
         ,addr: d.portalV2 && d.portalV2.descriptiveText ? d.portalV2.descriptiveText.ADDRESS || '-' : '-'
         ,lngE6: d.locationE6.lngE6
         ,latE6: d.locationE6.latE6
         ,lng: d.locationE6.lngE6.toString().replace(dE6, '.$1')
         ,lat: d.locationE6.latE6.toString().replace(dE6, '.$1')
         ,imageUrl: d.imageByUrl ? (d.imageByUrl.imageUrl || '').replace(/\"/g, '&quot;') : ''
         ,team: d.controllingTeam.team
         ,resonators: []
         ,level: 0
         ,energy: 0
         ,energyMax: 0
         ,links: 0
         ,mods: 0
        };

        // resonators
        var i = 0;
        if( d.resonatorArray && d.resonatorArray.resonators ) {
          d.resonatorArray.resonators.forEach(function(r){
            if( !r )
              return;
            var level = r.level || 0;
            result.resonators[i++] = level;
            result.level += level;
            result.energy += r ? r.energyTotal : 0

            result.energyMax += EnergyMax[level] || 0;
          });
        }

        result.level = result.level ? Math.max(Math.floor(result.level/8), 1) : 0;
        result.energyLevel = result.energyMax ? Math.floor(result.energy * 100 / result.energyMax) : 0;
        result.energyIndex = Math.floor(result.energyLevel/20);

        if( !vs[result.level] ) {
          vs[result.level] = {};
        }
        vs[result.level][result.team] = (vs[result.level][result.team] || 0) +1;

        if( d.portalV2 ) {
          if( d.portalV2.linkedEdges ) {
            d.portalV2.linkedEdges.forEach(function(l) {
              result.links += deleted[ l.edgeGuid ] ? 0 : 1;
            });
          }
          if( d.portalV2.linkedModArray ) {
            d.portalV2.linkedModArray.forEach(function(m) {
              result.mods += m ? 1 : 0;
            });
          }
        }
        results[n] = result;
        if( !levels[result.level] ) {
          levels[ result.level ] = [n];
        } else {
          levels[ result.level ].push(n);
        }

        if( !teams[result.team] ) {
          teams[ result.team ] = [n];
        } else {
          teams[ result.team ].push(n);
        }

        n += 1;
      });
    }

    portals = results;
    air.portals = portals;

    var total = 0;
    nzlevel = -1;
    for(var k in levels) {
      var v = levels[k] ? levels[k].length : 0;
      $('#mylevels a[lv="'+k+'"] u').html( v ).data( 'num',  v );
      total += v;
      if(v && nzlevel === -1 )
        nzlevel = parseInt(k);
    }
    if( nzlevel == -1 )
      nzlevel = 0;

    for(var k in vs) {
      if( k != '0' ) {
        var y = -15;
        if(!vs[k]['ALIENS']) {
          y = !vs[k]['RESISTANCE'] ? -60 : -30;
        } else if(!vs[k]['RESISTANCE']) {
          y = 0;
        } else {
          y = -30 + Math.round(30*vs[k]['ALIENS']/(vs[k]['ALIENS'] + vs[k]['RESISTANCE']));
        }
        $('#mylevels a[lv="'+k+'"]').css('background-position-y', y).data('vs', y);
      }
    }

    $('#mytotal').html( total );
    render();
  }
};

function idonate(key) {
  var fm = document.getElementById('fmdonate');
  fm['hosted_button_id'].value = key;
  fm.submit();
}

$(document).ready(function(){
  $('#about').click(function(){
    window.open('about.html');
  });

  $('#mylevels a').click(function(event) {
    if( event.ctrlKey ) {
      $(this).toggleClass('active');
      if( !$(this).hasClass('active') && $(this).find('u').data('num') ) {
        $(this).find('u').html( $(this).find('u').data('num') );
      }
    } else {
      if( $(this).hasClass('active') && $('#mylevels a.active').length == 1 ) {
        return true;
      }
      $('#mylevels a.active').each(function(){
        $(this).removeClass('active');
        $(this).find('u').html( $(this).find('u').data('num') || 0 );
        if( $(this).data('vs') !== undefined ) {
          $(this).css('background-position-y', $(this).data('vs'));
        }
      });
      $(this).addClass('active');
    }
    render();
  });

  $('#mykey').bind('input paste', function(event){
    render();
  }).blur(function(){
    localStorage['keywords'] = $('#mykey').val();
  });

  $('#myteam input').click(function(){
    render();
  });

  if( air.gpack ) {
    air.notify( air.gpack );
  }

  var drxp = /^\s*\-?\d*\.\d{6}\s*,\s*\-?\d*\.\d{6}\s*$/;
  $('#mysubmit').click( function(){
    if( !drxp.test( $('#mymin').val() ) ) {
      return $('#mymin').focus();
    }
    if( !drxp.test( $('#mymax').val() ) ) {
      return $('#mymax').focus();
    }

    var bounds = ($('#mymin').val() +',' +$('#mymax').val()).replace(/\s+/g, '');
    var m = bounds.split(/\s*,\s*/);
    if( Math.abs(parseFloat(m[0]) - parseFloat(m[2])) > 1.0
      || Math.abs(parseFloat(m[1])-parseFloat(m[3])) > 1.2 ) {
      $('#myrange').show();
      return false;
    }

    this.disabled = true;
    if( air.gbounds == bounds && air.gpack && typeof air.gpack !='string' ) {
      air.notify( air.gpack );
    } else {
      fail('QUERYING');
      air.qn = 0;
      air.gpack = null;
      air.query( bounds );
    }
    localStorage['bounds'] = bounds;
  });

  var v = localStorage['bounds'];
  if( v ) {
    v = v.split(',');
    if( v.length == 4 ) {
      $('#mymin').val( v[0]+','+v[1] );
      $('#mymax').val( v[2]+','+v[3] );
    }
  }
  v = localStorage['keywords'];
  if( v !== undefined ) {
    $('#mykey').val( v );
  }

  // map
  $('#mapfr').attr('src', 'map.html');

  $('#places,#mymin,#mymax').click(function(event) {
    if($('#mymap:visible').length) {
      return $('#mymap:visible').hide();
    }
    if( mapWin ) {
      $('#mybounds').show();
      $('#bigmap,#myall').hide();
      $('#mymap').show();

      var dxp = /^[\.\-\d]+,[\.\-\d]+$/;
      if( dxp.test($('#mymin').val()) && dxp.test($('#mymax').val()) ) {
        var sw = $('#mymin').val().split(',')
           , ne = $('#mymax').val().split(',');

        center = [ (parseFloat(sw[0]) +(parseFloat(ne[0])-parseFloat(sw[0]))/2).toFixed(6)
          , (parseFloat(sw[1]) +(parseFloat(ne[1])-parseFloat(sw[1]))/2).toFixed(6)];

      } else if( localStorage['center'] ) {
        var d = localStorage['center'].split(',');
        center = [parseFloat(d[0]).toFixed(6), parseFloat(d[1]).toFixed(6)];
      }

      mapWin.postMessage({x: center[0], y: center[1], zoom: parseInt(localStorage['zoom']) || 12 }, '*');

      event.stopPropagation();
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  });

  $('#mybounds').click(function(){
    if( mapWin ) {
      mapWin.postMessage('BOUNDS', '*');
    }
  });

  $('#mymap').css('left', ($(window).width() - $('#mymap').width())/2);

  $('#allev').click(function(){
    $('#mylevels a').addClass('active');
    render();
  });

  $('#myall').click(function(){
    window.open('all-fr.html', 'all_portals');
  });

  $('#mytry').click(function(){
    if(!/\s*[a-z0-9]+\s*/i.test($('#mymapkey').val()))
      return $('#mymapkey').focus();
    mapWin && mapWin.postMessage({key: $('#mymapkey').val().replace(/^\s+|\s+$/g, '')}, '*');
  });

  $('#myexport a').click(function(){
    var lv = $(this).parent().attr('lv');
    if( !lv ) {
      return $(this).removeAttr('href');
    }
    var now = new Date()
      , timestr = 'T'+ (now.getMonth() > 8 ? '' : '0') + (1+now.getMonth()) +(now.getDate() > 9 ? '' : '0') + now.getDate();
    if( $(this).html() == 'All' ) {
      $(this).attr('download', 'Ingress-IPf-Level-A-'+timestr+'.kml');
      $(this).attr('href', kml($('#withimage:checked').length>0));
    } else {
      $(this).attr('download', 'Ingress-IPf-Level-'+lv+'-'+timestr+'.kml');
      $(this).attr('href', kml($('#withimage:checked').length>0,lv));
    }
  });

  $('#mydonate').click(function(){
    idonate('YSVEJMBLM3AFG');
  });
});

function updateMap() {
  $('a.map[href]').each(function(){
    var q = $(this).attr('href')
      , m = q.match(/\?q=[^@]*@?([\-\d\.]+),([\-\d\.]+)$/);
    if( m ) {
      var title = $(this).parent().parent().find('.name:first').html();
      $(this).data('map', {x: parseFloat(m[1]), y: parseFloat(m[2]), title: title
        , level: +$(this).attr('level')
        , team: $(this).attr('team').toLowerCase()});
      $(this).data('url', $(this).attr('href'));
      $(this).removeAttr('href').removeAttr('target').click(function(){
        var d = $(this).data('map');
        $('#mymap').show();
        $('#mybounds').hide();
        $('#bigmap').attr('href', $(this).data('url')).show();
        if( !air.all ) {
          $('#myall').show();
        } else {
          $('#myall').hide();
        }
        air.level = d.level;
        d.lvi = air.lvi;
        mapWin.postMessage( d, '*' );
        event.stopPropagation();
        event.stopImmediatePropagation();
        event.preventDefault();
        return false;
      });
    }
  });
}

$(window).unload(function(){
  air.expire();
  air.notify = null;
  air = null;
});

$(document).click(function(event){
  if( $('#mymap:visible').length )
    $('#mymap').hide();
  if( $('#myrange:visible').length )
    $('#myrange').hide();
  if( $('#myexport:visible').length ) {
    if(!event.target||event.target.id!='withimage')
      $('#myexport').hide();
  }
  return true;
});

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function(position) {
    localStorage['center'] = position.coords.latitude.toFixed(6) +',' +position.coords.longitude.toFixed(6);
    $('#myloc').click(function(){
      var c = localStorage['center'];
      if( mapWin && c ) {
        var d = c.split(',');
        mapWin.postMessage({x: parseFloat(d[0]), y: parseFloat(d[1]), zoom: parseInt(localStorage['zoom']) || 12 }, '*');
      }
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }).show();
  });
}

$(window).resize(function(){
  $('#mymap').css('left', ($(window).width() - $('#mymap').width())/2);
  if( $('#myrange:visible').length )
    $('#myrange').hide();
});