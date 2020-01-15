var componentName = "googleMapView";
module.exports.name = componentName;
require("./google-map-view.less");
const test_contour = require("./test.json")
var app = angular.module(componentName, ["ngDialog", "wiToken"]);
const Contour = require("../contour");

app.component(componentName, {
  template: require("./google-map-view.html"),
  controller: googleMapViewController,
  controllerAs: "self",
  bindings: {
    wells: "<",
    zoneMap: "<",
    controlPanel: "<",
    point: "<",
    theme: "<",
    allPopup: "<",
    focusWell: "<",
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
    // draw trajectory map
    showTrajectory: '<',
  },
  transclude: true
});

const ZONE_DEPTH_SPEC_MAP = {
  'zone-top': 'startDepth',
  'zone-bottom': 'endDepth'
}

function googleMapViewController($scope, $timeout, ngDialog, wiToken) {
  let self = this;
  let map;
  let markers = [];
  var drawMarkersDebounced = _.debounce(drawMarkers, 500);
  let icon_circle = 'M-20,0a20,20 0 1,0 40,0a20,20 0 1,0 -40,0';
  let icon_arrow_up = 'M33.1,228.2c1.7,4,5.5,6.6,9.9,6.6h116.9v266.7c0,5.9,4.8,10.7,10.7,10.7h170.7c5.9,0,10.7-4.8,10.7-10.7V234.8h117.3    c4.3,0,8.2-2.6,9.9-6.6c1.6-4,0.7-8.6-2.3-11.6L264,3.1c-2-2-4.7-3.1-7.6-3.1c-2.8,0-5.5,1.1-7.6,3.1L35.4,216.6    C32.4,219.7,31.5,224.3,33.1,228.2z';
  let icon_arrow_down = 'M479.046,283.925c-1.664-3.989-5.547-6.592-9.856-6.592H352.305V10.667C352.305,4.779,347.526,0,341.638,0H170.971    c-5.888,0-10.667,4.779-10.667,10.667v266.667H42.971c-4.309,0-8.192,2.603-9.856,6.571c-1.643,3.989-0.747,8.576,2.304,11.627    l212.8,213.504c2.005,2.005,4.715,3.136,7.552,3.136s5.547-1.131,7.552-3.115l213.419-213.504    C479.793,292.501,480.71,287.915,479.046,283.925z';
  let icon_default = 'M38.853,5.324L38.853,5.324c-7.098-7.098-18.607-7.098-25.706,0h0  C6.751,11.72,6.031,23.763,11.459,31L26,52l14.541-21C45.969,23.763,45.249,11.72,38.853,5.324z M26.177,24c-3.314,0-6-2.686-6-6  s2.686-6,6-6s6,2.686,6,6S29.491,24,26.177,24z';


  this.$onInit = function () {
    $timeout(function () {
      drawMap();
      initContours();
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
        focusWell();
      }
    );
    $scope.$watch(
      function () {
        return [self.point];
      },
      function () {
        showPointLocation();
      },
      true
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
        $timeout(() => {
          showAllPopup(self.allPopup);
          updateContours();
        })
      },
      true
    );

    // CONTOUR
    $scope.$watch(
      () => self.focusCurve,
      () => {
        updateContours();
        updateTrajectory();
      }
    );
    $scope.$watch(
      () => self.showContour,
      () => {
        updateContours();
      }
    );
    $scope.$watch(
      () => self.showTrajectory,
      () => {
        updateTrajectory();
      }
    )

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
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 4,
      center: { lat: 21.344, lng: 107.036 },
      scaleControl: true,

    });
    map.setOptions({ minZoom: 3 });

    // Show the lat and lng under the mouse cursor.
    var coordsDiv = document.getElementById('coords');
    var pointLocatinDiv =
      map.controls[google.maps.ControlPosition.TOP_CENTER].push(coordsDiv);
    map.addListener('mousemove', function (event) {
      coordsDiv.innerHTML = "<div>Latitude: <strong>" + (event.latLng.lat()) + "</strong></div><div>Longtitude: <strong>" + (event.latLng.lng()) + "</strong></div>";
    });
    map.addListener('zoom_changed', function (event) {
      updateTrajectoryDebounced();
    })
    // //REPLACE ICON

    // $timeout(()=>{
    //   $('.gm-control-active>img:nth-child(1)')[0].src = 'data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3Csvg%20width%3D%2216px%22%20height%3D%2216px%22%20viewBox%3D%220%200%2016%2016%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%0A%20%20%20%20%3C!--%20Generator%3A%20Sketch%2052.5%20(67469)%20-%20http%3A%2F%2Fwww.bohemiancoding.com%2Fsketch%20--%3E%0A%20%20%20%20%3Ctitle%3Ebasemap_zoom_in_16x16%3C%2Ftitle%3E%0A%20%20%20%20%3Cdesc%3ECreated%20with%20Sketch.%3C%2Fdesc%3E%0A%20%20%20%20%3Cg%20id%3D%22basemap_zoom_in_16x16%22%20stroke%3D%22none%22%20stroke-width%3D%221%22%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%0A%20%20%20%20%20%20%20%20%3Cg%20id%3D%22Group%22%20transform%3D%22translate(1.000000%2C%201.000000)%22%20fill%3D%22%233F87DA%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Crect%20id%3D%22Rectangle%22%20x%3D%220%22%20y%3D%226%22%20width%3D%2214%22%20height%3D%222%22%20rx%3D%221%22%3E%3C%2Frect%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Crect%20id%3D%22Rectangle%22%20transform%3D%22translate(7.000000%2C%207.000000)%20rotate(-270.000000)%20translate(-7.000000%2C%20-7.000000)%20%22%20x%3D%220%22%20y%3D%226%22%20width%3D%2214%22%20height%3D%222%22%20rx%3D%221%22%3E%3C%2Frect%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E';
    //   $('.gm-control-active>img:nth-child(1)')[1].src = 'data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3Csvg%20width%3D%2216px%22%20height%3D%2216px%22%20viewBox%3D%220%200%2016%2016%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%0A%20%20%20%20%3C!--%20Generator%3A%20Sketch%2052.5%20(67469)%20-%20http%3A%2F%2Fwww.bohemiancoding.com%2Fsketch%20--%3E%0A%20%20%20%20%3Ctitle%3Ebasemap_zoom_in_16x16%3C%2Ftitle%3E%0A%20%20%20%20%3Cdesc%3ECreated%20with%20Sketch.%3C%2Fdesc%3E%0A%20%20%20%20%3Cg%20id%3D%22basemap_zoom_in_16x16%22%20stroke%3D%22none%22%20stroke-width%3D%221%22%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%0A%20%20%20%20%20%20%20%20%3Cg%20id%3D%22Group%22%20transform%3D%22translate(1.000000%2C%201.000000)%22%20fill%3D%22%233F87DA%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Crect%20id%3D%22Rectangle%22%20x%3D%220%22%20y%3D%226%22%20width%3D%2214%22%20height%3D%222%22%20rx%3D%221%22%3E%3C%2Frect%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Crect%20id%3D%22Rectangle%22%20transform%3D%22translate(7.000000%2C%207.000000)%20rotate(-270.000000)%20translate(-7.000000%2C%20-7.000000)%20%22%20x%3D%220%22%20y%3D%226%22%20width%3D%2214%22%20height%3D%222%22%20rx%3D%221%22%3E%3C%2Frect%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E';
    //   $('.gm-control-active>img:nth-child(1)')[2].src = 'data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3Csvg%20width%3D%2216px%22%20height%3D%2216px%22%20viewBox%3D%220%200%2016%2016%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%0A%20%20%20%20%3C!--%20Generator%3A%20Sketch%2052.5%20(67469)%20-%20http%3A%2F%2Fwww.bohemiancoding.com%2Fsketch%20--%3E%0A%20%20%20%20%3Ctitle%3Ebasemap_zoom_out_16x16%3C%2Ftitle%3E%0A%20%20%20%20%3Cdesc%3ECreated%20with%20Sketch.%3C%2Fdesc%3E%0A%20%20%20%20%3Cg%20id%3D%22basemap_zoom_out_16x16%22%20stroke%3D%22none%22%20stroke-width%3D%221%22%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20id%3D%22Rectangle%22%20fill%3D%22%233F87DA%22%20x%3D%221%22%20y%3D%227%22%20width%3D%2214%22%20height%3D%222%22%20rx%3D%221%22%3E%3C%2Frect%3E%0A%20%20%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E';
    //   $('.gm-control-active>img:nth-child(2)')[1].src = 'data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3Csvg%20width%3D%2216px%22%20height%3D%2216px%22%20viewBox%3D%220%200%2016%2016%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%0A%20%20%20%20%3C!--%20Generator%3A%20Sketch%2052.5%20(67469)%20-%20http%3A%2F%2Fwww.bohemiancoding.com%2Fsketch%20--%3E%0A%20%20%20%20%3Ctitle%3Ebasemap_zoom_in_16x16%3C%2Ftitle%3E%0A%20%20%20%20%3Cdesc%3ECreated%20with%20Sketch.%3C%2Fdesc%3E%0A%20%20%20%20%3Cg%20id%3D%22basemap_zoom_in_16x16%22%20stroke%3D%22none%22%20stroke-width%3D%221%22%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%0A%20%20%20%20%20%20%20%20%3Cg%20id%3D%22Group%22%20transform%3D%22translate(1.000000%2C%201.000000)%22%20fill%3D%22%233F87DA%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Crect%20id%3D%22Rectangle%22%20x%3D%220%22%20y%3D%226%22%20width%3D%2214%22%20height%3D%222%22%20rx%3D%221%22%3E%3C%2Frect%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Crect%20id%3D%22Rectangle%22%20transform%3D%22translate(7.000000%2C%207.000000)%20rotate(-270.000000)%20translate(-7.000000%2C%20-7.000000)%20%22%20x%3D%220%22%20y%3D%226%22%20width%3D%2214%22%20height%3D%222%22%20rx%3D%221%22%3E%3C%2Frect%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E';
    //   $('.gm-control-active>img:nth-child(2)')[2].src = 'data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3Csvg%20width%3D%2216px%22%20height%3D%2216px%22%20viewBox%3D%220%200%2016%2016%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%0A%20%20%20%20%3C!--%20Generator%3A%20Sketch%2052.5%20(67469)%20-%20http%3A%2F%2Fwww.bohemiancoding.com%2Fsketch%20--%3E%0A%20%20%20%20%3Ctitle%3Ebasemap_zoom_out_16x16%3C%2Ftitle%3E%0A%20%20%20%20%3Cdesc%3ECreated%20with%20Sketch.%3C%2Fdesc%3E%0A%20%20%20%20%3Cg%20id%3D%22basemap_zoom_out_16x16%22%20stroke%3D%22none%22%20stroke-width%3D%221%22%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20id%3D%22Rectangle%22%20fill%3D%22%233F87DA%22%20x%3D%221%22%20y%3D%227%22%20width%3D%2214%22%20height%3D%222%22%20rx%3D%221%22%3E%3C%2Frect%3E%0A%20%20%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E';
    //   $('.gm-control-active>img:nth-child(3)')[1].src = 'data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3Csvg%20width%3D%2216px%22%20height%3D%2216px%22%20viewBox%3D%220%200%2016%2016%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%0A%20%20%20%20%3C!--%20Generator%3A%20Sketch%2052.5%20(67469)%20-%20http%3A%2F%2Fwww.bohemiancoding.com%2Fsketch%20--%3E%0A%20%20%20%20%3Ctitle%3Ebasemap_zoom_in_16x16%3C%2Ftitle%3E%0A%20%20%20%20%3Cdesc%3ECreated%20with%20Sketch.%3C%2Fdesc%3E%0A%20%20%20%20%3Cg%20id%3D%22basemap_zoom_in_16x16%22%20stroke%3D%22none%22%20stroke-width%3D%221%22%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%0A%20%20%20%20%20%20%20%20%3Cg%20id%3D%22Group%22%20transform%3D%22translate(1.000000%2C%201.000000)%22%20fill%3D%22%233F87DA%22%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Crect%20id%3D%22Rectangle%22%20x%3D%220%22%20y%3D%226%22%20width%3D%2214%22%20height%3D%222%22%20rx%3D%221%22%3E%3C%2Frect%3E%0A%20%20%20%20%20%20%20%20%20%20%20%20%3Crect%20id%3D%22Rectangle%22%20transform%3D%22translate(7.000000%2C%207.000000)%20rotate(-270.000000)%20translate(-7.000000%2C%20-7.000000)%20%22%20x%3D%220%22%20y%3D%226%22%20width%3D%2214%22%20height%3D%222%22%20rx%3D%221%22%3E%3C%2Frect%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E';
    //   $('.gm-control-active>img:nth-child(3)')[2].src = 'data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3Csvg%20width%3D%2216px%22%20height%3D%2216px%22%20viewBox%3D%220%200%2016%2016%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%0A%20%20%20%20%3C!--%20Generator%3A%20Sketch%2052.5%20(67469)%20-%20http%3A%2F%2Fwww.bohemiancoding.com%2Fsketch%20--%3E%0A%20%20%20%20%3Ctitle%3Ebasemap_zoom_out_16x16%3C%2Ftitle%3E%0A%20%20%20%20%3Cdesc%3ECreated%20with%20Sketch.%3C%2Fdesc%3E%0A%20%20%20%20%3Cg%20id%3D%22basemap_zoom_out_16x16%22%20stroke%3D%22none%22%20stroke-width%3D%221%22%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20id%3D%22Rectangle%22%20fill%3D%22%233F87DA%22%20x%3D%221%22%20y%3D%227%22%20width%3D%2214%22%20height%3D%222%22%20rx%3D%221%22%3E%3C%2Frect%3E%0A%20%20%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E';
    // },1000)
    // map.data.addGeoJson(test_contour);
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
  function showPointLocation() {
    var x = document.getElementById("coords");
    if (x.style.display === "none") {
      x.style.display = "flex";
    } else {
      x.style.display = "none";
    }
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
            content: markername
          });
          infowindow.open(map, aMarker);
          if (getImageIconMarker(self.wells[index].well_headers) == icon_circle) {
            aMarker.setIcon({
              path: getImageIconMarker(self.wells[index].well_headers),
              fillColor: getColorIconMarker(self.wells[index].well_headers),
              fillOpacity: .6,
              anchor: new google.maps.Point(0, 0),
              strokeWeight: 1,
              strokeColor: getColorIconMarker(self.wells[index].well_headers),
              scale: 0.5,
            });
          }
          else if (getImageIconMarker(self.wells[index].well_headers) == icon_default) {
            aMarker.setIcon({
              path: getImageIconMarker(self.wells[index].well_headers),
              fillColor: '#fb4c4c',
              fillOpacity: .6,
              anchor: new google.maps.Point(27, 55),
              strokeWeight: 1,
              strokeColor: '#d22c2c',
              scale: 0.7,
            });
          } 
          else {
            aMarker.setIcon({
              path: getImageIconMarker(self.wells[index].well_headers),
              fillColor: getColorIconMarker(self.wells[index].well_headers),
              fillOpacity: .6,
              anchor: new google.maps.Point(270, 530),
              strokeWeight: 1,
              strokeColor: getColorIconMarker(self.wells[index].well_headers),
              scale: 0.05,
            });
          }
        }
        else if (checkCoordinate(lat, long, x, y) === false) {
          aMarker = new google.maps.Marker({ position: { lat: latX, lng: lngY }, map: map });
          let markername = '<div id="firstHeading" class="firstHeading">' + self.wells[index].name + '</div>';
          let infowindow = new google.maps.InfoWindow({
            content: markername
          });
          // aMarker.addListener('click', function () {
          infowindow.open(map, aMarker);
          if (getImageIconMarker(self.wells[index].well_headers) == icon_circle) {
            aMarker.setIcon({
              path: getImageIconMarker(self.wells[index].well_headers),
              fillColor: getColorIconMarker(self.wells[index].well_headers),
              fillOpacity: .6,
              anchor: new google.maps.Point(0, 0),
              strokeWeight: 1,
              strokeColor: getColorIconMarker(self.wells[index].well_headers),
              scale: 0.5,
            });
          }
          else if (getImageIconMarker(self.wells[index].well_headers) == icon_default) {
            aMarker.setIcon({
              path: getImageIconMarker(self.wells[index].well_headers),
              fillColor: '#1081E0',
              fillOpacity: .6,
              anchor: new google.maps.Point(27, 55),
              strokeWeight: 1,
              strokeColor: '#1081E0',
              scale: 0.7,
            });
          }
          else {
            aMarker.setIcon({
              path: getImageIconMarker(self.wells[index].well_headers),
              fillColor: getColorIconMarker(self.wells[index].well_headers),
              fillOpacity: .6,
              anchor: new google.maps.Point(270, 530),
              strokeWeight: 1,
              strokeColor: getColorIconMarker(self.wells[index].well_headers),
              scale: 0.05,
            });
          }

        } else {
          console.log(lat, long, x, y)
        }
        if (aMarker) {
          markers[self.wells[index].idWell] = aMarker;
        }
      }
    }
  }
  //FOCUS WELL
  function focusWell() {
    let firstProjection = self.zoneMap;
    let secondProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
    console.log(self.focusWell)
    if (self.zoneMap && self.focusWell.well_headers) {
      let lat = getLat(self.focusWell.well_headers);
      let long = getLong(self.focusWell.well_headers);
      let x = getX(self.focusWell.well_headers);
      let y = getY(self.focusWell.well_headers);
      let latX = proj4(firstProjection, secondProjection, [x, y])[1];
      let lngY = proj4(firstProjection, secondProjection, [x, y])[0];

      if (checkCoordinate(lat, long, x, y) === true) {
        // map.setCenter({ lat: lat, lng: long, alt: 0 });
        // map.setCenter(new google.maps.LatLng(lat, long));
        // map.panTo(new google.maps.LatLng(lat, long));
        // marker = new google.maps.Marker({ position: { lat: lat, lng: long }, map: map, zIndex: 10000 });
        // // marker.setAnimation(google.maps.Animation.BOUNCE);
        // let infowindow = new google.maps.InfoWindow({
        //   content: 'markername'
        // });
        // infowindow.open(map, marker);
 
      }
      else if (checkCoordinate(lat, long, x, y) === false) {
        // map.setCenter({ lat: latX, lng: lngY, alt: 0 });
        // map.setCenter(new google.maps.LatLng(latX, logY));
        // map.panTo(new google.maps.LatLng(latX, lngY));
        // marker = new google.maps.Marker({ position: { lat: latX, lng: lngY }, map: map, zIndex: 10000 });
        // // marker.setAnimation(google.maps.Animation.BOUNCE);
        // let infowindow = new google.maps.InfoWindow({
        //   content: 'markername'
        // });
        // infowindow.open(map, marker);
      } 
      else {
        self.wellError = self.focusWell.name;
        // ngDialog.open({
        //   template: "templateError",
        //   className: "ngdialog-theme-default",
        //   scope: Object.assign($scope.$new(), { message: `Well's coordinate has been error ${self.focusWell.name}` })
        // })
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
  const alertDebounce = _.debounce(function (message) {
    ngDialog.open({
      template: "templateError",
      className: "ngdialog-theme-default",
      scope: Object.assign($scope.$new(), { message: message })
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
            res(data.map(d => Object.assign(d, { depth: top + step * d.y })).filter(d => _.isFinite(d.x)));
          });
        });
        const yOffsetData = await new Promise((res) => {
          self.getCurveRawDataFn(yOffsetCurve.idCurve, (err, data) => {
            res(data.map(d => Object.assign(d, { depth: top + step * d.y })).filter(d => _.isFinite(d.x)));
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
            _xOffset = depth.map(d => xScale(d));
            _yOffset = depth.map(d => yScale(d));
          } else {
            _xOffset = xScale(depth);
            _yOffset = yScale(depth);
          }


          const _checkCoordResult = checkCoordinate(_lat, _lng, _x, _y);
          if (_checkCoordResult == true) {
            // calculate new lat/lng, x/y from x, y offset
            if (Array.isArray(depth)) {
              const zeroProject = proj4(firstProjection, secondProjection, [0, 0]);
              depth.forEach((d, i) => {
                const offsetProject = proj4(firstProjection, secondProjection, [_xOffset[i], _yOffset[i]]);
                lat[i] = _lat + (offsetProject[1] - zeroProject[1]);
                lng[i] = _lng + (offsetProject[0] - zeroProject[0]);
                const revertPrj = proj4(secondProjection, firstProjection, [lng[i], lat[i]]);
                x[i] = revertPrj[0];
                y[i] = revertPrj[1];
              })
            } else {
              const zeroProject = proj4(firstProjection, secondProjection, [0, 0]);
              const offsetProject = proj4(firstProjection, secondProjection, [_xOffset, _yOffset]);
              lat = _lat + (offsetProject[1] - zeroProject[1]);
              lng = _lng + (offsetProject[0] - zeroProject[0]);
              const revertPrj = proj4(secondProjection, firstProjection, [lng, lat]);
              x = revertPrj[0];
              y = revertPrj[1];
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
        alertDebounce(`Cannot find XOFFSET or YOFFSET curve in INDEX dataset of well ${well.name}`);
      }
    } else {
      console.warn(`Cannot find INDEX dataset in well ${well.name}`);
      alertDebounce(`Cannot find INDEX dataset in well ${well.name}`);
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
    if (!focusedMZ) {
      return;
    }
    let depth = null;
    if (focusedMZ.idZone) {
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
    } else if (focusedMZ.idMarker) {
      const matchMarkerset = well.marker_sets.find(ms => ms.name == focusedMZ.markersetName);
      if (matchMarkerset) {
        const matchMarker = matchMarkerset.markers.find(m => m.marker_template.name == focusedMZ.name);
        if (matchMarker)
          depth = matchMarker.depth;
      }
    }
    if (_.isFinite(depth)) {
      return await getCoordFromDepth(depth, well);
    }
    return { x: null, y: null, lat: null, lng: null };
  }
  // ====================== END DRAWING BY ZONE AND MARKER SET ====================

  // ======================= DRAWING CONTOUR ===========================
  let contour = null;
  function initContours() {
    contour = new Contour("#contour-map-container", map, []);
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
      return;
    }
    if (contour) {
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
      /*
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
      */
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
                      value: wellData
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
                      value: wellData
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
  const updateTrajectoryDebounced = _.debounce(updateTrajectory, 100);
  function updateTrajectory() {
    self.wells.forEach(async (well) => {
      if (!self.showTrajectory)
        return clearTrajectoryMap();
      if (!wellPathHash[well.idWell])
        wellPathHash[well.idWell] = new google.maps.Polyline({
          geodesic: true,
          strokeColor: well.color || "#ff0000",
          strokeOpacity: 1.0,
          strokeWeight: 2
        });
      const path = await calculatePathForWell(well);
      wellPathHash[well.idWell].setPath(path);
      wellPathHash[well.idWell].setMap(map);
    })
  }

  function clearTrajectoryMap() {
    Object.values(wellPathHash).forEach((path) => {
      path.setMap(null);
    })
  }

  function getDepthsFromScale(startDepth, endDepth) {
    const zoomFactor = map.getZoom();
    const numberOfPoints = Math.min(2 ** Math.max((zoomFactor - 15), 1), 150);
    const step = (endDepth - startDepth) / numberOfPoints;

    return _.range(startDepth, endDepth + step, step, step);
  }

  function getDepthSpecsFromWell(well) {
    return {
      topDepth: Number((well.well_headers.find(h => h.header == "STRT") || {}).value),
      bottomDepth: Number((well.well_headers.find(h => h.header == "STOP") || {}).value)
    }
  }

  async function calculatePathForWell(well) {
    const depthSpecs = getDepthSpecsFromWell(well);
    const depths = getDepthsFromScale(depthSpecs.topDepth, depthSpecs.bottomDepth);
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
    if (getFluidCode(wellHeader) === 'Gas') {
      return '#ff9d1d8a'
    } else if (getFluidCode(wellHeader) === 'Water') {
      return 'blue'
    } else if (getFluidCode(wellHeader) === 'Condensate') {
      return 'green'
    } else if (getFluidCode(wellHeader) === 'Oil') {
      return 'gray'
    } else {
      return 'yellow'
    }
  }
  function getImageIconMarker(wellHeader) {
    if (getType(wellHeader) === 'Exploration') {
      return icon_circle
    } else if (getType(wellHeader) === 'Production') {
      return icon_arrow_up
    } else if (getType(wellHeader) === 'Injection') {
      return icon_arrow_down
    } else {
      return icon_default;
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
    if (!forceFromHeader && self.focusMarkerOrZone) {
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
    if (!forceFromHeader && self.focusMarkerOrZone) {
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
    if (!forceFromHeader && self.focusMarkerOrZone) {
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
    if (!forceFromHeader && self.focusMarkerOrZone) {
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
  function getFluidCode(wellIndex) {
    if (!(wellIndex || []).length) return 0;
    for (let index = 0; index < wellIndex.length; index++) {
      if (wellIndex[index].header === "TYPE") {
        return wellIndex[index].value.split(' ').pop();
      }
    }
    return 0;
  }

  function getType(wellIndex) {
    if (!(wellIndex || []).length) return 0;
    for (let index = 0; index < wellIndex.length; index++) {
      if (wellIndex[index].header === "TYPE") {
        if(wellIndex[index].value.split(' ').shift() !== '')
        return wellIndex[index].value.split(' ').shift();
      }  else if (wellIndex[index].header === "WTYPE") {
        if(wellIndex[index].value.split(' ').shift() !== '')
        return wellIndex[index].value.split(' ').shift();
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
