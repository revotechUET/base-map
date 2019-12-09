var componentName = "googleMapView";
module.exports.name = componentName;
require("./google-map-view.less");

var app = angular.module(componentName, ["ngDialog"]);
const Contour = require("../contour");

app.component(componentName, {
  template: require("./google-map-view.html"),
  controller: googleMapViewController,
  controllerAs: "self",
  bindings: {
    wells: "<",
    zoneMap: "<",
    focusCurve: "<",
    getCurveInfoFn: "<",
    showContour: "<",
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
      initContours();
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
    $scope.$watch(
      () => self.focusCurve,
      () => {
        updateContours();
      }
    );
    $scope.$watch(
      () => self.showContour,
      () => {
        updateContours();
      }
    );
  };

 
  // SHOW MAP
  function drawMap() {
    map = new google.maps.Map(document.getElementById('map'), {zoom: 4, center: {lat: 21.344, lng: 107.036}});
    window.mapView = map;
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

  let contour = null;
  function initContours() {
    contour = new Contour("#contour-map-container", map, []);
    google.maps.event.addListener(map, 'bounds_changed', function() {
      contour.drawContourDebounced();
    }) 
    window._contour = contour;
  }
  const updateContours = _.debounce(_updateContours, 100);
  async function _updateContours() {
    if (!map) return;
    if (!self.showContour) {
      contour.data = [];
      return;
    }
    if (contour) {
      contour.data = await genContourData();
    }
  }
  const data = [];
  async function genContourData() {
    const _data = [];
    let firstProjection = self.zoneMap;
    let secondProjection =
      "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
    if (self.zoneMap) {
      if ((self.wells || []).length) {
        for (let index = 0; index < self.wells.length; index++) {
          let lat = getLat(self.wells[index].well_headers);
          let long = getLong(self.wells[index].well_headers);
          let x = getX(self.wells[index].well_headers);
          let y = getY(self.wells[index].well_headers);
          let latX = proj4(firstProjection, secondProjection, [x, y])[1];
          let lngY = proj4(firstProjection, secondProjection, [x, y])[0];
          if (checkCoordinate(lat, long, x, y) === true) {
            // use long, lat
            _data.push({
              lng: long,
              lat,
              value: await getWellDataForContour(self.wells[index])
            });
          } else if (checkCoordinate(lat, long, x, y) === false) {
            // use lngY, latX
            _data.push({
              lng: lngY,
              lat: latX,
              value: await getWellDataForContour(self.wells[index])
            });
          }
        }
      }
      data.length = 0;
      _data.forEach(d => data.push(d));
    }
    return data;
  }
  async function getWellDataForContour(well) {
    if (!self.focusCurve) return 0;
    let curve = null;
    for (let dsi = 0; dsi < well.datasets.length; ++dsi) {
      const _ds = well.datasets[dsi];
      curve = _ds.curves.find(
        c => `${_ds.name}.${c.name}` == self.focusCurve.name
      );
      if (curve) break;
    }
    if (!curve) return 0;
    const curveInfo = await new Promise((resolve, reject) => {
      self.getCurveInfoFn(curve.idCurve, function (err, curveInfo) {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(curveInfo);
        }
      });
    });
    if (!self.focusCurve) return 0;
    if (!curveInfo || !curveInfo.DataStatistic) return 0;
    return curveInfo.DataStatistic.meanValue;
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
