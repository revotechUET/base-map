var componentName = 'mapView';
module.exports.name = componentName;
require('./map-view.less');
var app = angular.module(componentName, []);

app.component(componentName, {
  template: require('./map-view.html'),
  controller: mapViewController,
  controllerAs: 'self',
  bindings: {
    wells: "<",
    mapboxToken: "@",
    focusWell: '<',
    zoneMap: "<"
  },
  transclude: true
});

function mapViewController($scope, $timeout) {

  let self = this;
  let map;
  let draw;
  let changeStyle = 0;
  let markers = [];
  let popups = [];
  self.allPopup = true;
  let zoneLine = {
    "id": "lines",
    "type": "line",
    "source": {
      "type": "geojson",
      "data": {
        "type": "FeatureCollection",
        "features": [{
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, -80], [180, -80]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, -72], [180, -72]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, -64], [180, -64]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, -56], [180, -56]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, -48], [180, -48]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, -40], [180, -40]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, -32], [180, -32]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, -24], [180, -24]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, -16], [180, -16]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, -8], [180, -8]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 0], [180, 0]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 84], [180, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 80], [180, 80]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 72], [180, 72]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 64], [180, 64]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 56], [180, 56]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 48], [180, 48]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 40], [180, 40]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 32], [180, 32]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 24], [180, 24]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 16], [180, 16]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, 8], [180, 8]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [0, -80], [0, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [6, -80], [6, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [12, -80], [12, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [18, -80], [18, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [24, -80], [24, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [30, -80], [30, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [36, -80], [36, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [42, -80], [42, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [48, -80], [48, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [54, -80], [54, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [60, -80], [60, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [66, -80], [66, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [72, -80], [72, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [78, -80], [78, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [84, -80], [84, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [90, -80], [90, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [96, -80], [96, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [102, -80], [102, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [108, -80], [108, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [114, -80], [114, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [120, -80], [120, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [126, -80], [126, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [132, -80], [132, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [138, -80], [138, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [144, -80], [144, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [150, -80], [150, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [156, -80], [156, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [162, -80], [162, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [168, -80], [168, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [174, -80], [174, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [180, -80], [180, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-6, -80], [-6, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-12, -80], [-12, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-18, -80], [-18, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-24, -80], [-24, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-30, -80], [-30, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-36, -80], [-36, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-42, -80], [-42, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-48, -80], [-48, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-54, -80], [-54, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-60, -80], [-60, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-66, -80], [-66, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-72, -80], [-72, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-78, -80], [-78, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-84, -80], [-84, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-90, -80], [-90, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-96, -80], [-96, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-102, -80], [-102, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-108, -80], [-108, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-114, -80], [-114, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-120, -80], [-120, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-126, -80], [-126, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-132, -80], [-132, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-138, -80], [-138, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-144, -80], [-144, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-150, -80], [-150, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-156, -80], [-156, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-162, -80], [-162, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-168, -80], [-168, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-174, -80], [-174, 84]
            ]
          }
        }, {
          "type": "Feature",
          "properties": {
            "color": "#0077be"
          },
          "geometry": {
            "type": "LineString",
            "coordinates": [
              [-180, -80], [-180, 84]
            ]
          }
        }]
      }
    },
    "paint": {
      "line-width": 1,
      "line-color": ["get", "color"]
    }
  };

  this.$onInit = function () {
    self.activeTheme = 'theme1';
    $timeout(function () {
      drawMap();
      // console.log('Draw map')
    }, 1000);
    $scope.$watch(function () {
      return [self.wells, changeStyle];
    }, function () {
      drawMarkers();
    }, true);
    $scope.$watch(function () {
      return [self.mapboxToken, self.zoneMap];
    }, function () {
      drawMarkersDebounced();
    }, true);
    $scope.$watch(function () {
      return [self.focusWell];
    }, function () {
      focusWell();
    }, true);
    $scope.$watch(function () {
      return [self.allPopup];
    }, function () {
      showAllPopup(self.allPopup);
    }, true);
  }

  var drawMarkersDebounced = _.debounce(drawMarkers, 100);
  // SHOW MAP
  function drawMap() {
    mapboxgl.accessToken = self.mapboxToken;
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v10',
      center: [101, 21.13],
      zoom: 5,
    });
    map.addControl(new mapboxgl.FullscreenControl());
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    }));
    //Deep ocean
    // map.on('load', function() {

    //   map.addSource('10m-bathymetry-81bsvj', {
    //   type: 'vector',
    //   url: 'mapbox://mapbox.9tm8dx88'
    //   });

    //   map.addLayer({
    //   "id": "10m-bathymetry-81bsvj",
    //   "type": "fill",
    //   "source": "10m-bathymetry-81bsvj",
    //   "source-layer": "10m-bathymetry-81bsvj",
    //   "layout": {},
    //   "paint": {
    //   "fill-outline-color": "hsla(337, 82%, 62%, 0)",
    //   "fill-color": [ "interpolate",
    //   [ "cubic-bezier",
    //   0, 0.5,
    //   1, 0.5 ],
    //   ["get", "DEPTH"],
    //   200,  "#78bced",
    //   9000, "#15659f"
    //   ]
    //   }
    //   }, 'land-structure-polygon');
    //   });

    //draw line
    draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      }
    });
    map.addControl(draw);
    map.on('draw.create', updateArea);
    map.on('draw.delete', updateArea);
    map.on('draw.update', updateArea);

    function updateArea(e) {
      var data = draw.getAll();
      var answer = document.getElementById('calculated-area');
      if (data.features.length > 0) {
        var area = turf.area(data);
        console.log(turf);
        // restrict to area to 2 decimal points
        var rounded_area = Math.round(area * 100) / 100;
        answer.innerHTML = '<p><strong>' + rounded_area + '</strong></p><p>square meters</p>';
      } else {
        answer.innerHTML = '';
        if (e.type !== 'draw.delete') alert("Use the draw tools to draw a polygon!");
      }
    }
    // Show ZoneLine
    map.on('load', function () {
      map.addLayer(zoneLine);
    });

    // show marker default
    // let popupMarkerDrag = new mapboxgl.Popup({
    //   closeOnClick: false,
    //   offset: 25,
    //   closeButton: false,
    // })
    //   .setText("Drag Marker")
    //   .addTo(map);
    // let markerDrag = new mapboxgl.Marker({
    //   draggable: true
    // })
    //   .setPopup(popupMarkerDrag)
    //   .setLngLat([105.89, 20.99])
    //   .addTo(map);

    // function onDragEnd() {
    //   var lngLat = markerDrag.getLngLat();
    //   coordinates.style.display = 'block';
    //   coordinates.innerHTML = 'Longitude: ' + lngLat.lng + '<br />Latitude: ' + lngLat.lat;
    // }

    // markerDrag.on('dragend', onDragEnd);
  }
  // CHANGE STYLE
  this.changeStyleMap1 = function () {
    changeStyle = changeStyle + 1;
    map.setStyle('mapbox://styles/mapbox/light-v10');
  }
  this.changeStyleMap2 = function () {
    changeStyle = changeStyle + 1;
    map.setStyle('mapbox://styles/mapbox/streets-v11');
  }
  this.changeStyleMap3 = function () {
    changeStyle = changeStyle + 1;
    map.setStyle('mapbox://styles/mapbox/satellite-v9');
  }
  this.changeStyleMap4 = function () {
    changeStyle = changeStyle + 1;
    map.setStyle('mapbox://styles/mapbox/dark-v10');
  }

  //SHOW ALL POPOUP
  function showAllPopup(check) {
    if (check) {
      let firstProjection = self.zoneMap;
      let secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
      for (let index = 0; index < popups.length; index++) {
        popups[index].remove();
      }
      if (self.zoneMap) {
        popups.length = 0;
        if (!(self.wells || []).length) return 0;
        for (let index = 0; index < self.wells.length; index++) {
          let lat = getLat(self.wells[index].well_headers);
          let long = getLong(self.wells[index].well_headers);
          let x = getX(self.wells[index].well_headers);
          let y = getY(self.wells[index].well_headers);
          let latX = proj4(firstProjection, secondProjection, [x, y])[1];
          let lngY = proj4(firstProjection, secondProjection, [x, y])[0];
          if (checkCoordinate(lat, long, x, y) === true) {
            popups.push(new mapboxgl.Popup({
              closeOnClick: true,
              offset: 25,
              closeButton: false,
            })
              .setLngLat([long, lat])
              .setText(self.wells[index].name)
              .addTo(map));
          } else if (checkCoordinate(lat, long, x, y) === false) {
            popups.push(new mapboxgl.Popup({
              closeOnClick: true,
              offset: 25,
              closeButton: false,
            })
              .setLngLat([lngY, latX])
              .setText(self.wells[index].name)
              .addTo(map));
          }
        }
      }
    } else {
      for (let index = 0; index < popups.length; index++) {
        popups[index].remove();
      }
    }
  }

  // SHOW POPUP
  function focusWell() {
    for (let index = 0; index < popups.length; index++) {
      popups[index].remove();
    }
    let firstProjection = self.zoneMap;
    let secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
    if (self.zoneMap) {
      popups.length = 0;
      let lat = getLat(self.focusWell.well_headers);
      let long = getLong(self.focusWell.well_headers);
      let x = getX(self.focusWell.well_headers);
      let y = getY(self.focusWell.well_headers);
      let latX = proj4(firstProjection, secondProjection, [x, y])[1];
      let lngY = proj4(firstProjection, secondProjection, [x, y])[0];

      if (checkCoordinate(lat, long, x, y) === true) {
        map.flyTo({
          center: [long - 0.006, lat],
          zoom: 15,
          pitch: 60
        });
        popups.push(new mapboxgl.Popup({
          closeOnClick: true,
          offset: 25,
          closeButton: false,
        })
          .setLngLat([long, lat])
          .setText(String(self.focusWell.name))
          .addTo(map));
      } else if (checkCoordinate(lat, long, x, y) === false) {
        map.flyTo({
          center: [lngY - 0.006, latX],
          zoom: 15,
          pitch: 60
        });
        popups.push(new mapboxgl.Popup({
          closeOnClick: true,
          offset: 25,
          closeButton: false,
        })
          .setLngLat([lngY, latX])
          .setText(String(self.focusWell.name))
          .addTo(map));
      }
    } else {
      // console.log(self.zoneMap);
    }

  }
  // SHOW MARKER
  function drawMarkers() {
    let firstProjection = self.zoneMap;
    let secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
    for (let index = 0; index < popups.length; index++) {
      popups[index].remove();
    }
    for (let index = 0; index < markers.length; index++) {
      markers[index].remove();
    }

    if (self.zoneMap) {
      markers.length = 0;
      popups.length = 0;
      if (!(self.wells || []).length) return 0;
      for (let index = 0; index < self.wells.length; index++) {
        let lat = getLat(self.wells[index].well_headers);
        let long = getLong(self.wells[index].well_headers);
        let x = getX(self.wells[index].well_headers);
        let y = getY(self.wells[index].well_headers);
        let latX = proj4(firstProjection, secondProjection, [x, y])[1];
        let lngY = proj4(firstProjection, secondProjection, [x, y])[0];
        let popup = new mapboxgl.Popup({
          closeOnClick: true,
          offset: 25,
          closeButton: false
        })
          .setText(self.wells[index].name);
        if (checkCoordinate(lat, long, x, y) === true) {
          markers.push(new mapboxgl.Marker()
            .setLngLat([long, lat])
            .setPopup(popup)
            .addTo(map));
          map.flyTo({
            center: [long - 4, lat],
            zoom: 5
          });
        } else if (checkCoordinate(lat, long, x, y) === false) {
          markers.push(new mapboxgl.Marker()
            .setLngLat([lngY, latX])
            .setPopup(popup)
            .addTo(map));
          map.flyTo({
            center: [lngY - 4, latX],
            zoom: 5
          });
        }
      }
    } else {
      // console.log(self.zoneMap);
      // window.alert("Please select zone!");

    }
    showAllPopup(self.allPopup);
  }
}

function checkCoordinate(lat, long, x, y) {
  if ((!lat || !long) && (x && y)) {
    return false;
  } else if ((!lat || !long) && (!x || !y)) {
    return undefined;
  }
  return true;
}

function getLat(wellIndex) {
  if (!(wellIndex || []).length) return 0;
  for (let index = 0; index < wellIndex.length; index++) {
    if (wellIndex[index].header === "LATI") {
      if (isNaN(wellIndex[index].value)) {
        return Number(ConvertDMSToDD(wellIndex[index].value));
      }
      return Number(wellIndex[index].value);
    }
  }
  return 0;
}

function getLong(wellIndex) {
  if (!(wellIndex || []).length) return 0;
  for (let index = 0; index < wellIndex.length; index++) {
    if (wellIndex[index].header === "LONG") {
      if (isNaN(wellIndex[index].value)) {
        return Number(ConvertDMSToDD(wellIndex[index].value));
      }
      return Number(wellIndex[index].value);
    }
  }
  return 0;
}

function getX(wellIndex) {
  if (!(wellIndex || []).length) return 0;
  for (let index = 0; index < wellIndex.length; index++) {
    if (wellIndex[index].header === "X") {
      return Number(wellIndex[index].value);
    }
  }
  return 0;
}

function getY(wellIndex) {
  if (!(wellIndex || []).length) return 0;
  for (let index = 0; index < wellIndex.length; index++) {
    if (wellIndex[index].header === "Y") {
      return Number(wellIndex[index].value);
    }
  }
  return 0;
}

function ConvertDMSToDD(input) {
  let parts = input.split(/[^\d+(\,\d+)\d+(\.\d+)?\w]+/);
  let degrees = parseFloat(parts[0]);
  let minutes = parseFloat(parts[1]);
  let seconds = parseFloat(parts[2].replace(',', '.'));
  let direction = parts[3];
  let dd = degrees + minutes / 60 + seconds / (60 * 60);
  if (direction == 'S' || direction == 'South' || direction == 'W' || direction == 'West') {
    dd = dd * -1;
  }
  return dd;
}
