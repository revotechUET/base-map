var componentName = "googleMapView";
module.exports.name = componentName;
require("./google-map-view.less");

var app = angular.module(componentName, ["ngDialog"]);

app.component(componentName, {
  template: require("./google-map-view.html"),
  controller: googleMapViewController,
  controllerAs: "self",
  bindings: {
    wells: "<",
    zoneMap: "<"
  },
  transclude: true
});

function googleMapViewController($scope, $timeout, ngDialog) {
  let self = this;
  let map;
  let markers = [];


  this.$onInit = function () {
    $timeout(function () {
      drawMap();
      console.log('Draw map')
    }, 10);
    $scope.$watch(
      function () {
        return [self.wells];
      },
      function () {
        drawMarkers();
        console.log(self.wells)
      },
      true
    );
  };

 
  // SHOW MAP
  function drawMap() {
    map = new google.maps.Map(document.getElementById('map'), {zoom: 4, center: {lat: 21.344, lng: 107.036}});
  }

  // SHOW MARKER
  function drawMarkers() {
    let firstProjection = self.zoneMap;
    let secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
    console.log(self.wells)
    if (self.zoneMap) {
      // markers.length = 0;
      if (!(self.wells || []).length) return 0;
      for (let index = 0; index < self.wells.length; index++) {
        let lat = getLat(self.wells[index].well_headers);
        let long = getLong(self.wells[index].well_headers);
        let x = getX(self.wells[index].well_headers);
        let y = getY(self.wells[index].well_headers);
        let latX = proj4(firstProjection, secondProjection, [x, y])[1];
        let lngY = proj4(firstProjection, secondProjection, [x, y])[0];
        let aMarker;
        if (checkCoordinate(lat, long, x, y) === true) {
          aMarker = new google.maps.Marker({position: {lat: lat, lng: long}, map: map});
        }
        else if (checkCoordinate(lat, long, x, y) === false) {
          aMarker = new google.maps.Marker({position: {lat: latX, lng: lngY}, map: map});
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

function getLat(wellIndex, forceFromHeader=false) {
  const wellInfo = wellIndex.find(wellHeader => wellHeader.header == "WELL");
  if (!forceFromHeader && self.focusMarkerOrZone) {
    if (wellInfo && coordinateHash[wellInfo.idWell] && coordinateHash[wellInfo.idWell].lat)
      return coordinateHash[wellInfo.idWell].lat;
    else return null;
  }

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

function getLong(wellIndex, forceFromHeader=false) {
  const wellInfo = wellIndex.find(wellHeader => wellHeader.header == "WELL");
  if (!forceFromHeader && self.focusMarkerOrZone) {
    if (wellInfo && coordinateHash[wellInfo.idWell] && coordinateHash[wellInfo.idWell].lng)
      return coordinateHash[wellInfo.idWell].lng;
    else return null;
  }

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

function getX(wellIndex, forceFromHeader=false) {
  const wellInfo = wellIndex.find(wellHeader => wellHeader.header == "WELL");
  if (!forceFromHeader && self.focusMarkerOrZone) {
    if (wellInfo && coordinateHash[wellInfo.idWell] && coordinateHash[wellInfo.idWell].x)
      return coordinateHash[wellInfo.idWell].x;
    else return -1;
  }

  if (!(wellIndex || []).length) return 0;
  for (let index = 0; index < wellIndex.length; index++) {
    if (wellIndex[index].header === "X") {
      return Number(wellIndex[index].value);
    }
  }
  return 0;
}

function getY(wellIndex, forceFromHeader=false) {
  const wellInfo = wellIndex.find(wellHeader => wellHeader.header == "WELL");
  if (!forceFromHeader && self.focusMarkerOrZone) {
    if (wellInfo && coordinateHash[wellInfo.idWell] && coordinateHash[wellInfo.idWell].y)
      return coordinateHash[wellInfo.idWell].y;
    else return -1;
  }

  if (!(wellIndex || []).length) return 0;
  for (let index = 0; index < wellIndex.length; index++) {
    if (wellIndex[index].header === "Y") {
      return Number(wellIndex[index].value);
    }
  }
  return 0;
}
}

function ConvertDMSToDD(input) {
  let parts = input.split(/[^\d+(\,\d+)\d+(\.\d+)?\w]+/);
  let degrees = parseFloat(parts[0]);
  let minutes = parseFloat(parts[1]);
  let seconds = parseFloat(parts[2].replace(",", "."));
  let direction = parts[3];
  let dd = degrees + minutes / 60 + seconds / (60 * 60);
  if (
    direction == "S" ||
    direction == "South" ||
    direction == "W" ||
    direction == "West"
  ) {
    dd = dd * -1;
  }
  return dd;
}
