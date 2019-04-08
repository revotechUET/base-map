var componentName = 'mapView';
module.exports.name = componentName;
require('./map-view.css');

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

function mapViewController($scope) {

  let self = this;
  let map;
  let markers = [];
  let styleNumber = 1;
  let popups = [];

  this.$onInit = function () {
    drawMap();
    $scope.$watch(function () {
      return [self.wells, self.mapboxToken, self.zoneMap];
    }, function () {
      drawMarkersDebounced();
    }, true);
    $scope.$watch(function () {
      return [self.focusWell];
    }, function () {
      focusWell();
    }, true);
  }

  var drawMarkersDebounced = _.debounce(drawMarkers, 100);

  function drawMap() {
    mapboxgl.accessToken = self.mapboxToken;
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v10',
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

  }
  this.changeStyleMap = function () {
    if (styleNumber === 1) {
      map.setStyle('mapbox://styles/mapbox/dark-v10');
      console.log("Change style dark map");
      styleNumber = styleNumber + 1;
    } else if (styleNumber === 2) {
      map.setStyle('mapbox://styles/mapbox/streets-v11');
      console.log("Change style streets map");
      styleNumber = styleNumber + 1;
    } else if (styleNumber === 3) {
      map.setStyle('mapbox://styles/mapbox/satellite-v9');
      console.log("Change style satellite map");
      styleNumber = styleNumber + 1;
    } else if (styleNumber === 4) {
      map.setStyle('mapbox://styles/mapbox/light-v10');
      console.log("Change style light map");
      styleNumber = 1;
    }
    console.log(styleNumber);
  }

  function focusWell() {
    for (let index = 0; index < popups.length; index++) {
      popups[index].remove();
    }
    let firstProjection = self.zoneMap;
    let secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
    let lat = getLat(self.focusWell.well_headers);
    let long = getLong(self.focusWell.well_headers);
    let x = getX(self.focusWell.well_headers);
    let y = getY(self.focusWell.well_headers);
    let latX = proj4(firstProjection, secondProjection, [x, y])[1];
    let lngY = proj4(firstProjection, secondProjection, [x, y])[0];

    if (checkCoordinate(lat, long, x, y) === true) {
      popups.push(new mapboxgl.Popup({
          closeOnClick: true,
          offset: 25,
          closeButton: false,
        })
        .setLngLat([long, lat])
        .setText(String(self.focusWell.name))
        .addTo(map));
    } else if (checkCoordinate(lat, long, x, y) === false) {
      popups.push(new mapboxgl.Popup({
          closeOnClick: true,
          offset: 25,
          closeButton: false,
        })
        .setLngLat([lngY, latX])
        .setText(String(self.focusWell.name))
        .addTo(map));
    }
  }

  function drawMarkers() {
    let firstProjection = self.zoneMap;
    let secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
    for (let index = 0; index < markers.length; index++) {
      markers[index].remove();
    }
    for (let index = 0; index < popups.length; index++) {
      popups[index].remove();
    }

    if (self.zoneMap) {
      markers.length = 0;
      popups.length = 0;
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
        } else if (checkCoordinate(lat, long, x, y) === false) {

          markers.push(new mapboxgl.Marker()
            .setLngLat([lngY, latX])
            .addTo(map));
        }
      }
    } else {
      console.log(self.zoneMap);
      window.alert("Please select zone!");
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