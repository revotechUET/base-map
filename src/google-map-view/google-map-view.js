var componentName = "googleMapView";
module.exports.name = componentName;
require("./google-map-view.less");
var app = angular.module(componentName, ["ngDialog", "wiToken"]);
const Contour = require("../contour");
const Axes = require("../axes");

app.component(componentName, {
  template: require("./google-map-view.html"),
  controller: googleMapViewController,
  controllerAs: "self",
  bindings: {
    wells: "<",
    zoneMap: "<",
    displayMode: "<",
    controlPanel: "<",
    point: "<",
    theme: "<",
    allPopup: "<",
    focusWell: "<",
    clearClipboardFocusWell: "<",
    prepareWellInfoFn: "<",
    // contour
    focusCurve: "<",
    getCurveInfoFn: "<",
    showContour: "<",
    showContourText: "<",
    showContourStroke: "<",
    contourTransparency: "<",
    contourStep: "<",
    // view by marker or zone
    getCurveRawDataFn: "<",
    focusMarkerOrZone: "<",
    zoneDepthSpec: '<',
    wellPosition: '<',
    // draw geojson objects
    geoJson: '<',
    // draw trajectory map
    showTrajectory: '<',
    // draw Axes
    showAxes: "<",
    axesUnit: "<",
    axesXLeft: "<",
    axesXRight: "<",
    axesYTop: "<",
    axesYBottom: "<",
    fitToBound: "<"
  },
  transclude: true
});

const ZONE_DEPTH_SPEC_MAP = {
  'zone-top': 'startDepth',
  'zone-bottom': 'endDepth'
}

function googleMapViewController($scope, $timeout, ngDialog, wiToken, wiApi) {
  let self = this;
  let map;
  let markers = [];
  var drawMarkersDebounced = _.debounce(drawMarkers, 500);
  let icon_well = 'M413.9,455.1h-9.6L319.2,37.7h1.9c7.1,0,12.9-5.8,12.9-12.9V14.7c0-7.1-5.8-12.9-12.9-12.9H170.9c-7.1,0-12.9,5.8-12.9,12.9  v10.1c0,7.1,5.8,12.9,12.9,12.9h0.9L86.8,455.1H76.6c-7.1,0-12.9,5.8-12.9,12.9v10.1c0,7.1,5.8,12.9,12.9,12.9h48.6  c7.1,0,12.9-5.8,12.9-12.9v-10.1c0-7.1-5.8-12.9-12.9-12.9h-1.8l20-98.3H228v98.3h-6.3c-7.1,0-12.9,5.8-12.9,12.9v10.1  c0,7.1,5.8,12.9,12.9,12.9h48.6c7.1,0,12.9-5.8,12.9-12.9v-10.1c0-7.1-5.8-12.9-12.9-12.9H264v-98.3h83.6l20,98.3h-2.3  c-7.1,0-12.9,5.8-12.9,12.9v10.1c0,7.1,5.8,12.9,12.9,12.9h48.6c7.1,0,12.9-5.8,12.9-12.9v-10.1C426.8,460.9,421,455.1,413.9,455.1z   M310.1,172.8H264V37.7h18.6L310.1,172.8z M228,37.7v135.2H181l27.6-135.2H228z M150.8,320.9l22.9-112.2H228v112.2H150.8z   M264,320.9V208.7h53.4l22.9,112.2H264z';
  let icon_arrow_up = 'M442.627,185.388L265.083,7.844C260.019,2.78,253.263,0,245.915,0c-7.204,0-13.956,2.78-19.02,7.844L49.347,185.388    c-10.488,10.492-10.488,27.568,0,38.052l16.12,16.128c5.064,5.06,11.82,7.844,19.028,7.844c7.204,0,14.192-2.784,19.252-7.844    l103.808-103.584v329.084c0,14.832,11.616,26.932,26.448,26.932h22.8c14.832,0,27.624-12.1,27.624-26.932V134.816l104.396,104.752    c5.06,5.06,11.636,7.844,18.844,7.844s13.864-2.784,18.932-7.844l16.072-16.128C453.163,212.952,453.123,195.88,442.627,185.388z';
  let icon_arrow_down = 'M49.4,306.6l177.5,177.5c5.1,5.1,11.8,7.8,19.2,7.8c7.2,0,14-2.8,19-7.8l177.5-177.5c10.5-10.5,10.5-27.6,0-38.1    l-16.1-16.1c-5.1-5.1-11.8-7.8-19-7.8c-7.2,0-14.2,2.8-19.3,7.8L284.4,356V26.9C284.4,12.1,272.8,0,258,0h-22.8    c-14.8,0-27.6,12.1-27.6,26.9v330.3L103.2,252.4c-5.1-5.1-11.6-7.8-18.8-7.8s-13.9,2.8-18.9,7.8l-16.1,16.1    C38.8,279,38.9,296.1,49.4,306.6z';
  // let icon_default = 'M38.853,5.324L38.853,5.324c-7.098-7.098-18.607-7.098-25.706,0h0  C6.751,11.72,6.031,23.763,11.459,31L26,52l14.541-21C45.969,23.763,45.249,11.72,38.853,5.324z M26.177,24c-3.314,0-6-2.686-6-6  s2.686-6,6-6s6,2.686,6,6S29.491,24,26.177,24z';
  let icon_search = 'M 93.148438 80.832031 C 109.5 57.742188 104.03125 25.769531 80.941406 9.421875 C 57.851562 -6.925781 25.878906 -1.460938 9.53125 21.632812 C -6.816406 44.722656 -1.351562 76.691406 21.742188 93.039062 C 38.222656 104.707031 60.011719 105.605469 77.394531 95.339844 L 115.164062 132.882812 C 119.242188 137.175781 126.027344 137.347656 130.320312 133.269531 C 134.613281 129.195312 134.785156 122.410156 130.710938 118.117188 C 130.582031 117.980469 130.457031 117.855469 130.320312 117.726562 Z M 51.308594 84.332031 C 33.0625 84.335938 18.269531 69.554688 18.257812 51.308594 C 18.253906 33.0625 33.035156 18.269531 51.285156 18.261719 C 69.507812 18.253906 84.292969 33.011719 84.328125 51.234375 C 84.359375 69.484375 69.585938 84.300781 51.332031 84.332031 C 51.324219 84.332031 51.320312 84.332031 51.308594 84.332031 Z M 51.308594 84.332031';
  self.showingTimeDialogError = 5;

  this.$onInit = function () {
    $timeout(function () {
      drawMap();
      initContours();
      initAxes();
      window.onresize = function() {
        updateContourLayerSize();
        updateAxesLayerSize();
      }
      // console.log('Draw map')
    }, 10);
    $scope.$watch(
      function () {
        return [self.controlPanel];
      },
      function () {
        showControl();
      },
      true
    );
    $scope.$watch(
      function () {
        return [self.zoneMap];
      },
      function () {
        // console.log(self.zoneMap)
        // drawMarkersDebounced();
        updateCoordinateTableDebounced();
        $timeout(() => {
          showAllPopup(self.allPopup);
          updateContours();
          updateTrajectoryDebounced();
          updateAxes();
        })
      },
      true
    );
    $scope.$watch(
      function () {
        return [self.theme];
      },
      function () {
        changeStyleMap(self.theme);
      },
      true
    );
    $scope.$watch(
      function () {
        return self.focusWell;
      },
      function () {
        focusWell(self.focusWell);
      }
    );
    $scope.$watch(
      function () {
        return self.clearClipboardFocusWell;
      },
      function () {
        focusWell(self.focusWell);
      }
    );
    $scope.$watch(
      function () {
        return self.point;
      },
      function () {
        showPointLocation(self.point);
      }
    );
    $scope.$watch(
      function () {
        return [self.allPopup];
      },
      function () {
        showAllPopup(self.allPopup);
      },
      true
    );
    $scope.$watch(
      function () {
        return [self.wells];
      },
      function () {
        // drawMarkers();
        drawMarkersDebounced();
        updateAlertHash();
        $timeout(() => {
          showAllPopup(self.allPopup);
          updateCoordinateTableDebounced();
          updateContours();
          updateTrajectoryDebounced();
        })
      },
      true
    );

    // CONTOUR
    $scope.$watch(
      () => self.focusCurve,
      () => {
        updateContours();
        updateTrajectoryDebounced();
      }
    );
    $scope.$watch(
      () => self.showContour,
      () => {
        updateContours();
      }
    );
    $scope.$watch(
      () => self.contourTransparency,
      () => {
        if (_.isNumber(self.contourTransparency)) {
          $("#contour-map-container canvas.graphic-canvas").css("opacity", self.contourTransparency);
        }
      }
    );
    $scope.$watch(
      () => self.contourStep,
      () => {
        if (_.isNumber(self.contourStep) && contour) {
          contour.contourStep = self.contourStep;
          updateContours();
        }
      }
    );
    $scope.$watch(
      () => self.showContourText,
      () => {
        updateContours();
      }
    );
    $scope.$watch(
      () => self.showContourStroke,
      () => {
        updateContours();
      }
    );
    // Trajectory
    $scope.$watch(
      () => self.showTrajectory,
      () => {
        updateTrajectoryDebounced();
      }
    )
    // AXES
    $scope.$watch(
      () => self.showAxes,
      () => {
        updateMapBoundsDebounced(false);
        updateAxes();
      }
    )
    $scope.$watch(
      () => self.axesUnit,
      () => {
        updateMapBoundsDebounced(true);
        updateAxes();
      }
    )
    /*
    $scope.$watch(
      () => [ self.axesXLeft, self.axesXRight, self.axesYTop, self.axesYBottom ],
      () => {
        updateMapBounds(true);
      },
      true
    )
    */
    $scope.$watch(
      () => self.fitToBound,
      () => {
        updateMapBoundsDebounced(true);
      }
    )
    // VIEW BY ZONESET & MARKERSET
    $scope.$watch(
      () => self.focusMarkerOrZone,
      () => {
        updateCoordinateTableDebounced();
      }
    )
    $scope.$watch(
      () => self.zoneDepthSpec,
      () => {
        updateCoordinateTableDebounced();
      }
    )
    $scope.$watch(
      () => self.wellPosition,
      () => {
        updateCoordinateTableDebounced();
        updateTrajectoryDebounced();
      }
    )
    $scope.$watch(
      () => self.displayMode,
      () => {
        drawMarkersDebounced();
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

  function updateScaleMap () {
    if(!document.getElementsByClassName("gm-style-cc")[3]) return;
    self.scale = document.getElementsByClassName("gm-style-cc")[3].innerText;
    document.getElementById("scale").innerText = self.scale;
    if(self.scale.length === 8) {
      self.addWidth = 611;
    }else if(self.scale.length === 7) {
      self.addWidth = 611;
    }else if(self.scale.length === 6) {
      self.addWidth = 610;
    }else if(self.scale.length === 5) {
      self.addWidth = 609;
    }else if(self.scale.length === 4) {
      self.addWidth = 608;
    }
    self.scaleWidth = (document.getElementsByClassName("gm-style-cc")[3].innerHTML).substring((document.getElementsByClassName("gm-style-cc")[3].innerHTML).search("-1px; width:") + 12, self.addWidth);
    document.getElementById("scaleWidth").style.width = self.scaleWidth;
    self.ratioMap = (100000 * 156543.03392 * Math.cos(map.getCenter().lat() * Math.PI / 180) / Math.pow(2, map.getZoom()))/29;
    document.getElementById("ratio-map").innerText = "1:" + Math.ceil(self.ratioMap).toLocaleString();
    // console.log(self.ratioMap);
    // console.log(map.getZoom());
  }
  // SHOW MAP
  function drawMap() {
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 4,
      center: { lat: 21.344, lng: 107.036 },
      scaleControl: true,
      mapTypeId: google.maps.MapTypeId.ROADMAP

    });
    map.setOptions({ minZoom: 3 });

    // Show the lat and lng under the mouse cursor.
    var coordsDiv = document.getElementById('coords');
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(coordsDiv);
    map.addListener('mousemove', function (event) {
      updateScaleMap();
      coordsDiv.innerHTML = "<div>Latitude: <strong>" + (+event.latLng.lat()).toFixed(6) + "</strong></div><div>Longtitude: <strong>" + (+event.latLng.lng()).toFixed(6) + "</strong></div>";
    });
    $timeout(()=>{
      map.setZoom(6);
    },1000)
    map.addListener('zoom_changed', function (event) {
      updateTrajectoryDebounced();
      $timeout(()=>{
        updateScaleMap();
      })
    });

    //SHOW ZONE LINE
    var zoneLayerCoordinates = 
    [
      [
      {lat: 0, lng: -180},
      {lat: 0, lng: 0}
      ],
      [
      {lat: 0, lng: 180},
      {lat: 0, lng: 0}
      ],
      [
      {lat: -85, lng: 0},
      {lat: 85, lng: 0}
      ],
      [
      {lat: -85, lng: 6},
      {lat: 85, lng: 6}
      ],
      [
      {lat: -85, lng: 12},
      {lat: 85, lng: 12}
      ],
      [
      {lat: -85, lng: 18},
      {lat: 85, lng: 18}
      ],
      [
      {lat: -85, lng: 24},
      {lat: 85, lng: 24}
      ],
      [
      {lat: -85, lng: 30},
      {lat: 85, lng: 30}
      ],
      [
      {lat: -85, lng: 36},
      {lat: 85, lng: 36}
      ],
      [
      {lat: -85, lng: 42},
      {lat: 85, lng: 42}
      ],
      [
      {lat: -85, lng: 48},
      {lat: 85, lng: 48}
      ],
      [
      {lat: -85, lng: 54},
      {lat: 85, lng: 54}
      ],
      [
      {lat: -85, lng: 60},
      {lat: 85, lng: 60}
      ],
      [
      {lat: -85, lng: 66},
      {lat: 85, lng: 66}
      ],
      [
      {lat: -85, lng: 72},
      {lat: 85, lng: 72}
      ],
      [
      {lat: -85, lng: 78},
      {lat: 85, lng: 78}
      ],
      [
      {lat: -85, lng: 84},
      {lat: 85, lng: 84}
      ],
      [
      {lat: -85, lng: 90},
      {lat: 85, lng: 90}
      ],
      [
      {lat: -85, lng: 96},
      {lat: 85, lng: 96}
      ],
      [
      {lat: -85, lng: 102},
      {lat: 85, lng: 102}
      ],
      [
      {lat: -85, lng: 108},
      {lat: 85, lng: 108}
      ],
      [
      {lat: -85, lng: 114},
      {lat: 85, lng: 114}
      ],
      [
      {lat: -85, lng: 120},
      {lat: 85, lng: 120}
      ],
      [
      {lat: -85, lng: 126},
      {lat: 85, lng: 126}
      ],
      [
      {lat: -85, lng: 132},
      {lat: 85, lng: 132}
      ],
      [
      {lat: -85, lng: 138},
      {lat: 85, lng: 138}
      ],
      [
      {lat: -85, lng: 144},
      {lat: 85, lng: 144}
      ],
      [
      {lat: -85, lng: 150},
      {lat: 85, lng: 150}
      ],
      [
      {lat: -85, lng: 156},
      {lat: 85, lng: 156}
      ],
      [
      {lat: -85, lng: 162},
      {lat: 85, lng: 162}
      ],
      [
      {lat: -85, lng: 168},
      {lat: 85, lng: 168}
      ],
      [
      {lat: -85, lng: 174},
      {lat: 85, lng: 174}
      ],
      [
      {lat: -85, lng: 180},
      {lat: 85, lng: 180}
      ],
      [
      {lat: -85, lng: -6},
      {lat: 85, lng: -6}
      ],
      [
      {lat: -85, lng: -12},
      {lat: 85, lng: -12}
      ],
      [
      {lat: -85, lng: -18},
      {lat: 85, lng: -18}
      ],
      [
      {lat: -85, lng: -24},
      {lat: 85, lng: -24}
      ],
      [
      {lat: -85, lng: -30},
      {lat: 85, lng: -30}
      ],
      [
      {lat: -85, lng: -36},
      {lat: 85, lng: -36}
      ],
      [
      {lat: -85, lng: -42},
      {lat: 85, lng: -42}
      ],
      [
      {lat: -85, lng: -48},
      {lat: 85, lng: -48}
      ],
      [
      {lat: -85, lng: -54},
      {lat: 85, lng: -54}
      ],
      [
      {lat: -85, lng: -60},
      {lat: 85, lng: -60}
      ],
      [
      {lat: -85, lng: -66},
      {lat: 85, lng: -66}
      ],
      [
      {lat: -85, lng: -72},
      {lat: 85, lng: -72}
      ],
      [
      {lat: -85, lng: -78},
      {lat: 85, lng: -78}
      ],
      [
      {lat: -85, lng: -84},
      {lat: 85, lng: -84}
      ],
      [
      {lat: -85, lng: -90},
      {lat: 85, lng: -90}
      ],
      [
      {lat: -85, lng: -96},
      {lat: 85, lng: -96}
      ],
      [
      {lat: -85, lng: -102},
      {lat: 85, lng: -102}
      ],
      [
      {lat: -85, lng: -108},
      {lat: 85, lng: -108}
      ],
      [
      {lat: -85, lng: -114},
      {lat: 85, lng: -114}
      ],
      [
      {lat: -85, lng: -120},
      {lat: 85, lng: -120}
      ],
      [
      {lat: -85, lng: -126},
      {lat: 85, lng: -126}
      ],
      [
      {lat: -85, lng: -132},
      {lat: 85, lng: -132}
      ],
      [
      {lat: -85, lng: -138},
      {lat: 85, lng: -138}
      ],
      [
      {lat: -85, lng: -144},
      {lat: 85, lng: -144}
      ],
      [
      {lat: -85, lng: -150},
      {lat: 85, lng: -150}
      ],
      [
      {lat: -85, lng: -156},
      {lat: 85, lng: -156}
      ],
      [
      {lat: -85, lng: -162},
      {lat: 85, lng: -162}
      ],
      [
      {lat: -85, lng: -168},
      {lat: 85, lng: -168}
      ],
      [
      {lat: -85, lng: -174},
      {lat: 85, lng: -174}
      ]
    ];
    for (let index = 0; index < zoneLayerCoordinates.length; index++) {
      let zone = zoneLayerCoordinates[index];
      var zone_layer = new google.maps.Polyline({
        path: zone,
        geodesic: true,
        strokeColor: '#3f85ff',
        strokeOpacity: 0.2,
        strokeWeight: 1
      });
      zone_layer.setMap(map);
    }

    //SHOW ZONE NAME

    // mapLabel.setMap(map);

    window.mapView = map;
  }
  // CHANGE STYLE
  function changeStyleMap(theme) {
    if (map !== undefined) {
      if (theme === 1) {
        map.setOptions({
          styles: [
            {
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#212121"
                }
              ]
            },
            {
              "elementType": "labels.icon",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#757575"
                }
              ]
            },
            {
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#212121"
                }
              ]
            },
            {
              "featureType": "administrative",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#757575"
                }
              ]
            },
            {
              "featureType": "administrative.country",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#9e9e9e"
                }
              ]
            },
            {
              "featureType": "administrative.land_parcel",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "featureType": "administrative.locality",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#bdbdbd"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#757575"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#181818"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#616161"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#1b1b1b"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "geometry.fill",
              "stylers": [
                {
                  "color": "#2c2c2c"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#8a8a8a"
                }
              ]
            },
            {
              "featureType": "road.arterial",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#373737"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#3c3c3c"
                }
              ]
            },
            {
              "featureType": "road.highway.controlled_access",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#4e4e4e"
                }
              ]
            },
            {
              "featureType": "road.local",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#616161"
                }
              ]
            },
            {
              "featureType": "transit",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#757575"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#000000"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#3d3d3d"
                }
              ]
            }
          ]
        });
      } else if (theme === 2) {
        map.setOptions({ styles: [] });
      } else if (theme === 3) {
        map.setOptions({
          styles: [
            {
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#ebe3cd"
                }
              ]
            },
            {
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#523735"
                }
              ]
            },
            {
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#f5f1e6"
                }
              ]
            },
            {
              "featureType": "administrative",
              "elementType": "geometry.stroke",
              "stylers": [
                {
                  "color": "#c9b2a6"
                }
              ]
            },
            {
              "featureType": "administrative.land_parcel",
              "elementType": "geometry.stroke",
              "stylers": [
                {
                  "color": "#dcd2be"
                }
              ]
            },
            {
              "featureType": "administrative.land_parcel",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#ae9e90"
                }
              ]
            },
            {
              "featureType": "landscape.natural",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#dfd2ae"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#dfd2ae"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#93817c"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "geometry.fill",
              "stylers": [
                {
                  "color": "#a5b076"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#447530"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#f5f1e6"
                }
              ]
            },
            {
              "featureType": "road.arterial",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#fdfcf8"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#f8c967"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry.stroke",
              "stylers": [
                {
                  "color": "#e9bc62"
                }
              ]
            },
            {
              "featureType": "road.highway.controlled_access",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#e98d58"
                }
              ]
            },
            {
              "featureType": "road.highway.controlled_access",
              "elementType": "geometry.stroke",
              "stylers": [
                {
                  "color": "#db8555"
                }
              ]
            },
            {
              "featureType": "road.local",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#806b63"
                }
              ]
            },
            {
              "featureType": "transit.line",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#dfd2ae"
                }
              ]
            },
            {
              "featureType": "transit.line",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#8f7d77"
                }
              ]
            },
            {
              "featureType": "transit.line",
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#ebe3cd"
                }
              ]
            },
            {
              "featureType": "transit.station",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#dfd2ae"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "geometry.fill",
              "stylers": [
                {
                  "color": "#b9d3c2"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#92998d"
                }
              ]
            }
          ]
        });

      } else if (theme === 4) {
        map.setOptions({
          styles: [
            {
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#242f3e"
                }
              ]
            },
            {
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#746855"
                }
              ]
            },
            {
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#242f3e"
                }
              ]
            },
            {
              "featureType": "administrative.locality",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#d59563"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#d59563"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#263c3f"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#6b9a76"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#38414e"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "geometry.stroke",
              "stylers": [
                {
                  "color": "#212a37"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#9ca5b3"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#746855"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry.stroke",
              "stylers": [
                {
                  "color": "#1f2835"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#f3d19c"
                }
              ]
            },
            {
              "featureType": "transit",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#2f3948"
                }
              ]
            },
            {
              "featureType": "transit.station",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#d59563"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#17263c"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#515c6d"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#17263c"
                }
              ]
            }
          ]
        });

      } else if (theme === 5) {
        map.setOptions({
          styles: [
            {
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#1d2c4d"
                }
              ]
            },
            {
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#8ec3b9"
                }
              ]
            },
            {
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#1a3646"
                }
              ]
            },
            {
              "featureType": "administrative.country",
              "elementType": "geometry.stroke",
              "stylers": [
                {
                  "color": "#4b6878"
                }
              ]
            },
            {
              "featureType": "administrative.land_parcel",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#64779e"
                }
              ]
            },
            {
              "featureType": "administrative.province",
              "elementType": "geometry.stroke",
              "stylers": [
                {
                  "color": "#4b6878"
                }
              ]
            },
            {
              "featureType": "landscape.man_made",
              "elementType": "geometry.stroke",
              "stylers": [
                {
                  "color": "#334e87"
                }
              ]
            },
            {
              "featureType": "landscape.natural",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#023e58"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#283d6a"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#6f9ba5"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#1d2c4d"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "geometry.fill",
              "stylers": [
                {
                  "color": "#023e58"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#3C7680"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#304a7d"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#98a5be"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#1d2c4d"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#2c6675"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry.stroke",
              "stylers": [
                {
                  "color": "#255763"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#b0d5ce"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#023e58"
                }
              ]
            },
            {
              "featureType": "transit",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#98a5be"
                }
              ]
            },
            {
              "featureType": "transit",
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#1d2c4d"
                }
              ]
            },
            {
              "featureType": "transit.line",
              "elementType": "geometry.fill",
              "stylers": [
                {
                  "color": "#283d6a"
                }
              ]
            },
            {
              "featureType": "transit.station",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#3a4762"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#0e1626"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#4e6d70"
                }
              ]
            }
          ]
        });

      } else if (theme === 6) {
        map.setOptions({
          styles: [
            {
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#f5f5f5"
                }
              ]
            },
            {
              "elementType": "labels.icon",
              "stylers": [
                {
                  "visibility": "off"
                }
              ]
            },
            {
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#616161"
                }
              ]
            },
            {
              "elementType": "labels.text.stroke",
              "stylers": [
                {
                  "color": "#f5f5f5"
                }
              ]
            },
            {
              "featureType": "administrative.land_parcel",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#bdbdbd"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#eeeeee"
                }
              ]
            },
            {
              "featureType": "poi",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#757575"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#e5e5e5"
                }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#9e9e9e"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#ffffff"
                }
              ]
            },
            {
              "featureType": "road.arterial",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#757575"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#dadada"
                }
              ]
            },
            {
              "featureType": "road.highway",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#616161"
                }
              ]
            },
            {
              "featureType": "road.local",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#9e9e9e"
                }
              ]
            },
            {
              "featureType": "transit.line",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#e5e5e5"
                }
              ]
            },
            {
              "featureType": "transit.station",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#eeeeee"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [
                {
                  "color": "#c9c9c9"
                }
              ]
            },
            {
              "featureType": "water",
              "elementType": "labels.text.fill",
              "stylers": [
                {
                  "color": "#9e9e9e"
                }
              ]
            }
          ]
        });

      }
    }
  }
  //SHOW CONTROL
  function showControl() {
    $(".gm-fullscreen-control").toggleClass("showControl");
    $(".gmnoprint").toggleClass("showControl");
  }
  //SHOW POINT LOCATION
  function showPointLocation(point) {
    let x = document.getElementById("location-info");
    if(point) {
      x.style.display = "flex";
    } else {
      x.style.display = "none"
    }
    
    let y = document.getElementById("coords");
    if(point) {
      y.style.display = "flex";
    } else {
      y.style.display = "none"
    }
    if(!self.scale) return;
    document.getElementById("scale").innerText = self.scale;
  }
  //SHOW ALL POPUP
  function showAllPopup(check) {
    if (check === true) {
      $(".gm-style-iw-a").removeClass("showControl");
    } else if (check === false) {
      $(".gm-style-iw-a").addClass("showControl");
    }
  }
  // SHOW MARKER
  function drawMarkers() {
    let firstProjection = self.zoneMap;
    let secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";

    // remove all previous markers
    for (let marker of Object.values(markers)) {
      marker.setMap(null);
      // delete marker;
    }

    if (self.zoneMap) {
      // markers.length = 0;
      if (!(self.wells || []).length) return 0;
      if(self.displayMode === "status") {
        for (let index = 0; index < self.wells.length; index++) {
          let lat = getLat(self.wells[index].well_headers);
          let long = getLong(self.wells[index].well_headers);
          let x = getX(self.wells[index].well_headers);
          let y = getY(self.wells[index].well_headers);
          let latX = proj4(firstProjection, secondProjection, [x, y])[1];
          let lngY = proj4(firstProjection, secondProjection, [x, y])[0];
          let aMarker;
          if (checkCoordinate(lat, long, x, y) === true) {
            aMarker = new google.maps.Marker({ position: { lat: lat, lng: long }, map: map });
            let markername = '<div id="firstHeading" class="firstHeading">' + self.wells[index].name + '</div>';
            let infowindow = new google.maps.InfoWindow({
              content: markername,
              disableAutoPan: true
            });
            infowindow.open(map, aMarker);

            if (getImageIconMarker(self.wells[index].well_headers) == icon_search) {
              aMarker.setIcon({
                path: getImageIconMarker(self.wells[index].well_headers),
                fillColor: getColorIconMarker(self.wells[index].well_headers),
                fillOpacity: 1,
                anchor: new google.maps.Point(55, 50),
                strokeWeight: 1,
                strokeColor: getColorIconMarker(self.wells[index].well_headers),
                scale: 0.19,
              });
              // map.setCenter(new google.maps.LatLng(lat, long));
  
            }
            else if (getImageIconMarker(self.wells[index].well_headers) == icon_well) {
              aMarker.setIcon({
                path: getImageIconMarker(self.wells[index].well_headers),
                fillColor: getColorIconMarker(self.wells[index].well_headers),
                fillOpacity: 1,
                anchor: new google.maps.Point(270, 530),
                strokeWeight: 1,
                strokeColor: getColorIconMarker(self.wells[index].well_headers),
                scale: 0.05,
              });
              // map.setCenter(new google.maps.LatLng(lat, long));
  
            } 
            else {
              aMarker.setIcon({
                path: getImageIconMarker(self.wells[index].well_headers),
                fillColor: getColorIconMarker(self.wells[index].well_headers),
                fillOpacity: 1,
                anchor: new google.maps.Point(270, 530),
                strokeWeight: 1,
                strokeColor: getColorIconMarker(self.wells[index].well_headers),
                scale: 0.05,
              });
              // map.setCenter(new google.maps.LatLng(lat, long));
  
            }
          }
          else if (checkCoordinate(lat, long, x, y) === false) {
            aMarker = new google.maps.Marker({ position: { lat: latX, lng: lngY }, map: map });
            let markername = '<div id="firstHeading" class="firstHeading">' + self.wells[index].name + '</div>';
            let infowindow = new google.maps.InfoWindow({
              content: markername,
              disableAutoPan: true
            });
            // aMarker.addListener('click', function () {
            infowindow.open(map, aMarker);
            if (getImageIconMarker(self.wells[index].well_headers) == icon_search) {
              aMarker.setIcon({
                path: getImageIconMarker(self.wells[index].well_headers),
                fillColor: getColorIconMarker(self.wells[index].well_headers),
                fillOpacity: 1,
                anchor: new google.maps.Point(55, 50),
                strokeWeight: 1,
                strokeColor: getColorIconMarker(self.wells[index].well_headers),
                scale: 0.19,
              });
              // map.setCenter(new google.maps.LatLng(latX, lngY));
            }
            else if (getImageIconMarker(self.wells[index].well_headers) == icon_well) {
              aMarker.setIcon({
                path: getImageIconMarker(self.wells[index].well_headers),
                fillColor: getColorIconMarker(self.wells[index].well_headers),
                fillOpacity: 1,
                anchor: new google.maps.Point(270, 530),
                strokeWeight: 1,
                strokeColor: getColorIconMarker(self.wells[index].well_headers),
                scale: 0.05,
              });
              // map.setCenter(new google.maps.LatLng(latX, lngY));
  
            }
            else {
              aMarker.setIcon({
                path: getImageIconMarker(self.wells[index].well_headers),
                fillColor: getColorIconMarker(self.wells[index].well_headers),
                fillOpacity: 1,
                anchor: new google.maps.Point(270, 530),
                strokeWeight: 1,
                strokeColor: getColorIconMarker(self.wells[index].well_headers),
                scale: 0.05,
              });
              // map.setCenter(new google.maps.LatLng(latX, lngY));
  
            }
  
          } else {
            self.wellNameError = getName(self.wells[index].well_headers);
          }
          if (aMarker) {
            markers[self.wells[index].idWell] = aMarker;
          }
        }
      }
      if(self.displayMode === "derrick") {
        for (let index = 0; index < self.wells.length; index++) {
          let lat = getLat(self.wells[index].well_headers);
          let long = getLong(self.wells[index].well_headers);
          let x = getX(self.wells[index].well_headers);
          let y = getY(self.wells[index].well_headers);
          let latX = proj4(firstProjection, secondProjection, [x, y])[1];
          let lngY = proj4(firstProjection, secondProjection, [x, y])[0];
          let aMarker;
          if (checkCoordinate(lat, long, x, y) === true) {
            aMarker = new google.maps.Marker({ position: { lat: lat, lng: long }, map: map });
            let markername = '<div id="firstHeading" class="firstHeading">' + self.wells[index].name + '</div>';
            let infowindow = new google.maps.InfoWindow({
              content: markername,
              disableAutoPan: true
            });
            infowindow.open(map, aMarker);
            aMarker.setIcon({
              path: icon_well,
              fillColor: "#585858",
              fillOpacity: 1,
              anchor: new google.maps.Point(270, 530),
              strokeWeight: 1,
              strokeColor: "#585858",
              scale: 0.05,
            });
          }
          else if (checkCoordinate(lat, long, x, y) === false) {
            aMarker = new google.maps.Marker({ position: { lat: latX, lng: lngY }, map: map });
            let markername = '<div id="firstHeading" class="firstHeading">' + self.wells[index].name + '</div>';
            let infowindow = new google.maps.InfoWindow({
              content: markername,
              disableAutoPan: true
            });
            // aMarker.addListener('click', function () {
            infowindow.open(map, aMarker);
            aMarker.setIcon({
              path: icon_well,
              fillColor: "#585858",
              fillOpacity: 1,
              anchor: new google.maps.Point(270, 530),
              strokeWeight: 1,
              strokeColor: "#585858",
              scale: 0.05,
            });
  
          } else {
            self.wellNameError = getName(self.wells[index].well_headers);
          }
          if (aMarker) {
            markers[self.wells[index].idWell] = aMarker;
          }
        }
      }
    }
  }
  //FOCUS WELL
  function focusWell(well) {
    let firstProjection = self.zoneMap;
    let secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
    if (self.zoneMap && well.well_headers) {
      let lat = getLat(well.well_headers);
      let long = getLong(well.well_headers);
      let x = getX(well.well_headers);
      let y = getY(well.well_headers);
      let latX = proj4(firstProjection, secondProjection, [x, y])[1];
      let lngY = proj4(firstProjection, secondProjection, [x, y])[0];
      if (checkCoordinate(lat, long, x, y) === true) {
        map.panTo(new google.maps.LatLng(lat, long));
 
      }
      else if (checkCoordinate(lat, long, x, y) === false) {
        map.panTo(new google.maps.LatLng(latX, lngY));
    
      } 
      else {
        self.wellError = well.name;
      }
    }
  }
  // ================== DRAWING GEOJSON DATA ===================
  function drawGeoJson(geojson) {
    if (!map) return;
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
    /*
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
    */
    map.data.addGeoJson(geojson);
  }

  // ===================== DRAWING BY ZONE AND MARKER SET ===================
  let coordinateHash = {};
  const alertHash = {};
  // use alert hash table to prevent continually popup dialog
  function updateAlertHash() {
    Object.keys(alertHash).forEach(tag => {
      if (!self.wells.find(w => w.name == tag)) {
        alertHash[tag] = undefined;
      }
    })
  }
  const alertDebounce = _.debounce(function (message, tag) {
    if (tag) {
      if (Array.isArray(alertHash[tag]) && alertHash[tag].find(ms => ms == message)) {
        //already displayed, ignore it
        return;
      } else {
        if (alertHash[tag] === undefined)
          alertHash[tag] = [];
        alertHash[tag].push(message);
      }
    }
    self.showError = true;
    $scope.message = message;
    $timeout(()=>{
      self.showError = false;
    },self.showingTimeDialogError*1000)
    // ngDialog.open({
    //   template: "templateError",
    //   className: "ngdialog-theme-default",
    //   scope: Object.assign($scope.$new(), { message: message })
    // })
  }, 1000);
  const updateCoordinateTableDebounced = _.debounce(updateCoordinateTable, 1000);
  function updateCoordinateTable() {
    async.eachSeries(self.wells, (well, next) => {
      getCoordFromCurve(well)
        .then(coord => {
          coordinateHash[well.idWell] = coord;
          console.log(coord);
          next();
        })
    }, () => {
      // drawMarkers();
      drawMarkersDebounced();
    })
  }
  async function getCoordFromDepth(depth, well) {
    let x, y, lat, lng;
    if (Array.isArray(depth)) {
      x = []; y = []; lat = []; lng = [];
    }
    const indexDataset = well.datasets.find(ds => ds.name == "INDEX");
    if (indexDataset) {
      const xOffsetCurve = indexDataset.curves.find(c => c.idFamily == 762)
      const yOffsetCurve = indexDataset.curves.find(c => c.idFamily == 764)

      if (xOffsetCurve && yOffsetCurve) {
        const top = Number(indexDataset.top);
        const step = Number(indexDataset.step);
        const xOffsetData = await new Promise((res) => {
          self.getCurveRawDataFn(xOffsetCurve.idCurve, (err, data) => {
            // res(data.filter(d => _.isFinite(d.x)).map(d => Object.assign({}, d, { depth: top + step * d.y, x: wiApi.convertUnit(d.x, xOffsetCurve.unit, "m")})));
            res(data.filter(d => _.isFinite(d.x)).map(d => Object.assign(d, { depth: top + step * d.y })));
          });
        });
        const yOffsetData = await new Promise((res) => {
          self.getCurveRawDataFn(yOffsetCurve.idCurve, (err, data) => {
            // res(data.filter(d => _.isFinite(d.x)).map(d => Object.assign({}, d, { depth: top + step * d.y, x: wiApi.convertUnit(d.x, yOffsetCurve.unit, "m")})));
            res(data.filter(d => _.isFinite(d.x)).map(d => Object.assign(d, { depth: top + step * d.y })));
          });
        });

        if (xOffsetData.length && yOffsetData.length) {
          const firstProjection = self.zoneMap;
          const secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";

          const _lat = getLat(well.well_headers, true);
          const _lng = getLong(well.well_headers, true);
          const _x = getX(well.well_headers, true);
          const _y = getY(well.well_headers, true);

          /* // VERSION 1
          const xUpperBoundIdx = xOffsetData.findIndex(datum => datum.depth >= depth);
          const xUpperBound = xOffsetData[xUpperBoundIdx];
          const xLowerBound = xOffsetData[xUpperBoundIdx - 1];

          // calculate x, y offsets
          let _xOffset, _yOffset;
          if (xLowerBound)
            _xOffset = d3.scaleLinear().domain([xLowerBound.depth, xUpperBound.depth]).range([xLowerBound.x, xUpperBound.x])(depth);
          else
            _xOffset = (xUpperBound || xOffsetData[xOffsetData.length - 1]).x;

          const yUpperBoundIdx = yOffsetData.findIndex(datum => datum.depth >= depth);
          const yUpperBound = yOffsetData[yUpperBoundIdx];
          const yLowerBound = yOffsetData[yUpperBoundIdx - 1];

          if (yLowerBound)
            _yOffset = d3.scaleLinear().domain([yLowerBound.depth, yUpperBound.depth]).range([yLowerBound.x, yUpperBound.x])(depth);
          else
            _yOffset = (yUpperBound || yOffsetData[yOffsetData.length - 1]).x;
          */

          // VERSION 2
          let _xOffset, _yOffset;
          const xScale = d3.scaleLinear().domain(xOffsetData.map(p => p.depth)).range(xOffsetData.map(p => p.x));
          const yScale = d3.scaleLinear().domain(yOffsetData.map(p => p.depth)).range(yOffsetData.map(p => p.x));
          if (Array.isArray(depth)) {
            _xOffset = depth.map(d => wiApi.convertUnit(xScale(d), xOffsetCurve.unit, "m"));
            _yOffset = depth.map(d => wiApi.convertUnit(yScale(d), yOffsetCurve.unit, "m"));
          } else {
            _xOffset = wiApi.convertUnit(xScale(depth), xOffsetCurve.unit, "m");
            _yOffset = wiApi.convertUnit(yScale(depth), yOffsetCurve.unit, "m");
          }

          const _checkCoordResult = checkCoordinate(_lat, _lng, _x, _y);
          if (_checkCoordResult == true) {
            // calculate new lat/lng, x/y from x, y offset
            if (Array.isArray(depth)) {
              const zeroProject = proj4(firstProjection, secondProjection, [0, 0]);
              depth.forEach((d, i) => {
                const _originalXY = proj4(secondProjection, firstProjection, [_lng, _lat]);
                x[i] = _originalXY[0] + _xOffset[i];
                y[i] = _originalXY[1] + _yOffset[i];
                const _destLatLng = proj4(firstProjection,secondProjection, [x[i], y[i]]);
                lat[i] = _destLatLng[1];
                lng[i] = _destLatLng[0];
                /*
                const offsetProject = proj4(firstProjection, secondProjection, [_xOffset[i], _yOffset[i]]);
                lat[i] = _lat + (offsetProject[1] - zeroProject[1]);
                lng[i] = _lng + (offsetProject[0] - zeroProject[0]);
                const revertPrj = proj4(secondProjection, firstProjection, [lng[i], lat[i]]);
                x[i] = revertPrj[0];
                y[i] = revertPrj[1];
                */
              })
            } else {
              const _originalXY = proj4(secondProjection, firstProjection, [_lng, _lat]);
              x = _originalXY[0] + _xOffset;
              y = _originalXY[1] + _yOffset;
              const _destLatLng = proj4(firstProjection,secondProjection, [x, y]);
              lat = _destLatLng[1];
              lng = _destLatLng[0];
              /*
              const zeroProject = proj4(firstProjection, secondProjection, [0, 0]);
              const offsetProject = proj4(firstProjection, secondProjection, [_xOffset, _yOffset]);
              lat = _lat + (offsetProject[1] - zeroProject[1]);
              lng = _lng + (offsetProject[0] - zeroProject[0]);
              const revertPrj = proj4(secondProjection, firstProjection, [lng, lat]);
              x = revertPrj[0];
              y = revertPrj[1];
              */
            }
          } else if (_checkCoordResult == false) {
            // calculate new lat/lng from new x, y
            if (Array.isArray(depth)) {
              depth.forEach((d, i) => {
                x[i] = _x + _xOffset[i];
                y[i] = _y + _yOffset[i];
                const prjResult = proj4(firstProjection, secondProjection, [x[i], y[i]]);
                lat[i] = prjResult[1];
                lng[i] = prjResult[0];
              })
            } else {
              x = _x + _xOffset;
              y = _y + _yOffset;
              const prjResult = proj4(firstProjection, secondProjection, [x, y]);
              lat = prjResult[1];
              lng = prjResult[0];
            }
          }
        }
      } else {
        console.warn(`Cannot find XOFFSET or YOFFSET curve in INDEX dataset of well ${well.name}`);
        alertDebounce(`Cannot find XOFFSET or YOFFSET curve in INDEX dataset of well ${well.name}`, well.name);
      }
    } else {
      console.warn(`Cannot find INDEX dataset in well ${well.name}`);
      alertDebounce(`Cannot find INDEX dataset in well ${well.name}`, well.name);
    }
    if (Array.isArray(depth)) {
      return depth.map((d, i) => {
        return { x: x[i], y: y[i], lat: lat[i], lng: lng[i] };
      })
    }
    return { x, y, lat, lng };
  }
  async function getCoordFromCurve(well) {
    const focusedMZ = self.focusMarkerOrZone;
    if (!focusedMZ && !self.wellPosition) { return; }
    let depth = null;
    if (focusedMZ && focusedMZ.idZone) {
      const matchZoneset = well.zone_sets.find(zs => zs.name == focusedMZ.zonesetName);
      if (matchZoneset) {
        const matchZone = matchZoneset.zones.find(z => z.zone_template.name == focusedMZ.name);
        if (matchZone)
          if (self.zoneDepthSpec == 'zone-middle') {
            depth = (matchZone.startDepth + matchZone.endDepth) / 2;
          } else {
            depth = matchZone[ZONE_DEPTH_SPEC_MAP[self.zoneDepthSpec || 'zone-top']];
          }
      }
    } else if (focusedMZ && focusedMZ.idMarker) {
      const matchMarkerset = well.marker_sets.find(ms => ms.name == focusedMZ.markersetName);
      if (matchMarkerset) {
        const matchMarker = matchMarkerset.markers.find(m => m.marker_template.name == focusedMZ.name);
        if (matchMarker)
          depth = matchMarker.depth;
      }
    } else if (self.wellPosition) {
      const wellDepthSpec = getDepthSpecsFromWell(well);
      if ( self.wellPosition == "base" ) {
        depth = wellDepthSpec.bottomDepth;
      } else {
        // depth = wellDepthSpec.topDepth;
        depth = null;
      }
    }
    if (_.isFinite(depth)) {
      return await getCoordFromDepth(depth, well);
    }
    return { x: null, y: null, lat: null, lng: null };
  }
  // ====================== END DRAWING BY ZONE AND MARKER SET ====================


  // ======================== DRAWING AXES ========================
  let axes = null
  const mapBoundingLine = new google.maps.Polyline({
    geodesic: true,
    strokeColor: "#ff0000",
    strokeOpacity: 1.0,
    strokeWeight: 2
  })
  function initAxes() {
    axes = new Axes("#axes", map);
    google.maps.event.addListener(map, 'bounds_changed', function () {
      if (!axes) return;
      if (!self.showAxes) {
        axes.clearBoundsLayer();
        mapBoundingLine.setMap(null);
        return axes.clearLayer();
      }
      // updateMapBoundsDebounced();
      axes.drawAxesDebounced();
    })
    updateAxes();
  }
  const updateMapBoundsDebounced = _.debounce(updateMapBounds);
  function updateMapBounds(fitView = false) {
    if (!axes) return;
    axes.clearBoundsLayer();
    mapBoundingLine.setMap(null);
    if (_.isFinite(self.axesXLeft) && _.isFinite(self.axesXRight)
      && _.isFinite(self.axesYTop) && _.isFinite(self.axesYBottom)) {
      const secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
      const firstProjection = self.zoneMap;
      const unitRatio = self.axesUnit ? self.axesUnit.ratio : 1;
      // console.log("SW", self.axesXLeft, self.axesYBottom);
      // console.log("NE", self.axesXRight, self.axesYTop);
      const SW = proj4(firstProjection, secondProjection, [self.axesXLeft / unitRatio, self.axesYBottom / unitRatio]);
      const NE = proj4(firstProjection, secondProjection, [self.axesXRight / unitRatio, self.axesYTop / unitRatio]);
      if (SW.length && _.isFinite(SW[0]) && _.isFinite(SW[1])
        && NE.length && _.isFinite(NE[0]) && _.isFinite(NE[1])) {
          const _sw = new google.maps.LatLng(SW[1], SW[0]);
          const _ne = new google.maps.LatLng(NE[1], NE[0]);
          const _bounds = new google.maps.LatLngBounds();
          _bounds.extend(_sw);
          _bounds.extend(_ne);
          // console.log("Bounds", SW, NE);
          if (fitView)
            map.fitBounds(_bounds);
          // console.log("After Bounds",
          //   [map.getBounds().getSouthWest().lat(), map.getBounds().getSouthWest().lng()], 
          //   [map.getBounds().getNorthEast().lat(), map.getBounds().getNorthEast().lng()]
          // )
          /*
          axes.drawBounds({
            southWest: {lat: _sw.lat(), lng: _sw.lng()},
            northEast: {lat: _ne.lat(), lng: _ne.lng()}
          })
          */
          drawMapBound({
            southWest: {lat: _sw.lat(), lng: _sw.lng()},
            northEast: {lat: _ne.lat(), lng: _ne.lng()}
          });
      }
    }
  }
  function drawMapBound(bounds) {
    const northWest = { lat: bounds.northEast.lat, lng: bounds.southWest.lng };
    const southEast = { lat: bounds.southWest.lat, lng: bounds.northEast.lng };
    mapBoundingLine.setPath([northWest, bounds.northEast, southEast, bounds.southWest, northWest]);
    mapBoundingLine.setMap(map);
  }
  function updateAxesLayerSize() {
    axes.updateCanvasSize();
  }
  function updateAxes() {
    if (!axes) return;
    if (!self.showAxes) {
      axes.clearBoundsLayer();
      mapBoundingLine.setMap(null);
      map.panTo(map.getCenter());
      return axes.clearLayer();
    }
    const firstProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
    const secondProjection = self.zoneMap;
    axes.latLng2XYFn = function(lat, lng) {
      const result = proj4(firstProjection, secondProjection, [lng, lat]);
      if (self.axesUnit && _.isFinite(self.axesUnit.ratio)) {
        return {
          x: Number(result[0]) * self.axesUnit.ratio,
          y: Number(result[1]) * self.axesUnit.ratio
        }
      }
      return {
        x: result[0],
        y: result[1]
      }
    }
    axes.getUnitLabel = function() {
      return self.axesUnit ? self.axesUnit.label : "m";
    }
    axes.drawAxesDebounced();
  }
  // ======================= DRAWING CONTOUR ===========================
  let contour = null;
  function updateContourLayerSize() {
    contour.updateCanvasSize();
  }
  function initContours() {
    const formatTextFunc = wiApi.bestNumberFormat || ((text) => text);
    contour = new Contour("#contour-map-container", map, [], self.contourTransparency, formatTextFunc);
    google.maps.event.addListener(map, 'bounds_changed', function () {
      contour.drawContourDebounced();
    })
    window._contour = contour;
  }

  const updateContours = _.debounce(_updateContours, 100);
  async function _updateContours() {
    if (!map || !contour) return;
    if (!self.showContour) {
      contour.data = [];
      contour.drawContourDebounced();
      return;
    }
    if (contour) {
      contour.showContourText = self.showContourText;
      contour.showContourStroke = self.showContourStroke;
      contour.data = await genContourData();
      contour.drawContourDebounced();
    }
  }
  const _contourData = [];
  async function genContourData() {
    const _data = [];
    let firstProjection = self.zoneMap;
    let secondProjection =
      "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
    if (self.zoneMap) {
      await new Promise(resolve => {
        const promises = [];
        if ((self.wells || []).length) {
          for (let index = 0; index < self.wells.length; index++) {
            promises.push(new Promise(res => {
              let lat = getLat(self.wells[index].well_headers);
              let long = getLong(self.wells[index].well_headers);
              let x = getX(self.wells[index].well_headers);
              let y = getY(self.wells[index].well_headers);
              let latX = proj4(firstProjection, secondProjection, [x, y])[1];
              let lngY = proj4(firstProjection, secondProjection, [x, y])[0];
              if (checkCoordinate(lat, long, x, y) === true) {
                // use long, lat
                getWellDataForContour(self.wells[index])
                  .then(wellData => {
                    _data.push({
                      lng: long,
                      lat,
                      value: wellData,
                      wellName: self.wells[index].name
                    });
                    res();
                  })
              } else if (checkCoordinate(lat, long, x, y) === false) {
                // use lngY, latX
                getWellDataForContour(self.wells[index])
                  .then(wellData => {
                    _data.push({
                      lng: lngY,
                      lat: latX,
                      value: wellData,
                      wellName: self.wells[index].name
                    });
                    res();
                  })
              }
            }))
          }
        }
        Promise.all(promises)
          .then(alldone => {
            resolve();
          })
      })
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

  // ========================= DRAWING TRAJECTORY ========================
  const wellPathHash = {};
  const lineSymbol = {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 3,
    strokeColor: "#585858"
  };
  // const wellPointHash = {};
  const updateTrajectoryDebounced = _.debounce(updateTrajectory, 1000);
  function updateTrajectory() {
    clearTrajectoryMap();
    if (!self.showTrajectory) return;
    self.wells.forEach(async (well) => {
      if (!wellPathHash[well.idWell])
        wellPathHash[well.idWell] = new google.maps.Polyline({
          geodesic: true,
          strokeColor: "#585858",
          strokeOpacity: 1.0,
          strokeWeight: 2,
          icons: [{ icon: lineSymbol }]
        });
      /*
      if (!wellPointHash[well.idWell])
        wellPointHash[well.idWell] = new google.maps.Circle({
          strokeOpacity: 0.6,
          fillOpacity: 0.6,
          strokeColor: "#585858",
          fillColor: "#9c9c9c",
          radius: 0 
        })
      */
      const path = await calculatePathForWell(well);
      const icons = wellPathHash[well.idWell].get("icons");
      icons[0].offset = self.wellPosition == "top" ? "100%" : "0%";
      wellPathHash[well.idWell].setPath(path);
      wellPathHash[well.idWell].setMap(map);
      /*
      wellPointHash[well.idWell].setCenter(path[self.wellPosition == "top" ? (path.length - 1):0]);
      if (map.getZoom() >= 20) {
        wellPointHash[well.idWell].setRadius(1 / (2 ** (map.getZoom() - 20)));
      } else {
        wellPointHash[well.idWell].setRadius(1);
      }
      wellPointHash[well.idWell].setMap(map);
      */
    })
  }

  function clearTrajectoryMap() {
    Object.values(wellPathHash).forEach((path) => {
      path.setMap(null);
    })
    /*
    Object.values(wellPointHash).forEach((point) => {
      point.setMap(null);
    })
    */
  }

  function getDepthsFromScale(startDepth, endDepth) {
    const zoomFactor = map.getZoom();
    const numberOfPoints = Math.min(Math.max(2 ** Math.max((zoomFactor - 14), 1), 5), 100);
    const step = (endDepth - startDepth) / numberOfPoints;

    return _.range(startDepth, endDepth + step, step, step);
  }

  function getDepthSpecsFromWell(well) {
    return {
      topDepth: wiApi.convertUnit(Number((well.well_headers.find(h => h.header == "STRT") || {}).value), well.unit, "m"),
      bottomDepth: wiApi.convertUnit(Number((well.well_headers.find(h => h.header == "STOP") || {}).value), well.unit, "m")
    }
  }

  async function calculatePathForWell(well) {
    const depthSpecs = getDepthSpecsFromWell(well);
    const depths = getDepthsFromScale(depthSpecs.topDepth, depthSpecs.bottomDepth);
    await self.prepareWellInfoFn(well);
    const coords = await getCoordFromDepth(depths, well);
    /*
    for(let depth of depths) {
      const coord = await  getCoordFromDepth(depth, well);
      coords.push(coord);
    }
    */
    return coords;
  }

  // =======================  END DRAWING TRAJECTORY ============================
  function getColorIconMarker(wellHeader) {
    if (getFluidCode(wellHeader) === 'gas') {
      return '#ff6868'
    } else if (getFluidCode(wellHeader) === 'water') {
      return '#559bf3'
    } else if (getFluidCode(wellHeader) === 'condensate') {
      return '#a0a0a0'
    } else if (getFluidCode(wellHeader) === 'oil') {
      return '#15b153'
    } else {
      return '#585858'
    }
  }
  function getImageIconMarker(wellHeader) {
    if (getType(wellHeader) === 'exploration') {
      return icon_search
    } else if (getType(wellHeader) === 'production') {
      return icon_arrow_up
    } else if (getType(wellHeader) === 'injection') {
      return icon_arrow_down
    } else {
      return icon_well;
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

  function getLat(wellIndex, forceFromHeader = false) {
    const wellInfo = wellIndex.find(wellHeader => wellHeader.header == "WELL");
    if (!forceFromHeader && (self.focusMarkerOrZone || (self.wellPosition && self.wellPosition !== "top"))) {
      if (wellInfo && coordinateHash[wellInfo.idWell] && coordinateHash[wellInfo.idWell].lat)
        return coordinateHash[wellInfo.idWell].lat;
      // else return null;
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

  function getLong(wellIndex, forceFromHeader = false) {
    const wellInfo = wellIndex.find(wellHeader => wellHeader.header == "WELL");
    if (!forceFromHeader && (self.focusMarkerOrZone || (self.wellPosition && self.wellPosition !== "top"))) {
      if (wellInfo && coordinateHash[wellInfo.idWell] && coordinateHash[wellInfo.idWell].lng)
        return coordinateHash[wellInfo.idWell].lng;
      // else return null;
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

  function getX(wellIndex, forceFromHeader = false) {
    const wellInfo = wellIndex.find(wellHeader => wellHeader.header == "WELL");
    if (!forceFromHeader && (self.focusMarkerOrZone || (self.wellPosition && self.wellPosition !== "top"))) {
      if (wellInfo && coordinateHash[wellInfo.idWell] && coordinateHash[wellInfo.idWell].x)
        return coordinateHash[wellInfo.idWell].x;
      // else return -1;
    }

    if (!(wellIndex || []).length) return 0;
    for (let index = 0; index < wellIndex.length; index++) {
      if (wellIndex[index].header === "X") {
        const value = Number(wellIndex[index].value);
        return isNaN(value) ? 0 : value;
      }
    }
    return 0;
  }

  function getY(wellIndex, forceFromHeader = false) {
    const wellInfo = wellIndex.find(wellHeader => wellHeader.header == "WELL");
    if (!forceFromHeader && (self.focusMarkerOrZone || (self.wellPosition && self.wellPosition !== "top"))) {
      if (wellInfo && coordinateHash[wellInfo.idWell] && coordinateHash[wellInfo.idWell].y)
        return coordinateHash[wellInfo.idWell].y;
      // else return -1;
    }

    if (!(wellIndex || []).length) return 0;
    for (let index = 0; index < wellIndex.length; index++) {
      if (wellIndex[index].header === "Y") {
        const value = Number(wellIndex[index].value);
        return isNaN(value) ? 0 : value;
      }
    }
    return 0;
  }
  function getName(wellIndex) {
    if (!(wellIndex || []).length) return 0;
    for (let index = 0; index < wellIndex.length; index++) {
      if (wellIndex[index].header === "WELL") {
        return String(wellIndex[index].value);
      }
    }
    return 0;
  }
  function getFluidCode(wellIndex) {
    if (!(wellIndex || []).length) return 0;
    for (let index = 0; index < wellIndex.length; index++) {
      if (wellIndex[index].header === "FLUID") {
        return wellIndex[index].value.replace(/\s+/g, '').toLowerCase();
      }
    }
    return 0;
  }

  function getType(wellIndex) {
    if (!(wellIndex || []).length) return 0;
    for (let index = 0; index < wellIndex.length; index++) {
      if (wellIndex[index].header === "WTYPE") {
        return wellIndex[index].value.replace(/\s+/g, '').toLowerCase();
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
