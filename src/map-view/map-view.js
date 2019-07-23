var componentName = 'mapView';
module.exports.name = componentName;
require('./map-view.less');
const zoneName = require('./zone-name.json')
const zoneLine = require('./zone-line.json')

var app = angular.module(componentName, []);

app.component(componentName, {
  template: require('./map-view.html'),
  controller: mapViewController,
  controllerAs: 'self',
  bindings: {
    wells: "<",
    mapboxToken: "@",
    focusWell: '<',
    zoneMap: "<",
    allPopup: "<",
    theme: "<",
    controlPanel: "<",
    deepOcean: "<",
    point: '<'
  },
  transclude: true
});

function mapViewController($scope, $timeout) {

  let self = this;
  let map;
  let draw;
  // let changeStyle = 0;
  let markers = [];
  let popups = [];
  

  this.$onInit = function () {
    $timeout(function () {
      drawMap();
      // console.log('Draw map')
    }, 1000);
    $scope.$watch(function () {
      return [self.controlPanel];
    }, function () {
      showControl();
    }, true);
    $scope.$watch(function () {
      return [self.point];
    }, function () {
      showPointLocation();
    }, true);
    // $scope.$watch(function () {
    //   return [self.deepOcean];
    // }, function () {
    //   drawMap();
    // }, true);
    $scope.$watch(function () {
      return [self.wells, self.theme];
    }, function () {
      changeStyleMap(self.theme);
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
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [101, 21.13],
      zoom: 5,
      minZoom: 2
    });
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    }));

    //Deep ocean
    if (self.deepOcean) {
      map.on('load', function () {
        map.addSource('10m-bathymetry-81bsvj', {
          type: 'vector',
          url: 'mapbox://mapbox.9tm8dx88'
        });
      });
      map.on('load', function () {
        map.addLayer({
          "id": "10m-bathymetry-81bsvj",
          "type": "fill",
          "source": "10m-bathymetry-81bsvj",
          "source-layer": "10m-bathymetry-81bsvj",
          "layout": {},
          "paint": {
            "fill-outline-color": "hsla(337, 82%, 62%, 0)",
            "fill-color": ["interpolate",
              ["cubic-bezier",
                0, 0.5,
                1, 0.5],
              ["get", "DEPTH"],
              200, "#78bced",
              9000, "#15659f"
            ]
          }
        }, 'land-structure-polygon');
      });
    }

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
    map.on('load', function () {
      map.addSource('clusters', {
        type: "geojson",
        data: zoneName
      }
      );

      map.addLayer({
        "id": "clusters",
        "type": "circle",
        "source": "clusters",
        "paint": {
          "circle-radius": 18,
          "circle-color": "#4085ff",
          "circle-opacity": 0
        }
      });

      map.addLayer({
        "id": "clusters-label",
        "type": "symbol",
        "source": "clusters",
        "paint": {
          "text-opacity": 0.5,
          "text-color": "#4085ff"
        },
        "layout": {
          "text-field": "{museum_count}",
          "text-font": [
            "DIN Offc Pro Medium",
            "Arial Unicode MS Bold"
          ],
          "text-size": 12
        }
      });
    });

    // show point

    map.on('mousemove', function (e) {
      document.getElementById('latPoint').innerHTML = e.lngLat.lat.toFixed(3);
      document.getElementById('lngPoint').innerHTML = e.lngLat.lng.toFixed(3);
      document.getElementById('displayX').innerHTML = e.point.x;
      document.getElementById('displayY').innerHTML = e.point.y;

    });
  }
  // CHANGE STYLE
  function changeStyleMap(theme) {
    // CHANGE STYLE
    if (theme === 1) {
      map.setStyle('mapbox://styles/mapbox/light-v10');
    }
    else if (theme === 2) {
      map.setStyle('mapbox://styles/mapbox/satellite-v9');
    }
    else if (theme === 3) {
      map.setStyle('mapbox://styles/mapbox/streets-v11');
    }
    else if (theme === 4) {
      map.setStyle('mapbox://styles/mapbox/dark-v10');
    }
    else if (theme === 5) {
      map.setStyle('mapbox://styles/k54hungyb/cjybozeuz1fu21cocakatd2cm');
    }
    else if (theme === 6) {
      map.setStyle('mapbox://styles/mapbox/streets-v11');
    }
  }

  //SHOW CONTROL
  function showControl() {
    $(".mapboxgl-ctrl-top-right").toggleClass('showControl');
  }

  //SHOW point location
  function showPointLocation() {
    $(".controlPanel").toggleClass('showControl');
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
