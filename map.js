var ingr, geoc, target = '*', lastd;

window.oncontextmenu = function(){return false};

function _ob(id){return document.getElementById(id);}

function initialize() {
   if( !window.google || !window.google.maps ) {
     return parent.postMessage('map-failed', target);
   }
   try{
     var mapOptions = {
       center: new google.maps.LatLng(22.528176,113.928448),
       zoom: 12,
       mapTypeId: google.maps.MapTypeId.HYBRID
     };
     ingr = new google.maps.Map(_ob("mindon_ingr_map"),
         mapOptions);

     geoc = new google.maps.Geocoder();
     _ob('myquery').style.display = 'block';
    
     parent.postMessage('map-ready', target);

     _ob('mysearch').onclick = function(){
       _ob('myerr').innerHTML = '';
       var val = _ob('mycity').value;
       if(/^\s*$/.test(val)) {
         return _ob('mycity').focus();
       }
       geoc.geocode( { 'address': val}, function(results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
            ingr.setCenter(results[0].geometry.location);
            var marker = new google.maps.Marker({
              map: ingr,
              position: results[0].geometry.location
            });
          } else {
            _ob('myerr').innerHTML = 'Failed to locate';
          }
        });
     };
     _ob('mycity').onkeypress = function(e){
      if( e.keyCode == 13 ) {
        _ob('mysearch').onclick();
      }
     };
   } catch(e){
     return parent.postMessage('map-failed', target);
   }
}

var marker;
window.addEventListener('message', function(event) {

  var d = event.data;
  if( !ingr || !window.google || !google.maps ) {
    if( d && d.x !== undefined )
      lastd = d;

    if( lastd && lastd.lvi ) {
      lvi = lastd.lvi;
      delete lastd.lvi;
    }
    return event.source.postMessage('map-failed', target);
  }

  if( d === 'BOUNDS' ) {
    event.source.postMessage( {bounds: ingr.getBounds(), center: ingr.getCenter(), zoom: ingr.getZoom()}, target );
    return true;
  }

  if( d && d.key ) {
    var job = document.createElement('script');
    job.onload = function(){
      if( window.google && window.google.maps ) {
        initialize();
        lastd && process( lastd );
        if( ingr ) lastd = null;
      }
    };
    job.src = 'https://maps.googleapis.com/maps/api/js?key='+d.key+'&sensor=true';
    document.body.appendChild( job );
    job = null;
    return true;
  }

  if( !d || d.x === undefined || d.y === undefined)
    return false;
  
  if( d && d.lvi ) {
    lvi = d.lvi;
    delete d.lvi;
  }

  process(d);
});

var lvi = {};

function process(d){
  if( !window.google || !ingr ) {
    return false;
  }
  if( marker )
    marker.setMap(null);

  var myLatlng = new google.maps.LatLng(d.x,d.y);
  var tn = d.team ? d.team.substr(0,1).toLowerCase() : 'n'
    , ico;
  if( tn == 'n' || !lvi[tn] || lvi[tn] === false || !lvi[tn][parseInt(d.level)] ) {
    ico = new google.maps.MarkerImage(lvi[tn] ? tn +'.png' : 'n.png');
  } else {
    ico = lvi[tn][parseInt(d.level)];
  }
  marker = new google.maps.Marker({
      position: myLatlng,
      map: ingr,
      title: d.name || '',
      icon: ico
  });

  if( d.title ) {
    document.getElementById('myquery').style.display = 'none';
    var infowindow = new google.maps.InfoWindow({
        content: '<div style="color:'+(tn=='a'?'#060':(tn=='r'?'#309':'#000'))+'">'+d.title+'</div>'
    });
    infowindow.open(ingr, marker);
    ingr.setZoom( d.zoom || 18 );

    google.maps.event.addListener(marker, 'click', function() {
      infowindow.open(ingr, marker);
    });
  } else {
    document.getElementById('myquery').style.display = '';
    ingr.setZoom( d.zoom || 12 );
  }

  ingr.setCenter( myLatlng );
}