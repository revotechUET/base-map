var componentName = 'mapView';
module.exports.name = componentName;
require('./map-view.css');

var app = angular.module(componentName, []);
var firstProjection = "+proj=utm +zone=49 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";
var secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";

app.component(componentName, {
  template: require('./map-view.html'),
  controller: mapViewController,
  controllerAs: 'self',
  bindings: {
    wells: "<",
    mapboxToken: "@"
  },
  transclude: true
});

function mapViewController($scope) {
  let self = this;
  let map;
  let markers = [];
  this.$onInit = function () {
    drawMap();
    $scope.$watch(function () {
      return [self.wells, self.mapboxToken];
    }, function () {
      drawMarkersDebounced();
    }, true);
  }
  var drawMarkersDebounced = _.debounce(drawMarkers, 100);

  function drawMap() {
    mapboxgl.accessToken = self.mapboxToken;
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/outdoors-v11',
      center: [107, 11],
      zoom: 5,
    });
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    }));
    map.on('load', function () {
      map.addSource('10m-bathymetry-81bsvj', {
        type: 'vector',
        url: 'mapbox://mapbox.9tm8dx88'
      });

      map.addLayer({
        "id": "10m-bathymetry-81bsvj",
        "type": "fill",
        "source": "10m-bathymetry-81bsvj",
        "source-layer": "10m-bathymetry-81bsvj",
        "layout": {},
        "paint": {
          "fill-outline-color": "hsla(337, 82%, 62%, 0)",
          // cubic bezier is a four point curve for smooth and precise styling
          // adjust the points to change the rate and intensity of interpolation
          "fill-color": ["interpolate",
            ["cubic-bezier",
              0, 0.5,
              1, 0.5
            ],
            ["get", "DEPTH"],
            200, "#78bced",
            9000, "#15659f"
          ]
        }
      }, 'land-structure-polygon');
    });

  }
  this.switchStyle = function () {
    let styleMap = "light-v10";
    map.setStyle('mapbox://styles/mapbox/' + styleMap);
    console.log("Change style map");
  }

  function draw() {
    drawMap();
    drawMarkers();
  }

  function drawMarkers() {
    for (let index = 0; index < markers.length; index++) {
      markers[index].remove();
    }

    markers.length = 0;
    if (!(self.wells || []).length) return 0;
    for (let index = 0; index < self.wells.length; index++) {
      let lat = getLat(self.wells[index].properties.well_headers);
      let long = getLong(self.wells[index].properties.well_headers);
      let x = getX(self.wells[index].properties.well_headers);
      let y = getY(self.wells[index].properties.well_headers);
      let latX = proj4(firstProjection, secondProjection, [x, y])[1];
      let lngY = proj4(firstProjection, secondProjection, [x, y])[0];

      if (checkCoordinate(lat, long, x, y) === true) {
        markers.push(new mapboxgl.Marker()
          .setLngLat([long, lat])
          .addTo(map));
        map.flyTo({
          center: [long, lat],
          zoom: 12,
          bearing: 0,
          pitch: 60,
          speed: 5,
          curve: 1,
          easing: function (t) {
            return t;
          }
        });
      } else if (checkCoordinate(lat, long, x, y) === false) {
        markers.push(new mapboxgl.Marker()
          .setLngLat([lngY, latX])
          .addTo(map));
        map.flyTo({
          center: [lngY, latX],
          zoom: 9,
          bearing: 0,
          pitch: 60,
          speed: 5,
          curve: 1,
          easing: function (t) {
            return t;
          }
        });
      }
    }
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
  for (let index = 0; index < wellIndex.length; index++) {
    if (wellIndex[index].header === "X") {
      return Number(wellIndex[index].value);
    }
  }
  return 0;
}

function getY(wellIndex) {
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