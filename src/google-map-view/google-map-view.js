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
    // contour
    focusCurve: "<",
    getCurveInfoFn: "<",
    showContour: "<",
    // view by marker or zone
    getCurveRawDataFn: "<",
    focusMarkerOrZone: "<",
    zoneDepthSpec: '<',
    // draw geojson objects
    geoJson: '<',
  },
  transclude: true
});

const ZONE_DEPTH_SPEC_MAP = {
  'zone-top': 'startDepth',
  'zone-bottom': 'endDepth'
}

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

    // CONTOUR
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

    // VIEW BY ZONESET & MARKERSET
    $scope.$watch(
      () => self.focusMarkerOrZone,
      () => {
        updateCoordinateTable();
      }
    )
    $scope.$watch(
      () => self.zoneDepthSpec,
      () => {
        updateCoordinateTable();
      }
    )
    
    //DRAW GEOJSON OBJECT
    $scope.$watch(
      () => self.geoJson,
      () => {
        drawGeoJson(self.geoJson);
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

    // remove all previous markers
    for (let marker of Object.values(markers)) {
      marker.setMap(null);
      delete marker;
    }

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
        if (aMarker) {
          markers[self.wells[index].idWell] = aMarker;
        }
      }
    }
  }
  // ================== DRAWING GEOJSON DATA ===================
  function drawGeoJson(geojson) {
    // remove previous geojson data
    map.data.forEach(feature => {
      map.data.remove(feature);
    })
    map.data.setStyle({
      fillColor: 'green',
      strokeWeight: 1,
      strokeOpacity: 0.5,
      fillOpacity: 0.5
    })
    map.data.setStyle(feature => {
      console.log(feature);
      return {
        title: 'abc',
        fillColor: 'green',
        strokeWeight: 1,
        strokeOpacity: 0.5,
        fillOpacity: 0.5
       };
    })
    map.data.addGeoJson(geojson);
  }

  // ===================== DRAWING BY ZONE AND MARKER SET ===================
  let coordinateHash = {};
  const alertDebounce = _.debounce(function(message) {
    ngDialog.open({
      template: "templateError",
      className: "ngdialog-theme-default",
      scope: Object.assign($scope.$new(), { message: message})
    })
  }, 1000);
  function updateCoordinateTable() {
    async.eachSeries(self.wells, (well, next) => {
      getCoordFromCurve(well)
        .then(coord => {
          coordinateHash[well.idWell] = coord;
          console.log(coord);
          next();
        })
    }, () => {
      drawMarkers();
      // drawMarkersDebounced();
    })
  }
  async function getCoordFromCurve(well) {
    const focusedMZ = self.focusMarkerOrZone;
    if (!focusedMZ) {
      return;
    }
    let depth = null;
    if (focusedMZ.idZone) {
      const matchZoneset = well.zone_sets.find(zs => zs.name == focusedMZ.zonesetName);
      if (matchZoneset) {
        const matchZone = matchZoneset.zones.find(z => z.zone_template.name == focusedMZ.name);
        if (matchZone)
          if(self.zoneDepthSpec == 'zone-middle') {
            depth = (matchZone.startDepth + matchZone.endDepth) / 2;
          } else {
            depth = matchZone[ZONE_DEPTH_SPEC_MAP[self.zoneDepthSpec || 'zone-top']];
          }
      }
    } else if (focusedMZ.idMarker) {
      const matchMarkerset = well.marker_sets.find(ms => ms.name == focusedMZ.markersetName);
      if (matchMarkerset) {
        const matchMarker = matchMarkerset.markers.find(m => m.marker_template.name == focusedMZ.name);
        if (matchMarker)
          depth = matchMarker.depth;
      }
    }
    let x, y;
    let lat, lng;
    if (_.isFinite(depth)) {
      const indexDataset = well.datasets.find(ds => ds.name == "INDEX");
      if (indexDataset) {
        const xOffsetCurve = indexDataset.curves.find(c => c.idFamily == 762)
        const yOffsetCurve = indexDataset.curves.find(c => c.idFamily == 764)

        if (xOffsetCurve && yOffsetCurve) {
          const top = Number(indexDataset.top);
          const step = Number(indexDataset.step);
          const xOffsetData = await new Promise((res) => {
            self.getCurveRawDataFn(xOffsetCurve.idCurve, (err, data) => {
              res(data.map(d => Object.assign(d, {depth: top + step * d.y})).filter(d => _.isFinite(d.x)));
            });
          });
          const yOffsetData =  await new Promise((res) => {
            self.getCurveRawDataFn(yOffsetCurve.idCurve, (err, data) => {
              res(data.map(d => Object.assign(d, {depth: top + step * d.y})).filter(d => _.isFinite(d.x)));
            });
          });

          if (xOffsetData.length && yOffsetData.length) {
            const firstProjection = self.zoneMap;
            const secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";

            const _lat = getLat(well.well_headers, true);
            const _lng = getLong(well.well_headers, true);
            const _x = getX(well.well_headers, true);
            const _y = getY(well.well_headers, true);

            const xUpperBoundIdx = xOffsetData.findIndex(datum => datum.depth >= depth);
            const xUpperBound = xOffsetData[xUpperBoundIdx];
            const xLowerBound = xOffsetData[xUpperBoundIdx - 1];

            // calculate x, y offsets
            let _xOffset, _yOffset;
            if (xLowerBound) 
              _xOffset = d3.scaleLinear().domain([xLowerBound.depth, xUpperBound.depth]).range([xLowerBound.x, xUpperBound.x])(depth);
            else
              _xOffset = (xUpperBound || xOffsetData[xOffsetData.length - 1]).x;

            const yUpperBoundIdx = yOffsetData.findIndex(datum => datum.depth  >=depth);
            const yUpperBound = yOffsetData[yUpperBoundIdx];
            const yLowerBound = yOffsetData[yUpperBoundIdx - 1];

            if (yLowerBound)
              _yOffset = d3.scaleLinear().domain([yLowerBound.depth, yUpperBound.depth]).range([yLowerBound.x, yUpperBound.x])(depth);
            else
              _yOffset = (yUpperBound || yOffsetData[yOffsetData.length - 1]).x;


            const _checkCoordResult = checkCoordinate(_lat, _lng, _x, _y);
            if (_checkCoordResult== true) {
              // calculate new lat/lng, x/y from x, y offset
              const zeroProject = proj4(firstProjection, secondProjection, [0, 0]);
              const offsetProject = proj4(firstProjection, secondProjection, [_xOffset, _yOffset]);
              lat = _lat + (offsetProject[1] - zeroProject[1]);
              lng = _lng + (offsetProject[0] - zeroProject[0]);
              const revertPrj = proj4(secondProjection, firstProjection, [lng, lat]);
              x = revertPrj[0];
              y = revertPrj[1];
            } else if (_checkCoordResult == false) {
              // calculate new lat/lng from new x, y
              x = _x + _xOffset;
              y = _y + _yOffset;
              const prjResult = proj4(firstProjection, secondProjection, [x, y]);
              lat = prjResult[1];
              lng = prjResult[0];

            }
          }
        } else {
          console.warn(`Cannot find XOFFSET or YOFFSET curve in INDEX dataset of well ${well.name}`);
        alertDebounce(`Cannot find XOFFSET or YOFFSET curve in INDEX dataset of well ${well.name}`);
        }
      } else {
        console.warn(`Cannot find INDEX dataset in well ${well.name}`);
        alertDebounce(`Cannot find INDEX dataset in well ${well.name}`);
      }
    }
    return { x, y, lat, lng };
  }
  // ====================== END DRAWING BY ZONE AND MARKER SET ====================

  // ======================= DRAWING CONTOUR ===========================
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
  const _contourData = [];
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
      _contourData.length = 0;
      _data.forEach(d => _contourData.push(d));
    }
    return _contourData;
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
  // =================== END DRAWING CONTOUR =========================

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
