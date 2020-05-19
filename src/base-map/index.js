// vim: ts=2 sw=2
var componentName = "baseMap";
module.exports.name = componentName;
require("./style.less");
const queryString = require("query-string");
const JSZip = require("jszip");
const fileSaver = require("file-saver");
const utils = require("../utils");

let config = require("../../config/default").default;
if (process.env.NODE_ENV === "development") {
  config = require("../../config/default").dev;
} else if (process.env.NODE_ENV === "production") {
  config = require("../../config/default").production;
}
config = require("../../config/default").production;


// console.log("config", config);
// console.log("NODE_ENV", process.env.NODE_ENV);
const WI_AUTH_HOST = config.wi_auth;
const WI_BACKEND_HOST = config.wi_backend;

localStorage.setItem('__BASE_URL', WI_AUTH_HOST);

var app = angular.module(componentName, [
  "mapView",
  "googleMapView",
  "sideBar",
  "wiTreeView",
  "wiTreeViewVirtual",

  // "wiDroppable",
  "wiLogin",
  "ngDialog",
  "wiToken",
  "angularResizable",
  'managerDashboard',
  'wiApi',
  'file-explorer',
  'wiDialog',

  'contourView',
  'contourFileImport',
  'colorScaleGenerator'
]);

function getData(resultObj) {
  return Object.values(resultObj).map(item => item.length);
}

const DTSRC_OPTIONS_MAP = {
  "Well By Type": 'well-by-type',
  "Well By Field": 'well-by-field',
  "Well By Operator": 'well-by-operator',
  "Well By Tag": 'well-by-tag',
  "Curve By Tag": 'curve-by-tag',
}
const DTSRC_MAP = {
  'well-by-type': 'wTypes',
  'well-by-field': 'fields',
  'well-by-operator': 'operators',
  'well-by-tag': 'tags',
  'curve-by-tag': 'curveTags'
}
const chartTypes = [
  { data: { label: "Bar" }, properties: { value: "bar" } },
  { data: { label: "Horizontal Bar" }, properties: { value: "horizontal-bar" } },
  { data: { label: "Pie" }, properties: { value: "pie" } },
  { data: { label: "Doughnut" }, properties: { value: "doughnut" } }
] 
const CHART_DATA_SOURCE = {} 
app.value('chartSettings', {
  chartTypeOpt: {
    type: 'select',
    label: "Chart Type",
    options: chartTypes,
    setValue: function (selectedProps, widgetConfig) {
      console.log("setting type", selectedProps);
      const lastType = widgetConfig.type;
      if (selectedProps) {
        widgetConfig.type = selectedProps.value;
        if (widgetConfig.type === "horizontal-bar" && lastType !== "horizontal-bar") {
          const maxTicksLimit = _.get(widgetConfig, 'bar_chart_options.scales.yAxes[0].ticks.maxTicksLimit', null);
          _.set(widgetConfig, 'bar_chart_options.scales.yAxes[0].ticks.maxTicksLimit', null);
          _.set(widgetConfig, 'bar_chart_options.scales.xAxes[0].ticks.maxTicksLimit', maxTicksLimit);
        } else if (lastType === "horizontal-bar" && widgetConfig.type !== "horizontal-bar") {
          const maxTicksLimit = _.get(widgetConfig, 'bar_chart_options.scales.xAxes[0].ticks.maxTicksLimit', null);
          _.set(widgetConfig, 'bar_chart_options.scales.xAxes[0].ticks.maxTicksLimit', null);
          _.set(widgetConfig, 'bar_chart_options.scales.yAxes[0].ticks.maxTicksLimit', maxTicksLimit);
        }
      }
    },
    getValue: function(widgetConfig) {
      const foundNode = chartTypes.find(d => d.properties.value == widgetConfig.type);
      return foundNode ? foundNode.data.label : null;
    },
    getSelectedOption: function(widgetConfig) {
      return this.options.find(o => o.properties.value == widgetConfig.type)
    },
  },
  dataSourceOpt: {
    type: 'select',
    label: "Data Source",
    options: [
      { data: { label: "Well By Type" }, properties: { value: "well-by-type" } },
      { data: { label: "Well By Field" }, properties: { value: "well-by-field" } },
      { data: { label: "Well By Operator" }, properties: { value: "well-by-operator" } },
      { data: { label: "Well By Tag" }, properties: { value: "well-by-tag" } },
      { data: { label: "Curve By Tag" }, properties: { value: "curve-by-tag" } },
    ],
    getSelectedOption: function(widgetConfig) {
      return this.options.find(o => o.data.label == widgetConfig.dataSourceLabel)
    },
    getValue: function (widgetConfig) {
      return widgetConfig.dataSourceLabel;
    },
    setValue: function (selectedProps, widgetConfig) {
      // console.log("setting data source");
      if (selectedProps) {
        /*
        widgetConfig.data = getData(widgetConfig.dataSources[DTSRC_MAP[selectedProps.value]]);
        widgetConfig.labelFn = function (config, datum, idx) {
          return Object.keys(widgetConfig.dataSources[DTSRC_MAP[selectedProps.value]])[idx];
        }
        */
        widgetConfig.dataSourceLabel = this.options.find(opt => opt.properties.value == selectedProps.value).data.label;
        widgetConfig.data = getData(CHART_DATA_SOURCE[DTSRC_MAP[selectedProps.value]]);
        if (!_.isFinite(_.get(widgetConfig, "bar_chart_options.scales.yAxes[0].ticks.max"))) {
          const maxAxisValue = d3.max(widgetConfig.data) + Math.ceil(d3.max(widgetConfig.data) * 0.2);
          _.set(widgetConfig, "bar_chart_options.scales.yAxes[0].ticks.max", maxAxisValue);
          _.set(widgetConfig, "bar_chart_options.scales.xAxes[0].ticks.max", maxAxisValue);
        }
        widgetConfig.labelFn = function (config, datum, idx) {
          return Object.keys(CHART_DATA_SOURCE[DTSRC_MAP[selectedProps.value]])[idx];
        }
      }
    }
  },
  tickOpt: {
    type: 'number',
    label: "Ticks",
    getValue: function (widgetConfig, /* editable param */) {
      if (widgetConfig.type != "horizontal-bar")
        return _.get(widgetConfig, 'bar_chart_options.scales.yAxes[0].ticks.maxTicksLimit', '[empty]');
      return _.get(widgetConfig, 'bar_chart_options.scales.xAxes[0].ticks.maxTicksLimit', '[empty]');
      /*
      return _.get(widgetConfig, 'bar_chart_options.scales.yAxes[0].ticks.maxTicksLimit',
          _.get(widgetConfig, 'bar_chart_options.scales.xAxes[0].ticks.maxTicksLimit', '[empty]'));
          */
    },
    setValue: function (widgetConfig /*editable param*/, newVal) {
      // _.set(widgetConfig, 'bar_chart_options.scales.xAxes[0].ticks.maxTicksLimit', Math.round(Number(newVal)) || 11);
      if (widgetConfig.type !== "horizontal-bar")
        _.set(widgetConfig, 'bar_chart_options.scales.yAxes[0].ticks.maxTicksLimit', Math.round(Number(newVal)) || null);
      else
        _.set(widgetConfig, 'bar_chart_options.scales.xAxes[0].ticks.maxTicksLimit', Math.round(Number(newVal)) || null);
    }
  },
  chartLabelOpt: {
    type: 'text',
    label: "Label",
    getValue: function (widgetConfig, /* editable param */) {
      return widgetConfig.title || "[empty]";
    },
    setValue: function (widgetConfig /*editable param*/, newVal) {
      widgetConfig.title = newVal;
    }
  },
  chartShowLabel: {
    type: 'checkbox',
    label: 'Segment Labels',
    getValue: function (widgetConfig) {
      return (widgetConfig.chart_options || {}).showSegmentLabel;
    },
    setValue: function (widgetConfig, newVal) {
      if (!widgetConfig.chart_options)
        widgetConfig.chart_options = {};
      widgetConfig.chart_options.showSegmentLabel = newVal;
    }
  },
  yAxisMin: {
    type: 'number',
    label: "Axis Min",
    getValue: function (widgetConfig, /* editable param */) {
      return _.get(widgetConfig, 'bar_chart_options.scales.yAxes[0].ticks.min',
          _.get(widgetConfig, 'bar_chart_options.scales.xAxes[0].ticks.min', '[empty]'));
    },
    setValue: function (widgetConfig /*editable param*/, newVal) {
      _.set(widgetConfig, 'bar_chart_options.scales.xAxes[0].ticks.min', Math.round(Number(newVal)) || 0);
      _.set(widgetConfig, 'bar_chart_options.scales.yAxes[0].ticks.min', Math.round(Number(newVal)) || 0);
    }
  },
  yAxisMax: {
    type: 'number',
    label: "Axis Max",
    getValue: function (widgetConfig, /* editable param */) {
      return _.get(widgetConfig, 'bar_chart_options.scales.yAxes[0].ticks.max',
          _.get(widgetConfig, 'bar_chart_options.scales.yAxes[0].ticks.max', '[empty]'));
    },
    setValue: function (widgetConfig /*editable param*/, newVal) {
      _.set(widgetConfig, 'bar_chart_options.scales.xAxes[0].ticks.max', Math.round(Number(newVal)) || 100);
      _.set(widgetConfig, 'bar_chart_options.scales.yAxes[0].ticks.max', Math.round(Number(newVal)) || 100);
    }
  }
});
app.value('chartDataSource', CHART_DATA_SOURCE)
app.component(componentName, {
  template: require("./template.html"),
  controller: baseMapController,
  controllerAs: "self",
  bindings: {
    zoneDefault: "@",
    hasWiLogin: "<",
    projectId: "<",
    hasProjectList: "<",
    username: "@",
    password: "@",
    getLoginUrl: "<"
  },
  transclude: true
});

const AxesUnitOptions = [
  {label: "m", ratio: 1},
  {label: "km", ratio: 1/1000}
]

const WellPositionOptions = [
  {label: "top", value: "top"},
  {label: "base", value: "base"},
]
const WellDisplayModeOptions = [
  {label: "Derrick", value: "derrick"},
  {label: "Status", value: "status"},
]
const WellSizeOptions = [
  {label: "0 (Hide)", value: "0"},
  {label: "0.1", value: "0.2"},
  {label: "0.25", value: "0.4"},
  {label: "0.5", value: "0.6"},
  {label: "1 (Default)", value: "1"},
  {label: "2", value: "1.1"},
  {label: "3", value: "1.4"},
  {label: "4", value: "1.6"},
  {label: "5", value: "1.9"},
]

function baseMapController(
  $scope,
  $http,
  $element,
  wiToken,
  $timeout,
  $location,
  ngDialog,
  wiApi,
  wiDialog,
  chartDataSource,
  Upload
) {
  let self = this;
  window._basemap = self;
  window.$scope = $scope
  self.noWell = true;
  $scope.wellSelect = [];
  $scope.focusWell = [];
  self.clearClipboardFocusWell = true;
  $scope.allPopup = true;
  $scope.themeMap = 6;
  self.activeTheme = "Standard";
  self.controlPanel = true;
  self.point = true;
  self.showingTimeDialogError = 5;
  self.showContour = false;
  self.showContourStroke = true;
  self.contourTransparency = 0.5;
  self.contourStep = 10;
  self.showTrajectory = true;
  self.showAxes = true;
  self.axesUnitOptions = AxesUnitOptions;
  self.wellPositionOptions = WellPositionOptions;
  self.wellDisplayModeOptions = WellDisplayModeOptions;
  self.wellSizeOptions = WellSizeOptions;
  self.wellPosition = self.wellPositionOptions[0].value;
  self.popupPosition = self.wellPositionOptions[0].value;
  self.wellDisplayMode = self.wellDisplayModeOptions[0].value;
  self.wellSize = self.wellSizeOptions[4].value;
  self.axesUnit = self.axesUnitOptions[0];
  self.selectedIdsHash = {};
  self.selectedNode = null;
  self.selectedNodes = [];
  self.showLoading = false;
  self.showLoadingDashboard = false;
  self.showMap = undefined;
  self.darkMode = false;
  self.showZonesets = false;
  self.showMarkersets = false;

  $scope.zoneDepthSpecs = [
    { label: 'Zone Top', value: 'zone-top' },
    { label: 'Zone Middle', value: 'zone-middle' },
    { label: 'Zone Bottom', value: 'zone-bottom' },
  ];
  self.zoneDepthSpec = $scope.zoneDepthSpecs[0].value;
  $scope.curveList = [];
  $scope.zoneList = [];
  $scope.markerList = [];
  $scope.focusCurve = null;
  self.dashboardColumns = 2;
  const geoJsonDefault = {
    type: "FeatureCollection",
    features: []
  };
  $scope.checkGoogleApi = function () {
    return window.google;
  }

  $('#map-upfile-1-btn').bind("click", function () {
    $('#map-upfile-1').val("");
    $('#map-upfile-1').click();
  });
  $scope.GetFileSizeNameAndType = function () {
    let fi = document.getElementById('map-upfile-1');
    let totalFileSize = 0;
    if (fi.files.length > 0) {
      document.getElementById('fp').innerHTML = ''
      for (let i = 0; i <= fi.files.length - 1; i++) {
        let fsize = fi.files.item(i).size;
        totalFileSize = totalFileSize + fsize;
        document.getElementById('fp').innerHTML =
          document.getElementById('fp').innerHTML
          + '<b>File Name: </b>' + fi.files.item(i).name + '</br>'
          + '<b>File Size: </b>' + Math.round((fsize / 1024)) + 'KB </br>'
          + '<b>File Type: </b>' + fi.files.item(i).type + "</br>";
      }
    }
  }
  $('#map-upfile-2-btn').bind("click", function () {
    $('#map-upfile-2').val("");
    $('#map-upfile-2').click();
  });
  $scope.GetFileSizeNameAndType2 = function () {
    let fi = document.getElementById('map-upfile-2');
    let totalFileSize = 0;
    if (fi.files.length > 0) {
      document.getElementById('fp2').innerHTML = ''
      for (let i = 0; i <= fi.files.length - 1; i++) {
        let fsize = fi.files.item(i).size;
        totalFileSize = totalFileSize + fsize;
        document.getElementById('fp2').innerHTML =
          document.getElementById('fp2').innerHTML
          + '<b>File Name: </b>' + fi.files.item(i).name + '</br>'
          + '<b>File Size: </b>' + Math.round((fsize / 1024)) + 'KB </br>'
          + '<b>File Type: </b>' + fi.files.item(i).type + "</br>";
      }
    }
  }


  self.geoJson = geoJsonDefault;
  $scope.clearSelectedFile = function (event) {
    // const files = $element.find("input.file-upload")[0].files;
    const files = $element.find("input#map-upfile-1")[0].files;
    if (!files || files.length == 0) {
      self.geoJson = geoJsonDefault;
      $scope.$digest();
    }
  };

  // let data = {
  //   idProject: 1
  // };
  // console.log("Hahahah", data);
  // wiApiService.getProject(data, function(response) {
  //   console.log(response);
  // });
  $scope.onFileChange = function () {
    // const files = $element.find("input.file-upload")[0].files;
    const files = $element.find("input#map-upfile-1")[0].files;
    const file = files[0];
    if (file) {
      console.log(file);
      if (/(.geojson|.json)/.exec(file.name)) {
        console.log("geojson file reached");
        const reader = new FileReader();
        reader.onload = function (event) {
          console.log(event);
          self.geoJson = JSON.parse(event.target.result);
          $scope.$digest();
        };
        reader.onerror = function (event) {
          console.error(event);
        };
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = function (event) {
          shp(event.target.result)
            .then(geojson => {
              self.geoJson = geojson;
              $scope.$digest();
            })
            .catch(e => console.error(e));
        };
        reader.onerror = function (event) {
          console.error(event);
        };
        reader.readAsArrayBuffer(file);
      }
    }
  };


  function parseGridFileContent(fileContent) {
    const lines = fileContent.split("\n");
    let headerLineIdx = -1;
    let startReadData = false;
    const returnData = {
      data: [],
      headers: {}
    }
    for (let i = 0; i < lines.length; ++i) {
      let line = lines[i].trim()
      if (line.match(/^!/)) {
        // comment
        continue;
      } else if (line.match(/^@Grid/)) {
        headerLineIdx = 0;
        lineData = line.split(",");
        returnData.headers["gridNodesPerPhysicalLine"] = Number(lineData[2]);
        continue;
      } else if (headerLineIdx == 0) {
        // read first header line
        lineData = line.split(",");
        if (lineData.length) {
          returnData.headers["nodeWidth"] = Number(lineData[0]);
          returnData.headers["numNullValue"] = Number(lineData[1]);
          returnData.headers["textNullValue"] = Number(lineData[2]);
          returnData.headers["numOfDecimal"] = Number(lineData[3]);
          returnData.headers["startCol"] = Number(lineData[4]);

          headerLineIdx = 1;
        }
      } else if (headerLineIdx == 1) {
        // read second header line
        lineData = line.split(",");
        if (lineData.length) {
          returnData.headers["numOfRows"] = Number(lineData[0]);
          returnData.headers["numOfCols"] = Number(lineData[1]);
          returnData.headers["minX"] = Number(lineData[2]);
          returnData.headers["maxX"] = Number(lineData[3]);
          returnData.headers["minY"] = Number(lineData[4]);
          returnData.headers["maxY"] = Number(lineData[5]);

          headerLineIdx = 2;
        }
      } else if (headerLineIdx == 2) {
        lineData = line.split(",");
        if (lineData.length) {
          headerLineIdx = 3;
        }
      } else if (headerLineIdx >= 3 && line.match(/^@$/)) {
        // reading data
        startReadData = true;
        continue;
      } else if (startReadData) {
        lineData = line.split(/\s+/);
        if (lineData.length) {
          if (returnData.data[returnData.data.length - 1] && returnData.data[returnData.data.length - 1].length < returnData.headers["numOfRows"])
            //concatinating new data
            returnData.data[returnData.data.length - 1] = returnData.data[returnData.data.length - 1].concat(lineData.map(v => Number(v)));
          else if (returnData.data.length < returnData.headers["numOfCols"]) {
            returnData.data.push(lineData.map(v => Number(v)))
          }
        }
        continue;
      } else if (headerLineIdx < 0) {
        continue;
      }
    }
    return returnData;
  }

  $scope.onGridFileChange = function() {
    const files = $element.find("input#map-upfile-text")[0].files;
    if (files[0]) {
      // console.log(files[0]);
      const reader = new FileReader();
      reader.onload = function(event) {
        // console.log(event.target.result);
        data = parseGridFileContent(event.target.result);
        console.log(data);
      }
      reader.readAsText(files[0]);
      reader.onerror = function (event) {
        console.error(event);
      };
    }
  }

  $scope.clearSelectedConfigFile = function (event) {
    // const files = $element.find("input.file-upload")[1].files;
    const files = $element.find("input#map-upfile-2")[0].files;
    if (!files || files.length == 0) {
      $scope.wellSelect = [];
      $scope.curveList = [];
      $scope.zoneList = [];
      $scope.markerList = [];
      self.geoJson = geoJsonDefault;
      $scope.themeMap = 6;
      $scope.allPopup = false;
      self.activeTheme = "Custom theme";
      self.controlPanel = true;
      self.point = false;
      self.showContour = false;
      self.showTrajectory = false;
      self.showAxes = false;
      self.wellPositionOptions = "top";
      self.darkMode = false;
      self.showZonesets = false;
      self.showMarkersets = false;
      getZoneList();

      self.noWell = true;
      if (!$scope.$$phase) {
        $scope.$digest();
      }
    }
  };

  $scope.onZipFileChange = function () {
    // const files = $element.find("input.file-upload")[1].files;
    const files = $element.find("input#map-upfile-2")[0].files;
  
    console.log(files);
    const file = files[0];
    if (file) {
      console.log(file);
      if (/(.zip)/.exec(file.name)) {
        console.log(".zip file upzip");
        JSZip.loadAsync(file)
          .then(function (zip) {
            return {
              contour: zip.file("contour.json").async("string"),
              mapSetting: zip.file("mapsetting.json").async("string"),
              blocks: zip.file("blocks.geojson").async("string"),
              contourConfig: zip.file('contourConfig.zip').async("blob")
            };
          })
          .then(async function (result) {
            await result.contour.then(function (data) {
              return new Promise(resolve => {
                data = JSON.parse(data);
                let wells = [];
                async.each(data.selectWell, (w, next) => {
                    wiApi.getFullInfoPromise(w.idProject, w.owner, w.nameOwner).then((project) => {
                      console.log(project)
                      proWells = project.wells;
                      wll = proWells.find(wl => wl.idWell == w.idWell)
                      wll ? wells.push(wll) : null
                      next()
                    }).catch((err) => {
                      next(err);
                    });
                }, (err) => {
                  // console.log(wells)
                  data.selectWell = wells;
                  $scope.wellSelect = data.selectWell || [];

                  $scope.curveList = data.selectCurve || [];
                  $scope.zoneList = data.selectedZone || [];
                  $scope.markerList = data.selectedMarker || [];
                  self.noWell = false;
                  $scope.focusCurve = $scope.curveList.find(c => c._selected);
                  let selectedZoneset = $scope.zoneList.find(zs => zs.zones.find(z => z._selected));
                  let selectedMarkerset = $scope.markerList.find(ms => ms.markers.find(m => m._selected));
                  $scope.focusMZ = selectedZoneset
                      ? selectedZoneset.zones.find(z => z._selected)
                      : selectedMarkerset ? selectedMarkerset.markers.find(m => m._selected) : null
                  $timeout(async () => {
                    await updateCurveList();
                    await updateZoneList();
                    await updateMarkerList();
                    resolve();
                  });
                })
              })
            });

            await result.mapSetting.then(function (data) {
              return new Promise(resolve => {
                data = JSON.parse(data);
                $scope.themeMap = data.themeMap;
                $scope.allPopup = data.allPopup;
                self.activeTheme = data.activeTheme;
                self.controlPanel = data.controlPanel;
                self.point = data.point;
                self.showContour = data.showContour;
                self.showContourPanel = data.showContourPanel;
                self.showTrajectory = data.showTrajectory;
                self.showAxes = data.showAxes;
                self.wellPosition = data.wellPosition;
                self.popupPosition = data.popupPosition;
                self.darkMode = data.darkMode;
                self.wellDisplayMode = (self.wellDisplayModeOptions.find(o => o.value == data.wellDisplayMode) || self.wellDisplayModeOptions[0]).value;
                self.wellSize = data.wellSize;
                setDarkMode(self.darkMode);
                self.showZonesets = data.showZonesets;
                self.showMarkersets = data.showMarkersets;
                $scope.zoneMap = data.zoneMap;
                $timeout(() => {
                  if (!$scope.$$phase) {
                    $scope.$apply();
                    resolve();
                  };
                })
              })
            });

            // update contour configs
            importContourConfig(result.contourConfig)
              .then(() => {
                $scope.wellSelect.forEach(w => {
                  self.contourConfig.addWell(w);
                  $timeout(() => {
                    self.contourConfig.onChangePopupPosition();
                    self.contourConfig.onChangeWellPosition();
                    self.contourConfig.onChangeWellDisplayMode();
                    self.contourConfig.onWellSizeChanged();
                  })
                })
              })

            result.blocks.then(function (data) {
              data = JSON.parse(data);
              self.geoJson = data;
              $scope.$digest();
            });
          });
      } else {
        const reader = new FileReader();
        reader.onload = function (event) {
          shp(event.target.result).catch(e => console.error(e));
        };
        reader.onerror = function (event) {
          console.error(event);
        };
        reader.readAsArrayBuffer(file);
      }
    }
  };
  this.changeLayout = function (showmap) {
    if(!self.showDashboard && !self.showMap) {
      self.showDashboard = true;
    }
    if(!showmap){
      $(".main").addClass("change-layout");
      $(".dialog").addClass("change-layout-dialog");
    } else if (showmap){
      $(".main").removeClass("change-layout");
      $(".dialog").removeClass("change-layout-dialog");
    }
  }

  async function getDashboardTemplate() {
    return new Promise(resolve => {
      ngDialog.open({
        template: "dashboard-template-modal",
        scope: $scope,
        preCloseCallback: function() {
          console.log("close modal");
          return true;
        },
        controller: ["$scope", function ($scope) {
          const self = this;
          this.mode = "load-dashboard";
          this.selectedNode = null;
          this.options = [];
          this.getDashboardTemplateList = function(wiDropdownCtrl) {
            httpPost("/managementdashboard/list", {})
              .then(res => {
                if (!res || !res.data.content.length) {
                  $scope.closeThisDialog();
                  return;
                }
                const templateList = res.data.content.map(dbTemplate => {
                  dbTemplate.content = JSON.parse(dbTemplate.content);
                  return dbTemplate;
                })
                this.options = templateList.map((props)=> {
                  return {
                    data: { label: props.content.name },
                    properties: props
                  }
                });
                wiDropdownCtrl.items = this.options;
              });
          }
          this.getValue = () => {
            return this.selectedNode;
          }
          this.setValue = (selected) => {
            this.selectedNode = selected;
          }
          this.deleteTemplate = (item) => {
            confirmDialog("Are you sure to delete this template")
              .then(() => {
                httpPost("/managementdashboard/delete", { idManagementDashboard: item.properties.idManagementDashboard })
                  .then(res => {
                    console.log(res);
                  })
                  .catch(err => {
                    console.error(err);
                  })
              })
          }
          this.loadDashboardTemplate = () => {
            resolve(angular.copy(this.selectedNode.content));
            $scope.closeThisDialog();
          }
        }],
        controllerAs: "wiModal"
      });
    })
  }
  async function getDashboardTemplate1() {
    return new Promise(resolve => {
      const self = this;
      this.mode = "load-dashboard";
      this.selectedNode = null;
      this.options = [];
      
      httpPost("/managementdashboard/list", {})
        .then(res => {
          if (!res || !res.data.content.length) {
            return;
          }
          const templateList = res.data.content.map(dbTemplate => {
            dbTemplate.content = JSON.parse(dbTemplate.content);
            return dbTemplate;
          })
          let options = templateList.map((props)=> {
            return {
              data: { label: props.content.name },
              properties: props
            }
          });
          let config = {
            title: "Select Template",
            inputName: "Template Name",
            selectionList: options,
            onCtrlBtnClick: function(item, e, wiDropdown) {
              console.log(item, e, wiDropdown);
              let index = wiDropdown.items.indexOf(item);
              wiDialog.confirmDialog("Delete template?", "Are you sure?", function(res) {
                if(res) {
                  httpPost("/managementdashboard/delete", { idManagementDashboard: item.properties.idManagementDashboard })
                  .then(res => {
                    console.log(res);
                    $timeout(() => {
                      wiDropdown.items.splice(index, 1);
                      wiDropdown.selectedItem = wiDropdown.items.length ? wiDropdown.items[0] : null
                    })
                  })
                  .catch(err => {
                    console.error(err);
                  });
                }
              })
            },
            hideButtonDelete: false,
            iconBtn: 'fa fa-times-circle line-height-1_5'
          }
          wiDialog.promptListDialog(config, function(selectItem) {
            console.log(selectItem);
            resolve(angular.copy(selectItem.content));
            
          });
        });
    })
  }
  function confirmDialog(message) {
    return new Promise(resolve => {
      ngDialog.open({
        template: 'dashboard-template-modal',
        controller: ['$scope', function ($scope) {
          this.mode = "confirm-modal";
          this.message = message;
          this.onOkButtonClicked = function () {
            resolve();
            $scope.closeThisDialog();
          }
        }],
        controllerAs: 'wiModal'
      })
    })
  }

  this.reloadDashboardData = function() {
    self.showLoadingDashboard = true;
    wiApi.getFullInfoPromise(self.selectedNode.idProject, self.selectedNode.owner, self.selectedNode.owner ? self.selectedNode.name : null)
    .then((prjTree) => {
      result = groupWells(prjTree);
      Object.assign(CHART_DATA_SOURCE, result)
      self.dashboardContent.project = prjTree
      self.dashboardContent.forEach(widgetConfig => {
        const data = result[DTSRC_MAP[DTSRC_OPTIONS_MAP[widgetConfig.config.dataSourceLabel]]];
        const __data = getData(data);
        const maxAxisValue = d3.max(__data) + Math.ceil(d3.max(__data) * 0.2);
        _.set(widgetConfig, "config.bar_chart_options.scales.yAxes[0].ticks.max", maxAxisValue);
        _.set(widgetConfig, "config.bar_chart_options.scales.xAxes[0].ticks.max", maxAxisValue);
        Object.assign(widgetConfig.config, {
          data: __data,
          // dataSources: result,
          labelFn: function (config, datum, idx) {
            return Object.keys(data)[idx];
          },
          colorFn: function (config, datum, idx) {
            if (config.colors && config.colors[idx]) return config.colors[idx];
            let palette = wiApi.getPalette(config.paletteName || "RandomColor");
            idx = idx % palette.length;
            return `rgba(${palette[idx % palette.length].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
          }
        })
      })
    }).catch((e) => {
      console.error(e);
    }).finally(() => {
      console.log("finally reload data");
      self.showLoadingDashboard = false;
      $scope.$digest();
    });
  }
  this.loadDashboard = async function() {
    // const config = await getDashboardTemplate();
    const config = await getDashboardTemplate1();
    if (!config) return;
    const widgetConfigs = config.widgets;
    self.showLoadingDashboard = true;
    wiApi.getFullInfoPromise(self.selectedNode.idProject, self.selectedNode.owner, self.selectedNode.owner ? self.selectedNode.name : null).then((prjTree) => {
      projectTree = prjTree;
      let result = groupWells(prjTree);
      Object.assign(CHART_DATA_SOURCE, result)

      const _dashboardContent = widgetConfigs.map(wConfig => {
        const data = result[DTSRC_MAP[DTSRC_OPTIONS_MAP[wConfig.config.dataSourceLabel]]];
        const __data = getData(data);
        const maxAxisValue = d3.max(__data) + Math.ceil(d3.max(__data) * 0.2);
        _.set(wConfig, "config.bar_chart_options.scales.yAxes[0].ticks.max", maxAxisValue);
        _.set(wConfig, "config.bar_chart_options.scales.xAxes[0].ticks.max", maxAxisValue);
        Object.assign(wConfig.config, {
          data: __data,
          // dataSources: result,
          labelFn: function (config, datum, idx) {
            return Object.keys(data)[idx];
          },
          colorFn: function (config, datum, idx) {
            if (config.colors && config.colors[idx]) return config.colors[idx];
            let palette = wiApi.getPalette(config.paletteName || "RandomColor");
            idx = idx % palette.length;
            return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
          }
        })
        return wConfig;
      });
      _dashboardContent.project = prjTree;
      self.dashboardContent = _dashboardContent;
    }).catch((e) => {
      console.error(e);
    }).finally(() => {
      self.showLoadingDashboard = false;
      $scope.$digest();
    });
  }
  this.saveDashboard = function() {
    const content = self.dashboardContent.map(widget => {
      const { name, id, config } = widget;
      const _config = {
        type: config.type,
        dataSourceLabel: config.dataSourceLabel,
        title: config.title,
        bar_chart_options: config.bar_chart_options,
        chart_options: config.chart_options
      };

      return {
        name, id, config: _config
      }
    });
    const payload = {
      name: `${self.dashboardContent.project.alias}-dashboard-template`,
      widgets: content
    };
    ngDialog.open({
      template: "dashboard-template-modal",
      scope: $scope,
      controller: ["$scope", function($scope) {
        this.mode = "new-dashboard";
        this.config = payload;
        this.setValue = (param, newVal) => {
          this.config.name = newVal;
        }
        this.getValue = () => {
          return this.config.name || "";
        }
        function checkAvailableDashboard(dshbrdName) {
          return new Promise(resolve => {
            httpPost("/managementdashboard/list", {})
              .then(res => {
                if (!res || !res.data.content.length) {
                  return resolve(null);
                }
                const templateList = res.data.content.map(dbTemplate => {
                  dbTemplate.content = JSON.parse(dbTemplate.content);
                  return dbTemplate;
                });
                const hasName = templateList.find(props => props.content.name === dshbrdName);
                if (hasName) {
                  confirmDialog("This template name has been used. Replace it?")
                    .then(() => {
                      resolve(hasName.idManagementDashboard);
                    })
                } else {
                  return resolve(null);
                }
              })
          })
        }
        this.saveDashboardTemplate = function() {
          checkAvailableDashboard(this.config.name)
            .then(idMngDshbrd => {
              const path = `/managementdashboard/${idMngDshbrd !== null ? "edit":"new"}`;
              httpPost(path, { content: JSON.stringify(payload), idManagementDashboard: idMngDshbrd })
                .then(res => {
                  console.log(res);
                })
                .catch(err => {
                  console.error(err);
                });
            })
          $scope.closeThisDialog();
        }
      }],
      controllerAs: "wiModal"
    });
  }
  this.saveDashboard1 = function() {
    const content = self.dashboardContent.map(widget => {
      const { name, id, config } = widget;
      const _config = {
        type: config.type,
        dataSourceLabel: config.dataSourceLabel,
        title: config.title,
        bar_chart_options: config.bar_chart_options,
        chart_options: config.chart_options
      };

      return {
        name, id, config: _config
      }
    });
    var payload = {
      name: `${self.dashboardContent.project.alias}-dashboard-template`,
      widgets: content
    };
    this.config = payload;
    function checkAvailableDashboard(dshbrdName) {
        return new Promise(resolve => {
          httpPost("/managementdashboard/list", {})
            .then(res => {
              if (!res || !res.data.content.length) {
                return resolve(null);
              }
              const templateList = res.data.content.map(dbTemplate => {
                dbTemplate.content = JSON.parse(dbTemplate.content);
                return dbTemplate;
              });
              const hasName = templateList.find(props => props.content.name === dshbrdName);
              if (hasName) {
                wiDialog.confirmDialog("Confirm",
                `Template <b>"${dshbrdName}"</b> already exists! Are you sure you want to replace it ?`,
                function(res) {
                    res ? resolve(hasName.idManagementDashboard) : resolve(null)
                })
              } else {
                return resolve(null);
              }
            })
        })
    }
    let config = {
      title: "Save Template",
      inputName: "Template Name",
      input: `${self.dashboardContent.project.alias}-dashboard-template`
    }
    wiDialog.promptDialog(config, function(name) {
      payload.name = name;
      checkAvailableDashboard(name)
      .then((idMngDshbrd) => {
        const path = `/managementdashboard/${idMngDshbrd !== null ? "edit":"new"}`;
        httpPost(path, { content: JSON.stringify(payload), idManagementDashboard: idMngDshbrd })
          .then(res => {
            console.log(res);
          })
          .catch(err => {
            console.error(err);
          });
      })
    })
  }

  async function httpPost(path, payload) {
    return await $http({
      method: "POST",
      url: BASE_URL + path,
      data: payload,
      headers: {
        Authorization: wiToken.getToken()
      }
    });
  }

  this.addDashboard = function () {
    self.showLoadingDashboard = true;
    wiApi.getFullInfoPromise(self.selectedNode.idProject, self.selectedNode.owner, self.selectedNode.owner ? self.selectedNode.name : null).then((prjTree) => {
      projectTree = prjTree;
      let result = groupWells(projectTree);
      Object.assign(CHART_DATA_SOURCE, result)
      const wellByTypeData = getData(result.wTypes);
      const maxWellTypeData = d3.max(wellByTypeData);
      let WidgetConfig = {
        name: "New Dashboard",
        config: {
          type: 'bar',
          data: wellByTypeData,
          dataSourceLabel: "Well By Type",
          // dataSources: result,
          labelFn: function (config, datum, idx) {
            return Object.keys(result.wTypes)[idx];
          },
          colorFn: function (config, datum, idx) {
            if (config.colors && config.colors[idx]) return config.colors[idx];
            let palette = wiApi.getPalette(config.paletteName || "RandomColor");
            idx = idx % palette.length;
            return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
          },
          title: 'New Dashboard',
          bar_chart_options: {
            scales: {
              yAxes: [{
                ticks: {
                  maxTicksLimit: 10,
                  min: 0,
                  max: _.isFinite(maxWellTypeData) ? maxWellTypeData : undefined
                }
              }],
              xAxes: [{
                ticks: {
                  min: 0,
                max: _.isFinite(maxWellTypeData) ? maxWellTypeData : undefined
                }
              }]
            }
          }
        },
        // setting: true
        id: getUniqChartID()
      }
      $timeout(() => {
        self.dashboardContent.push(WidgetConfig);
      });
    }).catch((e) => {
      console.error(e);
    }).finally(() => {
      self.showLoadingDashboard = false;
    });
  }

  const errorDialog = function (message) {
    self.showError = true;
    $scope.message = message;
    $timeout(()=>{
      self.showError = false;
    },self.showingTimeDialogError*1000)
  };

  this.openDashboard = function () {
    if (!self.selectedNode) {
      // show warning
      errorDialog("Please select a project to show Dashboard");
      return;
    }
    // self.showDashboard = !self.showDashboard; 
    self.showLoadingDashboard = true;
    wiApi.getFullInfoPromise(self.selectedNode.idProject, self.selectedNode.owner, self.selectedNode.owner ? self.selectedNode.name : null).then((prjTree) => {
      projectTree = prjTree;
      buildDashboard(projectTree);
    }).catch((e) => {
      console.error(e);
    }).finally(() => {
      self.showLoadingDashboard = false;
    });
  }
  function buildDashboard(prjTree) {
    let result = groupWells(prjTree);
    Object.assign(CHART_DATA_SOURCE, result)
    const wellTypeData = getData(result.wTypes);
    const maxWellTypeData = d3.max(wellTypeData) + Math.ceil(0.2 * d3.max(wellTypeData));
    let wTypeWidgetConfig = {
      name: "Well Type",
      config: {
        type: 'bar',
        data: wellTypeData,
        // dataSources: result,
        dataSourceLabel: 'Well By Type',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.wTypes)[idx];
        },
        colorFn: function (config, datum, idx) {
            if (config.colors && config.colors[idx]) return config.colors[idx];
          let palette = wiApi.getPalette(config.paletteName || "RandomColor");
            idx = idx % palette.length;
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        },
        title: 'Well Type',
        bar_chart_options: {
          scales: {
            yAxes: [{
              ticks: {
                maxTicksLimit: 10,
                min: 0,
                max: _.isFinite(maxWellTypeData) ? maxWellTypeData : undefined
              }
            }],
            xAxes: [{
              ticks: {
                // maxTicksLimit: 10,
                min: 0,
                max: _.isFinite(maxWellTypeData) ? maxWellTypeData : undefined
              }
            }]
          }
        },
      },
      id: getUniqChartID()
    }

    const fieldWidgetData = getData(result.fields);
    const maxFieldData = d3.max(fieldWidgetData) + Math.ceil(d3.max(fieldWidgetData) * 0.2);
    let fieldWidgetConfig = {
      name: "Fields",
      config: {
        type: 'bar',
        data: fieldWidgetData,
        // dataSources: result,
        dataSourceLabel: 'Well By Field',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.fields)[idx];
        },
        colorFn: function (config, datum, idx) {
            if (config.colors && config.colors[idx]) return config.colors[idx];
          // return 'rgba(64,64,200,0.7)';
          let palette = wiApi.getPalette(config.paletteName || "RandomColor");
            idx = idx % palette.length;
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        },
        bar_chart_options: {
          scales: {
            yAxes: [{
              ticks: {
                maxTicksLimit: 10,
                min: 0,
                max: _.isFinite(maxFieldData) ? maxFieldData:undefined
              }
            }],
            xAxes: [{
              ticks: {
                // maxTicksLimit: 10,
                min: 0,
                max: _.isFinite(maxFieldData) ? maxFieldData:undefined
              }
            }]
          }
        },
        title: 'Fields'
      },
      id: getUniqChartID()
    }

    const operatorWidgetData = getData(result.operators);
    const maxOperatorData = d3.max(operatorWidgetData) + Math.ceil(d3.max(operatorWidgetData) * 0.2);
    let operatorWidgetConfig = {
      name: "Operators",
      config: {
        type: 'bar',
        data: operatorWidgetData,
        // dataSources: result,
        dataSourceLabel: 'Well By Operator',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.operators)[idx];
        },
        colorFn: function (config, datum, idx) {
            if (config.colors && config.colors[idx]) return config.colors[idx];
          // return 'rgba(64,200,64,0.7)';
          let palette = wiApi.getPalette(config.paletteName || "RandomColor");
            idx = idx % palette.length;
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        },
        title: "Operators",
        bar_chart_options: {
          scales: {
            yAxes: [{
              ticks: {
                maxTicksLimit: 10,
                min: 0,
                max: _.isFinite(maxOperatorData) ? maxOperatorData:undefined
              }
            }],
            xAxes: [{
              ticks: {
                // maxTicksLimit: 10,
                min: 0,
                max: _.isFinite(maxOperatorData) ? maxOperatorData:undefined
              }
            }]
          }
        },
      },
      id: getUniqChartID()
    }
    const tagWidgetData = getData(result.tags);
    const maxTagData = d3.max(tagWidgetData) + Math.ceil(d3.max(tagWidgetData) * 0.2);
    let tagWidgetConfig = {
      name: "Tags",
      config: {
        type: 'bar',
        data: tagWidgetData,
        // dataSources: result,
        dataSourceLabel: 'Well By Tag',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.tags)[idx];
        },
        colorFn: function (config, datum, idx) {
            if (config.colors && config.colors[idx]) return config.colors[idx];
          let palette = wiApi.getPalette(config.paletteName || "RandomColor");
            idx = idx % palette.length;
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        },
        title: "Tags",
        bar_chart_options: {
          scales: {
            yAxes: [{
              ticks: {
                maxTicksLimit: 10,
                min: 0,
                max: _.isFinite(maxTagData) ? maxTagData:undefined
              }
            }],
            xAxes: [{
              ticks: {
                // maxTicksLimit: 10,
                min: 0,
                max: _.isFinite(maxTagData) ? maxTagData:undefined
              }
            }]
          }
        },
      },
      id: getUniqChartID()
    }

    const curveTagWidgetData = getData(result.curveTags);
    const maxCurveData = d3.max(curveTagWidgetData) + Math.ceil(d3.max(curveTagWidgetData) * 0.2);
    let curveTagWidgetConfig = {
      name: "Curve Tags",
      config: {
        type: 'bar',
        data: curveTagWidgetData,
        // dataSources: result,
        dataSourceLabel: 'Curve By Tag',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.curveTags)[idx];
        },
        colorFn: function (config, datum, idx) {
            if (config.colors && config.colors[idx]) return config.colors[idx];
          let palette = wiApi.getPalette(config.paletteName || "RandomColor");
            idx = idx % palette.length;
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        },
        title: "Curve Tags",
        bar_chart_options: {
          scales: {
            yAxes: [{
              ticks: {
                maxTicksLimit: 10,
                min: 0,
                max: _.isFinite(maxCurveData) ? maxCurveData : undefined
              }
            }],
            xAxes: [{
              ticks: {
                // maxTicksLimit: 10,
                min: 0,
                max: _.isFinite(maxCurveData) ? maxCurveData : undefined
              }
            }]
          }
        },
      }, 
      id: getUniqChartID()
    }
    $timeout(() => {
      const _dashboardContent = [wTypeWidgetConfig, fieldWidgetConfig, operatorWidgetConfig, tagWidgetConfig, curveTagWidgetConfig];
      _dashboardContent.project = prjTree;
      self.dashboardContent = _dashboardContent;
      // self.dashboardContent = [wTypeWidgetConfig];
    });
  }
  function getUniqChartID() {
    return Math.random().toString(36).substr(2, 9);
  }
  function groupWells(prjTree) {
    let wTypes = {};
    let fields = {};
    let operators = {};
    let tags = {};
    let curveTags = {};

    let wells = prjTree.wells;
    for (let well of wells) {
      const wellHeaders = well.wellheaders;
      for (let wh of wellHeaders) {
        let value = (!wh.value || !wh.value.length) ? "Unknown" : wh.value;
        if (wh.header === "WTYPE") {
          wTypes[value] = wTypes[value] || [];
          wTypes[value].push(well);
        }
        else if (wh.header === "FLD") {
          fields[value] = fields[value] || [];
          fields[value].push(well);
        }
        else if (wh.header === "OPERATOR") {
          operators[value] = operators[value] || [];
          operators[value].push(well);
        }
      }

      if (well.relatedTo && well.relatedTo.tags && well.relatedTo.tags.length) {
        for (let tag of well.relatedTo.tags) {
          if (tag && tag !== "") {
            tags[tag] = tags[tag] || [];
            tags[tag].push(well);
          }
        }
      }
      if (well.datasets.length) {
        well.datasets.forEach(dts => {
          dts.curves.forEach(curve => {
            if (curve.relatedTo && curve.relatedTo.tags && curve.relatedTo.tags.length) {
              for (let tag of curve.relatedTo.tags) {
                curveTags[tag] = curveTags[tag] || [];
                curveTags[tag].push(curve);
              }
            }
          })
        })
      }
    }

    return { wTypes, fields, operators, tags, curveTags };
  }
  this.toggleDarkMode = function () {
    self.darkMode = !self.darkMode;
    document.getElementById("main").classList.toggle("dark-mode");
    $(".dialog").toggleClass("dark-mode");
  }
  this.setAllDone = function(param) {
    console.log(param)
    localStorage.setItem('all-done', param);
  }
  function setDarkMode(enable) {
    if (enable) {
      document.getElementById("main").classList.add("dark-mode");
      $(".dialog").addClass("dark-mode");
    } else {
      document.getElementById("main").classList.remove("dark-mode");
      $(".dialog").removeClass("dark-mode");
    }
  }
  this.toggleContour = function () {
    self.showContour = !self.showContour;
  };
  this.toggleTrajectory = function () {
    self.showTrajectory = !self.showTrajectory;
    if (!self.showTrajectory)
      self.popupPosition = "top";
  };
  this.toggleAxes = function() {
    self.showAxes = !self.showAxes;
  }

  function clearTreeState(treeName) {
    switch (treeName) {
      case 'zoneList':
        $scope.zoneList.forEach(zs => {
          zs._selected = false;
          zs.zones.forEach(z => z._selected = false);
        })
        break;
      case 'markerList':
        $scope.markerList.forEach(ms => {
          ms._selected = false;
          ms.markers.forEach(m => m._selected = false);
        })
        break;
    }
  }
  this.toggleZonesets = function () {
    self.showZonesets = !self.showZonesets;
    if (self.showZonesets && self.showMarkersets) {
      // clear previous marker set state 
      delete $scope.focusMZ;
      clearTreeState('markerList');

      self.showMarkersets = false;
    } else if (!self.showZonesets) {
      // clear previous zone set state
      delete $scope.focusMZ;
      clearTreeState('zoneList');
    }
    self.contourConfig.onChangePopupPosition();
  }
  this.toggleMarkersets = function () {
    self.showMarkersets = !self.showMarkersets;
    if (self.showMarkersets && self.showZonesets) {
      // clear previous zone set state
      delete $scope.focusMZ;
      clearTreeState('zoneList');

      self.showZonesets = false;
    } else if (!self.showMarkersets) {
      // clear previous marker set state 
      delete $scope.focusMZ;
      clearTreeState('markerList');
    }
    self.contourConfig.onChangePopupPosition();
  }

  this.$onInit = function () {
    self.showDialog = false;
    self.baseUrl = $location.search().baseUrl || self.baseUrl;
    // self.getLoginUrl = `${WI_AUTH_HOST}/login`;
    self.loginUrl =
      `${WI_AUTH_HOST}/login` || $location.search().loginUrl || self.loginUrl;
    self.queryString = queryString.parse(location.search);
    self.setDashboardMode = self.queryString.dashboardonly;
    self.queryString.token ? (() => { wiToken.setToken(self.queryString.token);  wiToken.saveToken(self.queryString)})() : null
    if(self.setDashboardMode === "true"){
      self.showMap = false;
      self.showDashboard = true;

    } else {
      self.showDashboard = false;
      self.showMap = true;
    }
    if (localStorage.getItem("token") !== null) {
      getZoneList();
      getCurveTree();
    }
    if(localStorage.getItem('all-done') === "true") {
      $timeout(()=>{
        self.showGuide = false;
      })
    } else {
      $timeout(()=>{
        self.showGuide = true;
      })
    }

    // if (self.username && self.password) {
    //   let data =  {
    //     username: self.username,
    //     password: self.password
    //   };
    //   wiApi.client("WI_BASE_MAP_CLIENT").login(data).then((res) => {
    //       wiToken.setToken(res.token);
    //       wiToken.saveToken(res.token);
    //   }).catch((err) => {
    //     cb(err);
    //   });
    //   // $http({
    //   //   method: "POST",
    //   //   url: `${WI_AUTH_HOST}/login`,
    //   //   data: {
    //   //     username: self.username,
    //   //     password: self.password
    //   //   },
    //   //   headers: {}
    //   // }).then(
    //   //   function (response) {
    //   //     wiToken.setToken(response.data.content.token);
    //   //     wiToken.saveToken(response.data.content);
    //   //   },
    //   //   function (errorResponse) {
    //   //     console.error(errorResponse);
    //   //   }
    //   // );
    // }
    $scope.$watch(
      function () {
        return localStorage.getItem("token");
      },
      function (newValue, oldValue) {
        // console.log(newValue, oldValue);
        if (localStorage.getItem("token") !== null) {
          getZoneList();
          getCurveTree();
        }
      }
    );
    $scope.$watch(
      function () {
        return self.showMap;
      },
      function (newValue, oldValue) {
        self.changeLayout(self.showMap);
      }
    );
  };
  $scope.tab = 1;
  $scope.setTab = function (newTab) {
    $scope.tab = newTab;
  };
  $scope.isSet = function (tabNum) {
    return $scope.tab === tabNum;
  };
  // $timeout(() => {
  //     var elem = document.getElementById('loading');
  //     elem.parentNode.removeChild(elem);
  // }, 5000)
  function getZoneList() {
    $http({
      method: "POST",
      url: `${WI_BACKEND_HOST}/utm-zones`,
      data: {},
      headers: {}
    }).then(
      function (response) {
        $scope.zoneFieldTable = response.data.sort((a, b) => {
          let nameA = a.DisplayName;
          let nameB = b.DisplayName;
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "accent" });
        });
        // Show display value
        $scope.zoneSelected = $scope.zoneFieldTable.find(function (zone) {
          return zone.Name === self.zoneDefault;
        });
        // Get value default
        if ($scope.zoneSelected) {
          $scope.zoneMap = $scope.zoneSelected.output;
        }
        // Change value
        $scope.hasChanged = function (item) {
          $scope.zoneMap = item.output;
          self.contourConfig.utmZones = getUtmZoneLinesForContour();
        };
      },
      function (errorResponse) {
        console.error(errorResponse);
      }
    );
  }
  this.allPopup = function () {
    $scope.allPopup = !$scope.allPopup;
  };
  this.changeStyleMap = function (theme) {
    $scope.themeMap = theme;
  };

  this.refresh = function () {
    // getZoneList();
    getCurveTree();
    // $scope.wellSelect = [];
    $scope.curveList = [];
    $scope.zoneList = [];
    $scope.markerList = [];
    self.noWell = true;
  };

  this.cleanMap = function () {
    self.contourConfig.deleteWells(_.clone(self.contourConfig.wells));
    $scope.wellSelect = [];
    $scope.curveList.length = 0;
    $scope.zoneList.length = 0;
    $scope.markerList.length = 0;
    $scope.focusWell.length = 0;
    $scope.focusCurve = null;
    self.noWell = true;
  };
  this.deleteWell = function () {
    node = self.selectedWellNode;
    console.log("delete selected wells");
    let deleteNodes = Object.values(self.selectedIdsHash);
//    for (let deleteNode of deleteNodes) {
//      let idx = $scope.wellSelect.findIndex(node => self.nodeComparator(node, deleteNode));
//      $scope.wellSelect.splice(idx, 1);
//    }
    const deletedWells = $scope.wellSelect.filter(w => w._selected);
    self.contourConfig.deleteWells(deletedWells);
		$scope.wellSelect = $scope.wellSelect.filter(w => !w._selected);
    $timeout(() => {
      self.selectedIdsHash = {};
      $scope.focusWell.length = 0;
    })
		
    updateCurveList()
      .then(updateZoneList)
      .then(updateMarkerList);
  };

  this.downloadZipFile = async function () {
    var zip = new JSZip();
    console.log("file zip can download!");
    //file contour.json
    var wellSelect = $scope.wellSelect;
    var curveSelect = $scope.curveList;
    var dataContour = {
      selectWell: wellSelect,
      selectCurve: curveSelect,
      selectedZone: $scope.zoneList,
      selectedMarker: $scope.markerList
    };
    var json1 = JSON.stringify(dataContour),
      blob1 = new Blob([json1], { type: "octet/stream" });
    zip.file("contour.json", blob1);

    //file mapsetting.json
    var dataMapSetting = {
      themeMap: $scope.themeMap,
      activeTheme: self.activeTheme,
      controlPanel: self.controlPanel,
      point: self.point,
      allPopup: $scope.allPopup,
      showContour: self.showContour,
      showContourPanel: self.showContourPanel,
      showTrajectory: self.showTrajectory,
      showAxes: self.showAxes,
      wellPosition: self.wellPosition,
      popupPosition: self.popupPosition,
      zoneMap: $scope.zoneMap,
      darkMode: self.darkMode,
      showZonesets: self.showZonesets,
      showMarkersets: self.showMarkersets,
      wellDisplayMode: self.wellDisplayMode,
      wellSize: self.wellSize,
    };
    var json2 = JSON.stringify(dataMapSetting),
      blob2 = new Blob([json2], { type: "octet/stream" });
    zip.file("mapsetting.json", blob2);

    //file blocks.geojson
    var dataBlocks = self.geoJson;
    var json3 = JSON.stringify(dataBlocks),
      blob3 = new Blob([json3], { type: "octet/stream" });
    zip.file("blocks.geojson", blob3);

    const contourConfig = await getContourConfigFile();
    zip.file("contourConfig.zip", contourConfig);

    //Compress file
    zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: {level: 6}})
      .then(content => {
        fileSaver.saveAs(content, "i2G_basemap_configuration.zip");
      });
  };

  this.prepareWellInfoFn = prepareWellInfos;
  async function prepareWellInfos(well) {
    if (!well.datasets || !well.zone_sets || !well.marker_sets) {
      const wellInfo = await new Promise((resolve, reject) => {
        getWellInfo(well.idWell, function (err, wellInfo) {
          if (err) return reject(err);
          resolve(wellInfo);
        });
      });
      Object.assign(well, wellInfo);
    }
    return well;
  }

  /*
  let unitTable = null;
  this.convertUnitFn = convertUnit;
  async function updateUnitTable() {
    $http({
      method: "POST",
      url: BASE_URL + "/family/all-unit",
      data: {},
      headers: {
        Authorization: wiToken.getToken()
      }
    }).then(function (units) {
      unitTable = units;
    });
  }
  function convertUnit (value, fromUnit, destUnit) {
    if ((!Array.isArray(value) && !_.isFinite(value)) || fromUnit === destUnit) return value;
    if (!unitTable) {
      updateUnitTable();
      return value;
    }

    let startUnit = unitTable.find(u => u.name == fromUnit);
    let endUnit = unitTable.find(u => u.name == destUnit);

    if(!startUnit || !endUnit || startUnit.idUnitGroup != endUnit.idUnitGroup)
        return value;
    if (startUnit && endUnit) {
        let sCoeffs = JSON.parse(startUnit.rate);
        let eCoeffs = JSON.parse(endUnit.rate);
        function convert(value) {
            return eCoeffs[0]* (value - sCoeffs[1])/sCoeffs[0] + eCoeffs[1];
        }
        if (Array.isArray(value)) {
            return value.map(convert);
        } else {
            return convert(value);
        }
        //return value * endUnit.rate / startUnit.rate;
    }
    else {
        let errUnit = !startUnit ? fromUnit : destUnit;
        console.error("convert unit error");
        return null;
    }
  }
  */

  function getUniqZones(zoneset) {
    const _clonedZones = angular.copy(zoneset.zones);
    return _(_clonedZones)
      .uniqBy(z => z.idZoneTemplate)
      // create zone node
      .map(z => ({
        name: z.zone_template.name,
        idZone: z.idZone,
        idZoneTemplate: z.idZoneTemplate,
        zonesetName: zoneset.name
      }))
      .sort((za, zb) => za.name.localeCompare(zb.name))
      .value();
  }
  function createZoneSetNode(zoneset) {
    return {
      name: zoneset.name,
      idZoneSet: zoneset.idZoneSet,
      zones: getUniqZones(zoneset)
    }
  }
  async function updateZoneList() {
    const _zonesets = $scope.zoneList;
    const _wells = $scope.wellSelect;
    if (_wells.length === undefined || _wells.length === null) return;
    for (let i = 0; i < _wells.length; ++i) {
      await prepareWellInfos(_wells[i]);
    }
    $timeout(() => {
      _zonesets.length = 0;
      if (!_wells.length) return;
      const firstWell = _wells[0];
      firstWell.zone_sets.forEach(zs => { _zonesets.push(createZoneSetNode(zs)); })
      for (let i = 1; i < _wells.length; ++i) {
        const _well = _wells[i];
        const __zonesets = [];

        _well.zone_sets.forEach(zs => { __zonesets.push(createZoneSetNode(zs)); })

        const _disjoinIndexes = [];
        for (let zsi = 0; zsi < _zonesets.length; ++zsi) {
          const __joinZoneset = __zonesets.find(_zs => _zs.name == _zonesets[zsi].name);
          if (!__joinZoneset) {
            _disjoinIndexes.push(zsi);
          } else {
            /*
            _(_zonesets[zsi].zones)
              .concat(__joinZoneset.zones)
              .uniqBy(z => z.idZoneTemplate);
            */
            _zonesets[zsi].zones = _(_zonesets[zsi].zones)
              .intersectionBy(__joinZoneset.zones, 'idZoneTemplate')
              .value();
          }
        }
        _disjoinIndexes
          .sort((a ,b) => a - b)
          .reverse()
          .forEach(zsi => _zonesets.splice(zsi, 1));
      }
      _zonesets.sort((zsa, zsb) => zsa.name.localeCompare(zsb.name))
    })
  }

  function getUniqMarkers(markerset) {
    const _clonedMarkers = angular.copy(markerset.markers);
    return _(_clonedMarkers)
      .uniqBy(m => m.idMarkerTemplate)
      // create marker node
      .map(m => ({
        name: m.marker_template.name,
        idMarker: m.idMarker,
        markersetName: markerset.name,
        idMarkerTemplate: m.idMarkerTemplate
      }))
      .sort((ma, mb) => ma.name.localeCompare(mb.name))
      .value();
  }
  function createMarkerSetNode(markerset) {
    return {
      name: markerset.name,
      idMarkerSet: markerset.idMarkerSet,
      markers: getUniqMarkers(markerset)
    }
  }
  async function updateMarkerList() {
    const _markersets = $scope.markerList;
    const _wells = $scope.wellSelect;
    if (_wells.length === undefined || _wells.length === null) return;
    for (let i = 0; i < _wells.length; ++i) {
      await prepareWellInfos(_wells[i]);
    }
    $timeout(() => {
      _markersets.length = 0;
      if (!_wells.length) return;
      const firstWell = _wells[0];
      firstWell.marker_sets.forEach(ms => { _markersets.push(createMarkerSetNode(ms)); })
      for (let i = 1; i < _wells.length; ++i) {
        const _well = _wells[i];
        const __markersets = [];

        _well.marker_sets.forEach(ms => { __markersets.push(createMarkerSetNode(ms)); })

        const _disjoinIndexes = [];
        for (let msi = 0; msi < _markersets.length; ++msi) {
          const __joinMarkerset = __markersets.find(_ms => _ms.name == _markersets[msi].name);
          if (!__joinMarkerset) {
            _disjoinIndexes.push(msi);
          } else {
            _markersets[msi].markers = _(_markersets[msi].markers)
              .intersectionBy(__joinMarkerset.markers, 'idMarkerTemplate')
              .value();
            /*
            _(_markersets[msi].markers)
              .concat(__joinMarkerset.markers)
              .uniqBy(m => m.idMarkerTemplate);
            */
          }
        }
        _disjoinIndexes
          .sort((a, b) => a - b)
          .reverse()
          .forEach(msi => _markersets.splice(msi, 1));
        
        _markersets.sort((msa, msb) => msa.name.localeCompare(msb.name))
      }
    })
  }
  async function updateCurveList() {
    const _curves = $scope.curveList;
    const _wells = $scope.wellSelect;
    if (_wells.length === undefined || _wells.length === null) return;
    for (let i = 0; i < _wells.length; ++i) {
      await prepareWellInfos(_wells[i]);
    }
    $timeout(() => {
      _curves.length = 0;
      if (_wells.length) {
        const firstWell = _wells[0];
        firstWell.datasets.forEach(ds => {
          ds.curves.forEach(c => {
            _curves.push({
              name: `${ds.name}.${c.name}`,
              idCurve: c.idCurve
            });
          });
        });
        for (let i = 1; i < _wells.length; ++i) {
          const _well = _wells[i];
          const __curves = [];
          _well.datasets.forEach(ds => {
            ds.curves.forEach(c => {
              __curves.push({
                name: `${ds.name}.${c.name}`,
                idCurve: c.idCurve
              });
            });
          });
          const _disjoinIndexes = [];
          for (let ci = 0; ci < _curves.length; ++ci) {
            if (!__curves.find(_c => _c.name == _curves[ci].name)) {
              _disjoinIndexes.push(ci);
            }
          }
          _disjoinIndexes
            .sort((a, b) => a - b)
            .reverse()
            .forEach(ci => _curves.splice(ci, 1));
        }
      }
      if ($scope.focusCurve) {
        if (!_curves.find(c => c.name == $scope.focusCurve.name))
          $scope.focusCurve = null;
      }
      _curves.sort((ca, cb) => ca.name.localeCompare(cb.name))
    })
    // if (!$scope.$$phase) {
    //   $scope.$digest();
    // }
  }
  this.moveWell = function (event, helper, node) {
    node = self.selectedNode;
    for (let i=0; i < self.selectedNodes.length; i++) {
      self.showLoading = true;
      if (node.idWell) {
        let wellId = self.selectedNodes[i].idWell;
        let node = self.selectedNodes[i];
        let lat = getLat(self.selectedNode.well_headers);
        let long = getLong(self.selectedNode.well_headers);
        let x = getX(self.selectedNode.well_headers);
        let y = getY(self.selectedNode.well_headers);
        if (checkCoordinate(lat, long, x, y) === undefined) {
          self.wellError = self.selectedNode.name;
          self.showLoading = false;
          $timeout(()=>{
            self.wellError = false;
          },self.showingTimeDialogError*1000)
          continue;
        }
        let foundWell = $scope.wellSelect.find(function (item) {
          return item.idWell === wellId;
        });
        if (!foundWell) {
          $timeout(function () {
            let cloneNode = angular.copy(node);
            cloneNode._selected = false;
            $scope.wellSelect.push(cloneNode);
            ($scope.wellSelect || []).sort((a, b) => a.name.localeCompare(b.name))
            // self.selectedNode.length = 0;
            self.selectedNode = null;
            $timeout(async () => {
              await updateCurveList();
              await updateZoneList();
              await updateMarkerList();
              self.showLoading = false;
              self.contourConfig.addWell(cloneNode);
            });
          });
        }
        else {
          $timeout(() => {
            self.showLoading = false;
          })
        }
      }
      else if (node.idProject) {
        getWells(node.idProject, node, function (err, wells) {
          //let countWell = 0;
          for (let index = 0; index < wells.length; index++) {
            let wellId = wells[index].idWell;
            let lat = getLat(wells[index].well_headers);
            let long = getLong(wells[index].well_headers);
            let x = getX(wells[index].well_headers);
            let y = getY(wells[index].well_headers);
            if (checkCoordinate(lat, long, x, y) === undefined) {
              self.wellError = wells[index].name;
              self.showLoading = false;
              $timeout(()=>{
                self.wellError = false;
              },self.showingTimeDialogError*1000)
              continue;
            }
            let foundWell = $scope.wellSelect.find(function (item) {
              return item.idWell === wellId;
            });
            if (!foundWell) {
              $timeout(function () {
                $scope.wellSelect.push(wells[index]);
                ($scope.wellSelect || []).sort((a, b) => a.name.localeCompare(b.name))
                // self.selectedNode.length = 0
                self.selectedNode = null;
                $timeout(async () => {
                  await updateCurveList();
                  await updateZoneList();
                  await updateMarkerList();
                  self.showLoading = false;
                  self.contourConfig.addWell(wells[index]);
                });
              });
            }
          }
        });
      }
      else {
        $timeout(() => {
          self.showLoading = false;
        });
      }
    }
  }

  function addNode(event, helper, node) {
    if (node.idWell) {
      let wellId = node.idWell;
      let foundWell = $scope.wellSelect.find(function (item) {
        return item.idWell === wellId;
      });
      if (!foundWell) {
        $timeout(function () {
          $scope.wellSelect.push(node);
          self.noWell = false;
          console.log(node)
          $timeout(async () => {
            await updateCurveList();
            await updateZoneList();
            await updateMarkerList();
          });
        });
      }
    } else if (node.idProject) {
      getWells(node.idProject, node, function (err, wells) {
        let countWell = 0;
        for (let index = 0; index < wells.length; index++) {
          let wellId = wells[index].idWell;
          let foundWell = $scope.wellSelect.find(function (item) {
            return item.idWell === wellId;
          });
          if (!foundWell) {
            $timeout(function () {
              $scope.wellSelect.push(wells[index]);
              self.noWell = false;

              $timeout(async () => {
                await updateCurveList();
                await updateZoneList();
                await updateMarkerList();
              });
            });
          }
        }
      });
    }
  }
  this.dropFn = function (event, helper, nodeArray) {
    for (let node of nodeArray) {
      addNode(event, helper, node);
    }
  };

  // function getWells(projectId, projectNodeChildren, cb) {
  //   $http({
  //     method: "POST",
  //     url: BASE_URL + "/project/well/list",
  //     data: {
  //       idProject: projectId
  //     },
  //     headers: {
  //       Authorization: wiToken.getToken()
  //     }
  //   }).then(
  //     function (response) {
  //       cb(null, response.data.content, projectNodeChildren);
  //     },
  //     function (err) {
  //       cb(err);
  //     }
  //   );
  // }

  this.getLabel = function (node) {
    if (node && node.idWell) {
      return node.name;
    } else if (node && node.idProject) {
      return node.displayName || node.name;
    } else if (node && node.idCurve) {
      return node.name;
    } else if (node && node.idZone) {
      return node.name;
    } else if (node && node.idZoneSet) {
      return node.name;
    } else if (node && node.idMarker) {
      return node.name;
    } else if (node && node.idMarkerSet) {
      return node.name;
    }
  };
  this.getIcon = function (node) {
    if (node && node.idWell) return "well-16x16";
    else if (node && node.idProject) return "project-normal-16x16";
    else if (node && node.idCurve) return "curve-16x16";
    else if (node && node.idZone) return "zone-16x16";
    else if (node && node.idZoneSet) return "user-define-16x16";
    else if (node && node.idMarker) return "marker-16x16";
    else if (node && node.idMarkerSet) return "marker-set-16x16";
  };
  this.getChildren = function (node) {
    if (node && node.idProject) {
      return node.wells;
    } else if (node && node.idZoneSet) {
      return node.zones;
    } else if (node && node.idMarkerSet) {
      return node.markers;
    }
  };
  this.runMatch = function (node, criteria) {
    //console.log(criteria);
    console.log(node);
    let keySearch = criteria.toLowerCase();
    let searchArray = (node.alias || node.name || "").toLowerCase();
    return searchArray.includes(keySearch);
  };
  this.runMatchWell = function (node, criteria) {
    let keySearch = criteria.toLowerCase();
    let searchArray = node.name.toLowerCase();
    return searchArray.includes(keySearch);
  };
  this.runMatchCurve = function (node, criteria) {
    let keySearch = criteria.toLowerCase();
    let searchArray = node.name.toLowerCase();
    return searchArray.includes(keySearch);
  };
  this.runMatchZonesets = function (node, criteria) {
    let keySearch = criteria.toLowerCase();
    let searchArray = node.name.toLowerCase();
    return searchArray.includes(keySearch);
  };
  this.runMatchMarkersets = function (node, criteria) {
    let keySearch = criteria.toLowerCase();
    let searchArray = node.name.toLowerCase();
    return searchArray.includes(keySearch);
  };
  this.clickWellFunction = function ($event, node) {
    if (!$event.shiftKey && !$event.ctrlKey && !$event.metaKey) {
      self.selectedIdsHash = {};
      self.selectedWellNode = null;

      for(const w of $scope.wellSelect) {
        if(!self.nodeComparator(node, w)) {
          w._selected = false
        }
      }
    }
    self.selectedWellNode = node;
    self.selectedIdsHash[node.idWell] = node;
    $scope.focusWell = node;
    self.clearClipboardFocusWell = !self.clearClipboardFocusWell;
    self.contourConfig.centerByWell(node);
  };
  this.clickCurveFunction = function ($event, node) {
    $scope.focusCurve = node;
  };
  this.clickZoneFunction = function ($event, node) {
    // console.log("Zone click function", $event, node);
    if (node.idZone) {
      $scope.focusMZ = node;
      self.contourConfig.onChangePopupPosition();
    }
  }
  this.clickMarkerFunction = function ($event, node) {
    // console.log("Marker click function", $event, node);
    if (node.idMarker) {
      $scope.focusMZ = node;
      self.contourConfig.onChangePopupPosition();
    }
  }
  this.clickFunction = function ($event, node, selectedNodes) {
    self.selectedNode = node;
    self.selectedNodes = selectedNodes.map((e)=>e.data);
    if(!self.showMap){
      self.showGuide = false;
      self.openDashboard();
      
    }
			
    if (!$event.shiftKey && !$event.ctrlKey && !$event.metaKey) {
			
			for (const project of $scope.treeConfig) {

				const wells = project.wells || []
				for (const well of wells) {
					well._selected = false
				}

				project._selected = false
			}

			node._selected = true
		}

    if (node.idCurve) {
      // console.log("Curve clicked");
    } else if (node.idDataset) {
      // console.log("Dataset clicked");
    } else if (node.idWell) {
      // console.log("Well clicked");
    } else if (node.idProject && self.showMap) {
      self.showLoading = true;
      if (!node.timestamp || Date.now() - node.timestamp > 10 * 1000) {
        getWells(node.idProject, node, function (err, wells) {
          if (err) {
            ngDialog.open({
              template: "templateError",
              className: "ngdialog-theme-default",
              scope: $scope
            });
            self.showLoading = false;
            return console.log(err);
          }
          $timeout(() => {
            node.wells = (wells || []).sort((a, b) => a.name.localeCompare(b.name));
            self.showLoading = false;
          })
        });
      }
    }
  };

  this.nodeComparator = function(node1, node2) {
    return (
      node1.idProject === node2.idProject &&
      node1.idCurve === node2.idCurve &&
      node1.idDataset === node2.idDataset &&
      node1.idWell === node2.idWell
    )
  }

  this.getCurveTree = getCurveTree;
  const BASE_URL = WI_BACKEND_HOST;

  function getCurveTree() {
    $scope.treeConfig = [];
    getProjects($scope.treeConfig, function (err, projects) {
      if (err) {
        return console.log(err);
      }
      // $scope.treeConfig = projects.sort((w1, w2) => (w1.alias.localeCompare(w2.alias)));
      // $scope.treeConfig = projects.sort();
      $scope.treeConfig = projects;
    });
  }

  function getProjects(treeConfig, cb) {
    wiApi.client("WI_BASE_MAP_CLIENT").getProjectsPromise().then((projects) => {
      cb(null, projects, treeConfig);
    }).catch((err) => {
      cb(err);
    });
    // $http({
    //   method: "POST",
    //   url: BASE_URL + "/project/list",
    //   data: {},
    //   headers: {
    //     Authorization: wiToken.getToken()
    //   }
    // }).then(
    //   function (response) {
    //     let projects = response.data.content;
    //     cb(null, projects, treeConfig);
    //   },
    //   function (err) {
    //     cb(err);
    //   }
    // );
  }

  async function getWells(projectId, projectNodeChildren, cb) {
    wiApi.client("WI_BASE_MAP_CLIENT").getFullInfoPromise(projectId, projectNodeChildren.owner, projectNodeChildren.name).then((project) => {      
      return wiApi.client("WI_BASE_MAP_CLIENT").getWellsPromise(project.idProject);
    }).then(_wells => {
      wells = _wells.map( e => {
        e.shared = projectNodeChildren.shared;
        e.owner = projectNodeChildren.owner;
        e.nameOwner = projectNodeChildren.name;
        return e;
      });
      cb(null, wells, projectNodeChildren);
    }).catch(e => {
      console.error(e);
      cb(e);
    });
    // console.log(projectId)
    /*if(projectNodeChildren.shared){
      await $http({
        method: "POST",
        url: BASE_URL + "/project/fullinfo",
        data: {
          idProject: projectId,
          name: projectNodeChildren.name,
          shared: true,
          owner: projectNodeChildren.owner
        },
        headers: {
          Authorization: wiToken.getToken()
        }
      })
    } else {
      await $http({
        method: "POST",
        url: BASE_URL + "/project/fullinfo",
        data: {
          idProject: projectId,
          name: projectNodeChildren.name,
        },
        headers: {
          Authorization: wiToken.getToken()
        }
      })
    }
    $http({
      method: "POST",
      url: BASE_URL + "/project/well/list",
      data: {
        idProject: projectId
      },
      headers: {
        Authorization: wiToken.getToken()
      }
    }).then(
      function (response) {
        wells = response.data.content.map( e => {
          e.shared = projectNodeChildren.shared;
          e.owner = projectNodeChildren.owner;
          e.nameOwner = projectNodeChildren.name;
          return e;
        })
        cb(null, wells, projectNodeChildren);
      },
      function (err) {
        cb(err);
      }
    );*/
  }


  this.getCurveInfoFn = getCurveInfo;
  const cachedCurvesInfo = {};
  const CURVE_CACHING_TIMEOUT = 5000; //ms
  function getCurveInfo(curveId, cb) {
    if (
      cachedCurvesInfo[curveId] &&
      cachedCurvesInfo[curveId].timestamp - Date.now() < CURVE_CACHING_TIMEOUT
    )
      return cb(null, cachedCurvesInfo[curveId].content);
      wiApi.client("WI_BASE_MAP_CLIENT").getCurveInfoPromise(curveId).then((curveinfo) => {
        cachedCurvesInfo[curveId] = {
          content: curveinfo,
          timestamp: Date.now()
        };
        cb(null, curveinfo);
      }).catch((err) => {
        cb(err);
      });
    // $http({
    //   method: "POST",
    //   url: BASE_URL + "/project/well/dataset/curve/info",
    //   data: {
    //     idCurve: curveId
    //   },
    //   headers: {
    //     Authorization: wiToken.getToken()
    //   }
    // }).then(
    //   function (response) {
    //     cachedCurvesInfo[curveId] = {
    //       content: response.data.content,
    //       timestamp: Date.now()
    //     };
    //     cb(null, response.data.content);
    //   },
    //   function (err) {
    //     cb(err);
    //   }
    // );
  }

  this.getCurveRawDataFn = getCurveRawData;
  const cachedCurvesData = {};
  const CURVE_DATA_CACHING_TIMEOUT = 10000; //ms
  function getCurveRawData(curveId, cb) {
    if (
      cachedCurvesData[curveId] &&
      cachedCurvesData[curveId].timestamp - Date.now() < CURVE_DATA_CACHING_TIMEOUT
    )
      return cb(null, cachedCurvesData[curveId].content);
    wiApi.client("WI_BASE_MAP_CLIENT")
      // .getCurveRawDataPromise(curveId).then((curveinfo) => {
      .getCurveDataPromise(curveId).then((curveinfo) => {
      cachedCurvesInfo[curveId] = {
        content: curveinfo,
        timestamp: Date.now()
      };
      cb(null, curveinfo);
    }).catch((err) => {
      cb(err);
    });
    // $http({
    //   method: "POST",
    //   url: BASE_URL + "/project/well/dataset/curve/getRawData",
    //   data: {
    //     idCurve: curveId
    //   },
    //   headers: {
    //     Authorization: wiToken.getToken()
    //   }
    // }).then(
    //   function (response) {
    //     cachedCurvesData[curveId] = {
    //       content: response.data.content,
    //       timestamp: Date.now()
    //     };
    //     cb(null, response.data.content);
    //   },
    //   function (err) {
    //     cb(err);
    //   }
    // );
  }

  function getWellInfo(wellId, cb) {
    wiApi.client("WI_BASE_MAP_CLIENT").getWellPromise(wellId).then((wellinfo) => {
      cb(null, wellinfo);
    }).catch((err) => {
      cb(err);
    });

    // $http({
    //   method: "POST",
    //   url: BASE_URL + "/project/well/info",
    //   data: {
    //     idWell: wellId
    //   },
    //   headers: {
    //     Authorization: wiToken.getToken()
    //   }
    // }).then(
    //   function (response) {
    //     cb(null, response.data.content);
    //   },
    //   function (err) {
    //     cb(err);
    //   }
    // );
  }

  $scope.storageDatabase = {};
  //===============================SYNC data well selected===========================
 
  this.setContainerFileBrowser = function(container) {
    self.fileBrowserController = container;
    console.log(container);
  }
  this.uploadZipFileDatabase = async function() {
    var zip = new JSZip();
    console.log("file zip can download!");
    //file contour.json
    var wellSelect = $scope.wellSelect;
    var curveSelect = $scope.curveList;
    var dataContour = {
      selectWell: wellSelect,
      selectCurve: curveSelect,
      selectedZone: $scope.zoneList,
      selectedMarker: $scope.markerList
    };
    var json1 = JSON.stringify(dataContour),
      blob1 = new Blob([json1], { type: "octet/stream" });
    zip.file("contour.json", blob1);

    //file mapsetting.json
    var dataMapSetting = {
      themeMap: $scope.themeMap,
      activeTheme: self.activeTheme,
      controlPanel: self.controlPanel,
      point: self.point,
      allPopup: $scope.allPopup,
      showContour: self.showContour,
      showTrajectory: self.showTrajectory,
      showAxes: self.showAxes,
      zoneMap: $scope.zoneMap,
      darkMode: self.darkMode,
      showZonesets: self.showZonesets,
      showMarkersets: self.showMarkersets,
      wellDisplayMode: self.wellDisplayMode,
      wellSize: self.wellSize,
    };
    var json2 = JSON.stringify(dataMapSetting),
      blob2 = new Blob([json2], { type: "octet/stream" });
    zip.file("mapsetting.json", blob2);

    //file blocks.geojson
    var dataBlocks = self.geoJson;
    var json3 = JSON.stringify(dataBlocks),
      blob3 = new Blob([json3], { type: "octet/stream" });
    zip.file("blocks.geojson", blob3);

    // contourConfig
    const contourConfigFile = await getContourConfigFile();
    zip.file("contourConfig.zip", contourConfigFile);

    //Compress file
    zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: {level: 6}})
      .then(content => {
        // content.name = "i2G_basemap_configuration.zip";
        wiApi.getListProjects()
          .then((list) => {
            list = list.filter(e => !e.shared).map(e => {
              return {
                data: {
                  label: e.alias || e.name
                },
                icon: "project-normal-16x16",
                properties: e
              }
            });
            console.log(list);
            wiDialog.promptListDialog({
              title: "Save Configuration File to Project Database",
              inputName: "Project",
              iconBtn: "project-normal-16x16",
              hideButtonDelete: true,
              selectionList: list

            }, function (item) {
              console.log(item);
              wiApi.getFullInfoPromise(item.idProject)
                .then(async (res) => {
                  console.log(res);
                  var sd = res.storage_databases[0];
                  // var file = new File([content], "i2G_basemap_configuration.zip");
                  wiDialog.treeExplorer({
                    title: "Select Folder To Save Configuration",
                    selectWhat: 'folder',
                    file: content,
                    url: config.url,
                    storage_database: JSON.stringify({
                      company: sd.company,
                      directory: sd.input_directory,
                      whereami: "WI_BASE_MAP"
                    })
                  }, Upload, (res) => {
                    console.log(res);
                  }, {
                    rename: true,
                    fileName: "i2G_basemap_configuration.zip"
                  });
                });
            });
          });
      });
  }
  this.downloadConfig = function() {
    wiApi.getListProjects()
      .then((list) => {
        list = list.filter(e => !e.shared).map(e => {
          return {
            data: {
              label: e.alias || e.name
            },  
            icon: "project-normal-16x16",
            properties: e
          }
        });
        console.log(list);
        wiDialog.promptListDialog({
          title: "Open Configuration File from Project Database",
          inputName: "Project",
          iconBtn: "project-normal-16x16",
          hideButtonDelete: true,
          selectionList: list
        }, function(item) {
          console.log(item);
          wiApi.getFullInfoPromise(item.idProject)
          .then((res) => {
            console.log(res);
            var sd = res.storage_databases[0];
            wiDialog.treeExplorer({
                title: "Select File Configuration",
                selectWhat: 'file',
                url: config.url,
                storage_database: JSON.stringify({
                  company: sd.company,
                  directory: sd.input_directory,
                  whereami: "WI_STORAGE_ADMIN"
                })
              }, Upload, (res) => {
                var file = res;
                file.name = "a.zip";
                if (file) {
                  JSZip.loadAsync(file)
                  .then(function (zip) {
                    self.GetFileSizeNameAndType3(zip.file(Object.keys(zip.files)[0]));
                    return JSZip.loadAsync(zip.file(Object.keys(zip.files)[0]).async("blob"))
                  })
                  .then((zip1) => {
                    console.log(zip1);
                    return {
                            contour: zip1.file("contour.json").async("string"),
                            mapSetting: zip1.file("mapsetting.json").async("string"),
                            blocks: zip1.file("blocks.geojson").async("string"),
                            contourConfig: zip1.file("contourConfig.zip").async("blob")
                          };
                  })
                  .then(async function (result) {
                    await result.contour.then(function (data) {
                      return new Promise(resolve => {
                        data = JSON.parse(data);
                        let wells = [];
                        async.each(data.selectWell, (w, next) => {
                          if(w.shared) {
                            wiApi.getFullInfoPromise(w.idProject, w.owner, w.nameOwner).then((project) => {
                              proWells = project.wells;
                              wll = proWells.find(wl => wl.idWell == w.idWell)
                              wll ? wells.push(wll) : null
                              next()
                            }).catch((err) => {
                              next(err);
                            });
                          }else {
                            wiApi.getFullInfoPromise(w.idProject, null, w.nameOwner).then((project) => {
                              proWells = project.wells;
                              wll = proWells.find(wl => wl.idWell == w.idWell)
                              wll ? wells.push(wll) : null
                              next()
                            }).catch((err) => {
                              next(err);
                            });
                          }
                        }, (err) => {
                          console.log(wells)
                          data.selectWell = wells;
                          $scope.wellSelect = data.selectWell || [];

                          $scope.curveList = data.selectCurve || [];
                          $scope.zoneList = data.selectedZone || [];
                          $scope.markerList = data.selectedMarker || [];
                          self.noWell = false;
                          $scope.focusCurve = $scope.curveList.find(c => c._selected);
                          let selectedZoneset = $scope.zoneList.find(zs => zs.zones.find(z => z._selected));
                          let selectedMarkerset = $scope.markerList.find(ms => ms.markers.find(m => m._selected));
                          $scope.focusMZ = selectedZoneset
                              ? selectedZoneset.zones.find(z => z._selected)
                              : selectedMarkerset ? selectedMarkerset.markers.find(m => m._selected) : null
                          $timeout(async () => {
                            await updateCurveList();
                            await updateZoneList();
                            await updateMarkerList();
                            resolve();
                          });
                        })
                      })
                    });

                    await result.mapSetting.then(function (data) {
                      return new Promise(resolve => {
                        data = JSON.parse(data);
                        $scope.themeMap = data.themeMap;
                        $scope.allPopup = data.allPopup;
                        self.activeTheme = data.activeTheme;
                        self.controlPanel = data.controlPanel;
                        self.point = data.point;
                        self.showContour = data.showContour;
                        self.showTrajectory = data.showTrajectory;
                        self.wellDisplayMode = (self.wellDisplayModeOptions.find(o => o.value == data.wellDisplayMode) || self.wellDisplayModeOptions[0]).value;
                        self.wellSize = data.wellSize;
                        self.darkMode = data.darkMode;
                        setDarkMode(self.darkMode);
                        self.showZonesets = data.showZonesets;
                        self.showMarkersets = data.showMarkersets;
                        $scope.zoneMap = data.zoneMap;
                        $timeout(() => {
                          if (!$scope.$$phase) {
                            $scope.$apply();
                            resolve();
                          };
                        })
                      })
                    });

                    // update contour config
                    importContourConfig(result.contourConfig)
                      .then(() => {
                        $scope.wellSelect.forEach(w => {
                          self.contourConfig.addWell(w);
                          $timeout(() => {
                            self.contourConfig.onChangePopupPosition();
                            self.contourConfig.onChangeWellPosition();
                            self.contourConfig.onChangeWellDisplayMode();
                            self.contourConfig.onWellSizeChanged();
                          })
                        })
                      })
                    result.blocks.then(function (data) {
                      data = JSON.parse(data);
                      self.geoJson = data;
                      $scope.$digest();
                    });

                  });
                }
            });
          });
        });
      });
  }
  this.GetFileSizeNameAndType3 = function (file) {
    if (file) {
      document.getElementById('fp2').innerHTML = '';
        let fsize = file.size;
        document.getElementById('fp2').innerHTML =
          document.getElementById('fp2').innerHTML
          + '<b>File Name: </b>' + file.name + '</br>'
          // + '<b>File Size: </b>' + Math.round((fsize / 1024)) + 'KB </br>'
          // + '<b>File Type: </b>' + file.type + "</br>";
    }
  }

  //===========================Check well moving======================
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
    /*
    for (let index = 0; index < wellIndex.length; index++) {
      if (wellIndex[index].header === "E" && _.isFinite(wellIndex[index].value)) {
        const value = Number(wellIndex[index].value);
        return isNaN(value) ? 0 : value;
      }
    }
    */
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
    /*
    for (let index = 0; index < wellIndex.length; index++) {
      if (wellIndex[index].header === "N" && _.isFinite(wellIndex[index].value)) {
        const value = Number(wellIndex[index].value);
        return isNaN(value) ? 0 : value;
      }
    }
    */
    for (let index = 0; index < wellIndex.length; index++) {
      if (wellIndex[index].header === "Y") {
        const value = Number(wellIndex[index].value);
        return isNaN(value) ? 0 : value;
      }
    }
    return 0;
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

  this.onClickChart = function(points, evt, widgetConfig) {
    let idx = points[0]._index;
    wiDialog.colorPickerDialog(widgetConfig.colors[idx], {}, function (colorStr) {
      widgetConfig.colors[idx] = colorStr;
    });
  }

  //====================== DRAWING CONTOUR MODULE =====================//
  this.showContourPanel = false;
  let updateColorScaleBarWidth = () => {};
  let updateColorScale = () => {};
  let setContourViewScale = () => {};
  let setContourViewCenter = () => {};
  let exportToZmapContent = () => {};
  let parseZmapContent = () => {};
  this.contourConfig = {
    values: [],
    headers: {},
    minValue : 0,
    maxValue : 1,
    colorScale : d3.scaleLinear().range(['red', 'blue']),
    step : 100,
    majorEvery : 5,
    labelFontSize : 12,
    labelInterval: 1000,
    showLabel : false,
    showScale : true,
    showGrid : true,
    enableRulerMode: false,
    disableMouseCoordinate: false,
    disableZoom: false,
    gridMajor : 5,
    gridMinor : 4,
    gridNice : true,
    scale : 1,
    yDirection : 'up',
    showWell : true,
    showTrajectory : true,
    negativeData: false,
    showColorScaleLegend: true,
    viewWellDepth: false,
    colorBarHeight: 40,
    wells: [],
    trajectories: [],
    wellIconSize: self.wellSize || 1,
    showUtmZones: true,
    utmZones: getUtmZoneLinesForContour(),
    onFileComponentMounted: function() {
      const [fileImportComponent] = arguments;
      exportToZmapContent = fileImportComponent.toZmapFile;
      parseZmapContent = fileImportComponent.doParseFromContent;
    },
    onContourViewMounted: function () {
      const [contourViewComponent] = arguments;
      setContourViewScale = (_scale) => {
        contourViewComponent.setScale.call(contourViewComponent, _scale);
      }
      setContourViewCenter = (xCoord, yCoord, centerX, centerY) => {
        contourViewComponent.setCenter.call(contourViewComponent, xCoord, yCoord, centerX, centerY);
      }
    },
    onDataChanged: (newData) => {
      console.log('on data changed', newData);
      self.contourConfig.headers = _.clone(newData.headers);
      self.contourConfig.values = _.flatten(newData.data);
      const domain = d3.extent(self.contourConfig.values);
      self.contourConfig.minValue = domain[0];
      self.contourConfig.maxValue = domain[1];
      self.contourConfig.updateFileInfo();
      self.contourConfig.utmZones = getUtmZoneLinesForContour($scope.zoneMap);
      $timeout(() => {
        $scope.$digest();
        $timeout(() => {
          self.contourConfig.focusCenter();
        }, 200)
      });
    },
    onColorScaleChanged: (newColorScale) => {
      self.contourConfig.colorScale = newColorScale;
      $timeout(() => $scope.$digest());
    },
    onScaleChanged: (newScale) => {
      self.contourConfig.scale = newScale;
      $scope.__tmpRealRatio = self.contourConfig.getRealRatio(newScale);
      $timeout(() => $scope.$digest());
    },
    onColorScaleBarInit: function() {
      const [colorScaleBar] = arguments;
      updateColorScale = (domain, range) => {
        if (!domain || !range) return;
        colorScaleBar.onColorStopsChanged(domain, range);
        colorScaleBar.redraw();
      }
      updateColorScaleBarWidth = () => {
        $timeout(() => {
          colorScaleBar.redraw.call(colorScaleBar, true);
        }, 100);
      }
    },
    focusCenter: function() {
      const centerX = this.headers.minX + (this.headers.maxX - this.headers.minX)/2
      const centerY = this.headers.minY + (this.headers.maxY - this.headers.minY)/2
      setContourViewCenter(centerX, centerY);
    },
    // wells
    addWell: async function(projectWell) {
      if (!this.wells.find(_w => projectWell.idWell == _w.idWell)) {
        const { idWell, name, color } = projectWell;
        let _color = 'white';
        try {
          const __colors = JSON.parse(color);
          if (Array.isArray(__colors))
            _color = __colors[0];
        } catch (e) {
          console.log(e)
          _color = color;
        }
        const xyCoord = await getWellXYForContour(projectWell, self.wellPosition);
        const _displayContent = this.viewWellDepth ? getWellDepth(projectWell, self.popupPosition) : name;
        const displayContent = (this.viewWellDepth && this.negativeData) ? makeNegativeValue(_displayContent) : _displayContent;
        this.wells.push({
          idWell, name, __fireUpdate: false, displayContent,
          xCoord: xyCoord.xCoord,
          yCoord: xyCoord.yCoord,
          // icon
          color: self.wellDisplayMode == "derrick"
            ? "#585858"
            : utils.getWellColorMarker(projectWell.wellheaders || projectWell.well_headers || []),
          icon: self.wellDisplayMode == "derrick"
            ? "well"
            : utils.getWellIconMarker(projectWell.wellheaders || projectWell.well_headers || []),
        })
        this.addTrajectories(projectWell);
      }
    },
    deleteWells: function(wells) {
      wells.forEach(w => {
        // delete trajectory
        const foundTrajectoryIdx = this.trajectories.findIndex(_t => _t.idWell == w.idWell);
        if (foundTrajectoryIdx >= 0)
          this.trajectories.splice(foundTrajectoryIdx, 1);
        // delete well
        const foundIdx = this.wells.findIndex(_w => _w.idWell == w.idWell);
        if (foundIdx >= 0)
          this.wells.splice(foundIdx, 1);
      })
    },
    onWellSizeChanged: function() {
      $timeout(() => {
        self.contourConfig.wellIconSize = self.wellSize;
      })
    },
    centerByWell: async function(well) {
      const xyCoord = await getWellXYForContour(well, self.wellPosition);
      const centerPointOfMap = getMapCenterOnContourView();
      setContourViewCenter(xyCoord.xCoord, xyCoord.yCoord, centerPointOfMap.x, centerPointOfMap.y);
    },
    // trajectories
    addTrajectories: async function(well) {
      const depthSpec = utils.getDepthSpecsFromWell(well, wiApi);
      const numberOfPoints = 1000;
      const depthStep = (depthSpec.bottomDepth - depthSpec.topDepth) / numberOfPoints;
      const depths = d3.range(depthSpec.topDepth, depthSpec.bottomDepth, depthStep);
      const coords = await utils.getCoordFromDepth(depths, well, self.getCurveRawDataFn, $scope.zoneMap, wiApi, null, {preferXY: true});
      // check if well is currently avalable in map
      const wells = getters['contourConfig.wells']();
      if (!wells.find(w => w.idWell == well.idWell)) return;
      console.log("adding trajectory for well", well, coords);
      let endPointPos = {};
      if (self.wellPosition == "base") {
        endPointPos = await getWellXYForContour(well, "top");
      } else {
        endPointPos = await getWellXYForContour(well, "base");
      }
      this.trajectories.push({
        idWell: well.idWell,
        name: well.name,
        color: 'black',
        lineWidth: 1,
        points: coords
            .map(c => ({ xCoord: c.x, yCoord: c.y }))
            .filter(p => _.isFinite(p.xCoord) && _.isFinite(p.yCoord)),
        endPoint: {
          radius: 3,
          color: "black",
          xCoord: endPointPos.xCoord,
          yCoord: endPointPos.yCoord
        }
      })
    },
    onChangeWellDisplayMode: function() {
      this.wells.forEach((cWell, cIdx) => {
        const well = $scope.wellSelect.find(w => w.idWell == cWell.idWell);
        if (well) {
          this.wells[cIdx].color = self.wellDisplayMode == "derrick"
                ? "#585858"
                : utils.getWellColorMarker(well.wellheaders || well.well_headers || []);
          this.wells[cIdx].icon = self.wellDisplayMode == "derrick"
                ? "well"
                : utils.getWellIconMarker(well.wellheaders || well.well_headers || []);
        }
      })
    },
    onChangeWellPosition: function() {
      this.wells.forEach(async (cWell, cIdx) => {
        const well = $scope.wellSelect.find(w => w.idWell == cWell.idWell);
        if (well) {
          const wellPos = await getWellXYForContour(well, self.wellPosition);
          this.wells[cIdx].xCoord = wellPos.xCoord;
          this.wells[cIdx].yCoord = wellPos.yCoord;
          // update popup position
          if (self.wellPosition !== self.popupPosition) {
            const popupPos = await getWellXYForContour(well, self.popupPosition);
            this.wells[cIdx].popupConfig = popupPos;
          } else {
            delete this.wells[cIdx].popupConfig;
          }
          // update trajectory endpoint
          const tj = this.trajectories.find(t => t.idWell == cWell.idWell);
          if (tj) {
            let endPointPos = {};
            if (self.wellPosition == "top")
              endPointPos = await getWellXYForContour(well, "base");
            else
              endPointPos = await getWellXYForContour(well, "top");
            tj.endPoint.xCoord = endPointPos.xCoord;
            tj.endPoint.yCoord = endPointPos.yCoord;
          }
        }
      })
    },
    onChangePopupPosition: function() {
      this.wells.forEach(async (cWell, cIdx) => {
        const well = $scope.wellSelect.find(w => w.idWell == cWell.idWell);
        if (well) {
          if ((self.showZonesets || self.showMarkersets) && $scope.focusMZ) {
            const drawDepth = getWellDepth(well);
            const coord = await utils.getCoordFromDepth(drawDepth, well, self.getCurveRawDataFn, $scope.zoneMap, wiApi, null, {preferXY: true})
            const displayContent = this.viewWellDepth ? drawDepth : well.name;
            this.wells[cIdx].displayContent = (this.viewWellDepth && this.negativeData) ? makeNegativeValue(displayContent) : displayContent;
            this.wells[cIdx].popupConfig = {xCoord: coord.x, yCoord: coord.y};
            this.wells[cIdx].__fireUpdate = !this.wells[cIdx].__fireUpdate;
            return;
          }
          if (self.popupPosition == self.wellPosition) {
            delete this.wells[cIdx].popupConfig;
          } else {
            const popupPos = await getWellXYForContour(well, self.popupPosition);
            this.wells[cIdx].popupConfig = popupPos;
          }
          const displayContent = this.viewWellDepth ? getWellDepth(well, self.popupPosition) : well.name;
          this.wells[cIdx].displayContent = (this.viewWellDepth && this.negativeData) ? makeNegativeValue(displayContent) : displayContent;
          this.wells[cIdx].__fireUpdate = !this.wells[cIdx].__fireUpdate;
        }
      })
    },
    updateContourScaleFromRealRatio: function(__ratio) {
      if (__ratio == 0) return;
      const incX = this.headers["xDirection"] || 50;
      const Dpi = utils.getDpi(); // dots per inche
      const Dpm = Dpi * 100 / 2.54; // dots per meter
      const zoomedScale = (incX * Dpm) / __ratio;
      setContourViewScale(zoomedScale);
    },
    getRealRatio: function(zoomedScale) {
      const incX = this.headers["xDirection"] || 50;
      // 1 node ~ incX (m)
      // 1 node ~ 1px if zoomedScale == 1
      // => 1 node ~ zoomedScale px
      const Dpi = utils.getDpi();
      const Dpm = Dpi * 100 / 2.54;
      const scale = _.round(incX / (zoomedScale / Dpm), 1);
      return scale;
    },
    toggleViewWellDepth: function() {
      this.viewWellDepth = !this.viewWellDepth;
      this.onChangePopupPosition();
    },
    onNegativeDataChanged: function() {
      if (this.viewWellDepth) {
        $timeout(() => {
          // reupdate popup text
          this.onChangePopupPosition();
        }, 1000)
      }
    },
    mousePoint: {x: null, y: null, z: null},
    onMouseMove: function(xy) {
      if (!xy) return;
      self.contourConfig.mousePoint.x = _.round(xy.x, 2);
      self.contourConfig.mousePoint.y = _.round(xy.y, 2);
      const nodeX = Math.round(xy.nodeX);
      const nodeY = Math.floor(xy.nodeY);
      const gridWidth = self.contourConfig.headers.numOfCols;
      self.contourConfig.mousePoint.z = _.round(self.contourConfig.values[gridWidth * nodeY + nodeX], 2);
      $timeout(() => $scope.$digest())
    },
    rulerDistance: null,
    onRulerEnd: function(distance) {
      self.contourConfig.rulerDistance = _.round(distance, 2);
      $timeout(() => $scope.$digest())
    },
    updateFileInfo: function(fileInfo) {
      // update file info
      const fileEle = $("#map-upfile-3 input")[0];
      const file = fileInfo || fileEle.files.item(0);
      const infoArea = $("#contour-file-import #fp")[0];
      if (!file) return;
      infoArea.innerHTML =
        '<b>File Name: </b>' + file.name + '</br>'
        + '<b>File Size: </b>' + Math.round((file.size / 1024)) + 'KB </br>'
        + '<b>File Type: </b>' + file.type + "</br>";
    }
  };

  function makeNegativeValue(value) {
    return -Math.abs(value);
  }

  function getWellDepth(well, wellPosition = "top") {
    if ((self.showZonesets || self.showMarkersets) && $scope.focusMZ) {
      const focusMZ = $scope.focusMZ;
      const zoneDepthSpec = self.zoneDepthSpec;
      if (focusMZ.idMarker) {
        // draw by marker
        const markerSet = well.marker_sets.find(ms => ms.name == focusMZ.markersetName);
        if (markerSet) {
          const marker = markerSet.markers.find(m => m.idMarkerTemplate == focusMZ.idMarkerTemplate);
          if (marker) {
            const drawDepth = marker.depth;
            return drawDepth;
          }
        }
      } else if(focusMZ.idZone) {
        // draw by zone
        const zoneSet = well.zone_sets.find(zs => zs.name == focusMZ.zonesetName);
        if (zoneSet) {
          const zone = zoneSet.zones.find(z => z.idZoneTemplate == focusMZ.idZoneTemplate);
          let drawDepth = zone.startDepth;
          if (zone) {
            if (zoneDepthSpec == 'zone-bottom')
              drawDepth = zone.endDepth;
            else if (zoneDepthSpec == 'zone-middle')
              drawDepth = zone.startDepth + (zone.endDepth - zone.startDepth) / 2;
            return drawDepth;
          }
        }
      }
    }
    if (wellPosition == "base") {
      const depthSpec = utils.getDepthSpecsFromWell(well, wiApi);
      return depthSpec.bottomDepth;
    } else {
      const depthSpec = utils.getDepthSpecsFromWell(well, wiApi);
      return depthSpec.topDepth;
    }
  }

  async function getWellXYForContour(well, wellPosition = "top") {
    if (wellPosition == "base") {
      const depthSpec = utils.getDepthSpecsFromWell(well, wiApi);
      const coord = await utils.getCoordFromDepth(depthSpec.bottomDepth, well, self.getCurveRawDataFn, $scope.zoneMap, wiApi, null, {preferXY: true})
      return { xCoord: coord.x, yCoord: coord.y };
    } else {
      // default always return top of well
      const X = utils.getX(well.wellheaders || well.well_headers || []);
      const Y = utils.getY(well.wellheaders || well.well_headers || []);
      let xCoord = X;
      let yCoord = Y;

      if ((!X || !Y)) {
        const lat = getLat(well.wellheaders || well.well_headers || [], true);
        const long = getLong(well.wellheaders || well.well_headers || [], true);
        const firstProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
        const secondProjection = $scope.zoneMap;
        const xByLng = proj4(firstProjection, secondProjection, [long, lat])[0];
        const yByLat = proj4(firstProjection, secondProjection, [long, lat])[1];
        if (xByLng && yByLat) {
          xCoord = xByLng;
          yCoord = yByLat;
        }
      }
      return { xCoord, yCoord };
    }
  }

  /* get relative point of base-map center on contour map */
  function getMapCenterOnContourView() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const canvasMetric = $('contour-view canvas')[0].getBoundingClientRect();
    return {x: windowWidth / 2 - canvasMetric.x, y: windowHeight / 2 - canvasMetric.y};
  }

  const CONTOUR_ZMAP_FILE_NAME = "zmapfile";
  const CONTOUR_CONFIG_FILE_NAME = "config.json";
  async function getContourConfigFile() {
    const {
      step, majorEvery, labelFontSize, labelInterval, showLabel, showScale,
      showGrid, enableRulerMode, disableMouseCoordinate, disableZoom,
      gridMajor, gridMinor, gridNice, scale, showWell, showTrajectory,
      negativeData, showColorScaleLegend, viewWellDepth, colorScale
    } = self.contourConfig;

    const configs = {
      step, majorEvery, labelFontSize, labelInterval, showLabel, showScale,
      showGrid, enableRulerMode, disableMouseCoordinate, disableZoom,
      gridMajor, gridMinor, gridNice, scale, showWell, showTrajectory,
      negativeData, showColorScaleLegend, viewWellDepth,
      colorScaleDomain: colorScale.domain(),
      colorScaleRange: colorScale.range()
    }

    const zmapContent = exportToZmapContent();

    const blobConfigs = new Blob([JSON.stringify(configs)], {type: "octet/stream"});
    const blobZmap = new Blob([zmapContent], {type: "text/plain"});
    const zipFile = new JSZip();
    zipFile.file(CONTOUR_CONFIG_FILE_NAME, blobConfigs);
    zipFile.file(CONTOUR_ZMAP_FILE_NAME, blobZmap);

    return await zipFile.generateAsync({ type: "blob" });
  }

  function importContourConfig(zipFile) {
    return new Promise(resolve => {
      JSZip
        .loadAsync(zipFile)
        .then(function (unzippedContent) {
          const zmapFile = unzippedContent.files[CONTOUR_ZMAP_FILE_NAME];
          const metadata = {
            name: zmapFile.name,
            size: zmapFile._data.uncompressedSize,
            type: zmapFile._data.type || "null"
          }
          self.contourConfig.updateFileInfo(metadata);
          unzippedContent
            .file(CONTOUR_ZMAP_FILE_NAME)
            .async("blob")
            .then(data => {
              const reader = new FileReader();
              reader.onload = e => {
                parseZmapContent(e.target.result);
              }
              reader.readAsText(data)
            })
          unzippedContent
            .file(CONTOUR_CONFIG_FILE_NAME)
            .async("string")
            .then(rawConfigs => {
              const configs = JSON.parse(rawConfigs);
              Object.assign(self.contourConfig, configs);
              $timeout(() => {
                // assign to temporary variables
                $scope.__tmpLabelInterval = configs.labelInterval;
                $scope.__tmpStep = configs.step;
                setContourViewScale(configs.scale);
                updateColorScale(configs.colorScaleDomain, configs.colorScaleRange);
                resolve();
              }, 100);
            })
        })
    })
  }

  function getUtmZoneLinesForContour(zoneMap) {
    const firstProjection = "+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees";
    const secondProjection = zoneMap || $scope.zoneMap;
    if (!secondProjection) return;
    const lines = [];
    const equatorStart = proj4(firstProjection, secondProjection, [-180, 0]);
    const equatorEnd = proj4(firstProjection, secondProjection, [180, 0]);
    lines.equator = {
      start: {x: equatorStart[0], y: equatorStart[1]},
      end: {x: equatorEnd[0], y: equatorEnd[1]},
      label: 'equator'
    }

    for(let c = 0; c <= 180 ; c+= 6) {
      const posStart = proj4(firstProjection, secondProjection, [c, -85]);
      const posEnd = proj4(firstProjection, secondProjection, [c, 85]);
      if (_.isFinite(posStart[0]) && _.isFinite(posStart[1])
        && _.isFinite(posEnd[0]) && _.isFinite(posEnd[1]))
        lines.push({
          start: { x: posStart[0], y: posStart[1] },
          end: { x: posEnd[0], y: posEnd[1] },
          label: c
        })
      const negStart = proj4(firstProjection, secondProjection, [-c, -85]);
      const negEnd = proj4(firstProjection, secondProjection, [-c, 85]);
      if (_.isFinite(negStart[0]) && _.isFinite(negStart[1])
        && _.isFinite(negEnd[0]) && _.isFinite(negEnd[1]))
        lines.push({
          start: { x: negStart[0], y: negStart[1] },
          end: { x: negEnd[0], y: negEnd[1] },
          label: -c
        })
    }
    console.log(lines);
    return lines;
  }

  function selectFileFromStorage() {
    return new Promise(resolve => {
      wiApi.getListProjects()
        .then((list) => {
          list = list.filter(e => !e.shared).map(e => {
            return {
              data: { label: e.alias || e.name },
              icon: "project-normal-16x16",
              properties: e
            }
          });
          console.log(list);
          wiDialog.promptListDialog({
            title: "Open Zmap File from Storage",
            inputName: "Project",
            iconBtn: "project-normal-16x16",
            hideButtonDelete: true,
            selectionList: list
          }, function (item) {
            console.log(item);
            wiApi.getFullInfoPromise(item.idProject)
              .then((res) => {
                console.log(res);
                var sd = res.storage_databases[0];
                wiDialog.treeExplorer({
                  title: "Select Zmap File",
                  selectWhat: 'file',
                  url: config.url,
                  storage_database: JSON.stringify({
                    company: sd.company,
                    directory: sd.input_directory,
                    whereami: "WI_STORAGE_ADMIN"
                  })
                }, Upload, (res) => {
                  var file = res;
                  file.name = "a.zip";
                  if (file) {
                    resolve(JSZip.loadAsync(file));
                  }
                });
              });
          });
        });
    })
  }

  async function saveToStorage(fileData, fileName) {
    wiApi.getListProjects()
      .then((list) => {
        list = list.filter(e => !e.shared).map(e => {
          return {
            data: { label: e.alias || e.name },
            icon: "project-normal-16x16",
            properties: e
          }
        });
        console.log(list);
        wiDialog.promptListDialog({
          title: "Save Zmap file to Storage",
          inputName: "Project",
          iconBtn: "project-normal-16x16",
          hideButtonDelete: true,
          selectionList: list
        }, function (item) {
          console.log(item);
          wiApi.getFullInfoPromise(item.idProject)
            .then(async (res) => {
              console.log(res);
              var sd = res.storage_databases[0];
              // var file = new File([content], "i2G_basemap_configuration.zip");
              wiDialog.treeExplorer({
                title: "Select Folder To Save Zmap File",
                selectWhat: 'folder',
                file: fileData,
                url: config.url,
                storage_database: JSON.stringify({
                  company: sd.company,
                  directory: sd.input_directory,
                  whereami: "WI_BASE_MAP"
                })
              }, Upload, (res) => {
                console.log(res);
              }, {
                rename: true,
                fileName: fileName || "Untitled"
              });
            });
        });
      });
  }

  // ==================== zmap ==================== //
  this.downloadZmapToLocal = function() {
    const content = exportToZmapContent();
    const blob = new Blob([content], { type: "text/plain" });
    fileSaver.saveAs(blob, "contourConfig.zip");
  }

  this.saveZmapToStorage = function() {
    const content = exportToZmapContent();
    const blob = new Blob([content], { type: "text/plain" });
    saveToStorage(blob, "Zmapfile.zmap");
  }

  this.importZmapFromStorage = function() {
    selectFileFromStorage()
      .then(selectedFile => {
        selectedFile
          .file(Object.keys(selectedFile.files)[0])
          .async("blob")
          .then(data => {
            const fileObj = Object.values(selectedFile.files)[0];
            const metadata = {
              name: fileObj.name,
              size: fileObj._data.uncompressedSize,
              type: fileObj._data.type || "null"
            }
            self.contourConfig.updateFileInfo(metadata);
            const reader = new FileReader();
            reader.onload = e => {
              parseZmapContent(e.target.result);
            }
            reader.readAsText(data);
          });
      })
  }


  //=================== CONTOUR CONFIG =======================//
  this.downloadContourConfigToLocal = async function() {
    const contourConfigFile = await getContourConfigFile();
    fileSaver.saveAs(contourConfigFile, "contourConfig.zip");
  }

  this.saveContourConfigToStorage = async function() {
    const contourConfigFile = await getContourConfigFile();
    saveToStorage(contourConfigFile, "ContourConfig.zip");
  }

  this.importContourConfigFile = function() {
    const inputEle = document.createElement('input');
    inputEle.type = "file";
    inputEle.onchange = function(event) {
      const files = inputEle.files;
      const reader = new FileReader();
      reader.onload = function(e) {
       importContourConfig(e.target.result);
      }
      reader.readAsArrayBuffer(files[0])
    }
    $(inputEle).click();
  }

  this.importContourConfigFromStorage = function() {
    selectFileFromStorage()
      .then(selectedFile => {
        selectedFile
          .file(Object.keys(selectedFile.files)[0])
          .async("blob")
          .then(data => {
            importContourConfig(data);
          })
      })
  }

  this.onContourTabClick = function() {
    self.showContourPanel = true;
    updateColorScaleBarWidth();
  }

  this.getRound = function(number, decimal) {
    return _.round(number, decimal || 2);
  }

  const getters = {};
  this.getterFn = function(key) {
    if (typeof(getters[key]) != 'function')
      getters[key] = () => _.get(self, key);
    return getters[key];
  }
  $('#map-upfile-3-btn').bind("click", function () {
    $("#map-upfile-3 input[type='file']").click();
  });
  //====================== END DRAWING CONTOUR MODULE =====================//
}
