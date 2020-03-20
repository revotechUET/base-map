var componentName = "baseMap";
module.exports.name = componentName;
require("./style.less");
const queryString = require("query-string");
const JSZip = require("jszip");
const fileSaver = require("file-saver");

let URL_CONFIG = require("../../config/default").default;
if (process.env.NODE_ENV === "development") {
  URL_CONFIG = require("../../config/default").dev;
} else if (process.env.NODE_ENV === "production") {
  URL_CONFIG = require("../../config/default").production;
}
URL_CONFIG = require("../../config/default").production;


// console.log("config", config);
// console.log("NODE_ENV", process.env.NODE_ENV);
const WI_AUTH_HOST = URL_CONFIG.wi_auth;
const WI_BACKEND_HOST = URL_CONFIG.wi_backend;
const BASE_URL = WI_BACKEND_HOST;

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
  'wiDialog'
]);

function getData(resultObj) {
  return Object.values(resultObj).map(item => item.length);
}

const DTSRC_OPTIONS_MAP = {
  "Well By Well Type": 'well-by-well-type',
  "Well By Field": 'well-by-field',
  "Well By Operator": 'well-by-operator',
  "Well By Tag": 'well-by-tag',
  "Well By UWI": 'well-by-uwi',
  "Well By API": 'well-by-api',
  "Well By Company": 'well-by-company',
  "Well By Author": 'well-by-author',
  "Well By Service": 'well-by-service',
  "Well By County": 'well-by-county',
  "Well By State": 'well-by-state',
  "Well By Province": 'well-by-province',
  "Well By Country": 'well-by-country',
  "Well By Location": 'well-by-location',
  "Well By Project": 'well-by-project',
  "Well By Code": 'well-by-code',
  "Well By Area": 'well-by-area',
  "Well By Type": 'well-by-type',
  "Well By Status": 'well-by-status',
  "Well By Fluid": 'well-by-fluid',
}
const DTSRC_MAP = {
  'well-by-field': 'FLD',
  'well-by-well-type': 'WTYPE',
  'well-by-tag': 'tags',
  'well-by-fluid': 'FLUID',
  'well-by-operator': 'OPERATOR',
  'well-by-uwi': 'UWI',
  'well-by-api': 'API',
  'well-by-company': 'COMP',
  'well-by-author': 'AUTHOR',
  'well-by-service': 'SRVC',
  'well-by-county': 'CNTY',
  'well-by-state': 'STATE',
  'well-by-province': 'PROV',
  'well-by-country': 'CTRY',
  'well-by-location': 'LOC',
  'well-by-project': 'PROJ',
  'well-by-code': 'CODE',
  'well-by-area': 'AREA',
  'well-by-type': 'TYPE',
  'well-by-status': 'STATUS',
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
    options: Object.keys(DTSRC_OPTIONS_MAP).map(label => ({data: {label}, properties: { value: DTSRC_OPTIONS_MAP[label]}})),
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

const getField = function(well, field) {
  return well.wellheaders.find(wh => wh.header === field) || {};
}

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
  self.wellPosition = self.wellPositionOptions[0].value;
  self.wellDisplayMode = self.wellDisplayModeOptions[0].value;
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
              blocks: zip.file("blocks.geojson").async("string")
            };
          })
          .then(async function (result) {
            await result.contour.then(function (data) {
              return new Promise(response => {
                data = JSON.parse(data);
                let wells = [];
                async.each(data.selectWell, (w, next) => {
                  if(w.shared) {
                    $http({
                      method: "POST",
                      url: BASE_URL + "/project/fullinfo",
                      data: {
                        idProject: w.idProject,
                        name: w.nameOwner,
                        shared: true,
                        owner: w.owner
                      },
                      headers: {
                        Authorization: wiToken.getToken()
                      }
                    })
                    .then((res) => {
                      console.log(res)
                      project = res.data.content;
                      proWells = project.wells;
                      wll = proWells.find(wl => wl.idWell == w.idWell)
                      wll ? wells.push(wll) : null
                      next()
                    })
                  }else {
                    $http({
                          method: "POST",
                          url: BASE_URL + "/project/fullinfo",
                          data: {
                            idProject: w.idProject,
                            name: w.nameOwner,
                          },
                          headers: {
                            Authorization: wiToken.getToken()
                          }
                        })  
                    .then((res) => {
                      console.log(res)
                      project = res.data.content;
                      proWells = project.wells;
                      wll = proWells.find(wl => wl.idWell == w.idWell)
                      wll ? wells.push(wll) : null
                      next()
                    })
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
                  // if (!$scope.$$phase) {
                  //   $scope.$apply();
                  //   $timeout(response, 500);
                  // }
                  $timeout(async () => {
                    await updateCurveList();
                    await updateZoneList();
                    await updateMarkerList();
                    response();
                  });
                })
              })
            });
            result.mapSetting.then(function (data) {
              data = JSON.parse(data);
              $scope.themeMap = data.themeMap;
              $scope.allPopup = data.allPopup;
              self.activeTheme = data.activeTheme;
              self.controlPanel = data.controlPanel;
              self.point = data.point;
              self.showContour = data.showContour;
              self.showTrajectory = data.showTrajectory;
              self.showAxes = data.showAxes;
              self.wellPosition = data.wellPosition; 
              self.darkMode = data.darkMode;
              setDarkMode(self.darkMode);
              self.showZonesets = data.showZonesets;
              self.showMarkersets = data.showMarkersets;
              $scope.zoneMap = data.zoneMap;
              $timeout(() => {
                if (!$scope.$$phase) {
                  $scope.$apply();
                };
              })
            });
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
    return new Promise((resolve, reject) => {
      let okBtnClicked = false;
      ngDialog.open({
        template: 'dashboard-template-modal',
        preCloseCallback: function() {
          if (!okBtnClicked) reject();
          return true;
        },
        controller: ['$scope', function ($scope) {
          this.mode = "confirm-modal";
          this.message = message;
          this.onOkButtonClicked = function () {
            okBtnClicked = true;
            resolve();
            $scope.closeThisDialog();
          }
          this.closeBtnClicked = function() {
            $scope.closeThisDialog();
          }
        }],
        controllerAs: 'wiModal'
      })
    })
  }

  this.getNumberOfWells = function(project) {
    if (!project)
      return "";
    else
      return `(${project.wells.length} wells)`;
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
      self.updateDashboardTableRows();
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
      const keys = Object.keys(result);
      const firstKey = keys[0];
      const firstData = getData(result[firstKey]);
      const firstMaxData = d3.max(firstData)+ Math.ceil(0.2 * d3.max(firstData));
      const _k = Object.keys(DTSRC_MAP).find(__k => DTSRC_MAP[__k] == firstKey)
      const label = Object.keys(DTSRC_OPTIONS_MAP).find(l => DTSRC_OPTIONS_MAP[l] == _k);
      let WidgetConfig = {
        name: "New Dashboard",
        config: {
          type: 'bar',
          data: firstData,
          dataSourceLabel: label,
          // dataSources: result,
          labelFn: function (config, datum, idx) {
            return Object.keys(firstData)[idx];
          },
          colorFn: function (config, datum, idx) {
            if (config.colors && config.colors[idx]) return config.colors[idx];
            let palette = wiApi.getPalette(config.paletteName || "RandomColor");
            idx = idx % palette.length;
            return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
          },
          title: 'New Dashboard',
          chart_options: {
            maintainAspectRatio: false,
            showSegmentLabel: true
          },
          bar_chart_options: {
            scales: {
              yAxes: [{
                ticks: {
                  maxTicksLimit: 10,
                  min: 0,
                  max: _.isFinite(firstMaxData) ? firstMaxData : undefined
                }
              }],
              xAxes: [{
                ticks: {
                  min: 0,
                max: _.isFinite(firstMaxData) ? firstMaxData : undefined
                }
              }]
            }
          }
        }
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
    if (self.dashboardContent && self.dashboardContent.project) {
      if (self.selectedNode.idProject == self.dashboardContent.project.idProject) {
        self.reloadDashboardData();
        return;
      } 
      confirmDialog("Changes you made may not be saved. Are you sure to switch project?")
        .then(() => {
          self.showGuide = false;
          self.showLoadingDashboard = true;
          wiApi.getFullInfoPromise(self.selectedNode.idProject, self.selectedNode.owner, self.selectedNode.owner ? self.selectedNode.name : null).then((prjTree) => {
            projectTree = prjTree;
            buildDashboard(projectTree);
          }).catch((e) => {
            console.error(e);
          }).finally(() => {
            self.showLoadingDashboard = false;
          });
        })
        .catch(() => {
          // reject modal
          $timeout(() => {
            const currPrjNode = $scope.treeConfig.find(p => p.idProject == self.dashboardContent.project.idProject)
            currPrjNode._selected = true;
            self.selectedNode._selected = false;
            self.selectedNode = currPrjNode;
            self.selectedNodes.splice(0, 1, currPrjNode);
          })
        })
    } else {
      self.showGuide = false;
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
  }

  function buildDashboard(prjTree) {
    let result = groupWells(prjTree);
    Object.assign(CHART_DATA_SOURCE, result)
    // const configs = [];
    const configs = Object.keys(result).slice(0, 4).map(dataSource => {
      const data = getData(result[dataSource]);
      const maxAxisValue = d3.max(data) + Math.ceil(0.2 * d3.max(data)); // for axis
      const __key = Object.keys(DTSRC_MAP).find(k => DTSRC_MAP[k] == dataSource)
      const dtsrcLabel = Object.keys(DTSRC_OPTIONS_MAP).find(label => DTSRC_OPTIONS_MAP[label] == __key);
      let config = {
        name: dataSource,
        config: {
          type: 'bar',
          data,
          dataSourceLabel: dtsrcLabel,
          labelFn: function(config, datum, idx) {
            return Object.keys(result[dataSource])[idx]
          },
          colorFn: function(config, datum, idx) {
            if (config.colors && config.colors[idx]) return config.colors[idx];
            let palette = wiApi.getPalette(config.paletteName || "RandomColor");
            idx = idx % palette.length;
            return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
          },
          title: dtsrcLabel,
          chart_options: {
            maintainAspectRatio: false,
            showSegmentLabel: true
          },
          bar_chart_options: {
            scales: {
              yAxes: [{
                ticks: {
                  maxTicksLimit: 10,
                  min: 0,
                  max: _.isFinite(maxAxisValue) ? maxAxisValue : undefined
                }
              }],
              xAxes: [{
                ticks: {
                  min: 0,
                  max: _.isFinite(maxAxisValue) ? maxAxisValue : undefined
                }
              }]
            }
          },
        }
      }
      return config;
    });
    $timeout(() => {
      // const _dashboardContent = [wTypeWidgetConfig, fieldWidgetConfig, operatorWidgetConfig, tagWidgetConfig ];
      const _dashboardContent = configs;
      _dashboardContent.project = prjTree;
      self.dashboardContent = _dashboardContent;
      self.updateDashboardTableRows();
    });
  }
  function groupWells(prjTree) {
    /*
    let wTypes = {};
    let fields = {};
    let operators = {};
    let tags = {};
    */

    const result = {};
    const dataSources = Object.values(DTSRC_MAP);
    dataSources.forEach(dataSource => {
      result[dataSource] = {};
    });

    let wells = prjTree.wells;
    for (let well of wells) {
      const wellHeaders = well.wellheaders;
      for (let wh of wellHeaders) {
        const key = wh.header;
        if (!dataSources.includes(key)) continue;
        const value = (!wh.value || !wh.value.length) ? "Unknown" : wh.value;
        result[key][value] = result[key][value] || [];
        result[key][value].push(well);
        /*
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
        */
      }

      if (well.relatedTo && well.relatedTo.tags && well.relatedTo.tags.length) {
        for (let tag of well.relatedTo.tags) {
          if (tag && tag !== "") {
            result['tags'][tag] = result['tags'][tag] || [];
            result['tags'][tag].push(well);
          }
        }
      }
    }

    return result;
    // return { wTypes, fields, operators, tags };
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
  }

  this.$onInit = function () {
    self.showDialog = false;
    self.loginUrl = `${WI_AUTH_HOST}/login` || $location.search().loginUrl || self.loginUrl;
    self.queryString = queryString.parse(location.search);
    self.setDashboardMode = "true"; 
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

    if (self.username && self.password) {
      $http({
        method: "POST",
        url: `${WI_AUTH_HOST}/login`,
        data: {
          username: self.username,
          password: self.password
        },
        headers: {}
      }).then(
        function (response) {
          wiToken.setToken(response.data.content.token);
          wiToken.saveToken(response.data.content);
        },
        function (errorResponse) {
          console.error(errorResponse);
        }
      );
    }
    $scope.$watch(
      function () {
        return localStorage.getItem("token");
      },
      function (newValue, oldValue) {
        // console.log(newValue, oldValue);
        if (localStorage.getItem("token") !== null) {
          getZoneList();
          getCurveTree();
          wiApi.setBaseUrl(BASE_URL);
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
		$scope.wellSelect = $scope.wellSelect.filter(w => !w._selected)
    $timeout(() => {
      self.selectedIdsHash = {};
      $scope.focusWell.length = 0;
    })
		
    updateCurveList()
      .then(updateZoneList)
      .then(updateMarkerList);
  };

  this.downloadZipFile = function () {
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
      wellPosition: self.wellPosition,
      zoneMap: $scope.zoneMap,
      darkMode: self.darkMode,
      showZonesets: self.showZonesets,
      showMarkersets: self.showMarkersets
    };
    var json2 = JSON.stringify(dataMapSetting),
      blob2 = new Blob([json2], { type: "octet/stream" });
    zip.file("mapsetting.json", blob2);

    //file blocks.geojson
    var dataBlocks = self.geoJson;
    var json3 = JSON.stringify(dataBlocks),
      blob3 = new Blob([json3], { type: "octet/stream" });
    zip.file("blocks.geojson", blob3);

    //Compress file
    zip.generateAsync({ type: "blob" }).then(content => {
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
        let wellId = self.selectedNode.idWell;
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

  function getWells(projectId, projectNodeChildren, cb) {
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
        cb(null, response.data.content, projectNodeChildren);
      },
      function (err) {
        cb(err);
      }
    );
  }

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
  };
  this.clickCurveFunction = function ($event, node) {
    $scope.focusCurve = node;
  };
  this.clickZoneFunction = function ($event, node) {
    // console.log("Zone click function", $event, node);
    if (node.idZone)
      $scope.focusMZ = node;
  }
  this.clickMarkerFunction = function ($event, node) {
    // console.log("Marker click function", $event, node);
    if (node.idMarker)
      $scope.focusMZ = node;
  }
  this.clickFunction = function ($event, node, selectedNodes) {
    self.selectedNode = node;
    self.selectedNodes = selectedNodes.map((e)=>e.data);
    if(!self.showMap){
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
    $http({
      method: "POST",
      url: BASE_URL + "/project/list",
      data: {},
      headers: {
        Authorization: wiToken.getToken()
      }
    }).then(
      function (response) {
        let projects = response.data.content;
        cb(null, projects, treeConfig);
      },
      function (err) {
        cb(err);
      }
    );
  }

  async function getWells(projectId, projectNodeChildren, cb) {
    // console.log(projectId)
    if(projectNodeChildren.shared){
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
    );
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
    $http({
      method: "POST",
      url: BASE_URL + "/project/well/dataset/curve/info",
      data: {
        idCurve: curveId
      },
      headers: {
        Authorization: wiToken.getToken()
      }
    }).then(
      function (response) {
        cachedCurvesInfo[curveId] = {
          content: response.data.content,
          timestamp: Date.now()
        };
        cb(null, response.data.content);
      },
      function (err) {
        cb(err);
      }
    );
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
    $http({
      method: "POST",
      url: BASE_URL + "/project/well/dataset/curve/getRawData",
      data: {
        idCurve: curveId
      },
      headers: {
        Authorization: wiToken.getToken()
      }
    }).then(
      function (response) {
        cachedCurvesData[curveId] = {
          content: response.data.content,
          timestamp: Date.now()
        };
        cb(null, response.data.content);
      },
      function (err) {
        cb(err);
      }
    );
  }

  function getWellInfo(wellId, cb) {
    $http({
      method: "POST",
      url: BASE_URL + "/project/well/info",
      data: {
        idWell: wellId
      },
      headers: {
        Authorization: wiToken.getToken()
      }
    }).then(
      function (response) {
        cb(null, response.data.content);
      },
      function (err) {
        cb(err);
      }
    );
  }

  $scope.storageDatabase = {};
  //===============================SYNC data well selected===========================
  this.refeshWellSelect = async function () {
    self.projectList = [];
    self.idWellArray = [];
    await $http({
      method: "POST",
      url: BASE_URL + "/project/list",
      data: {},
      headers: {
        Authorization: wiToken.getToken()
      }
    }).then(
      function (response) {
        self.projectList = response.data.content;
        console.log(self.projectList)
        for (let index = 0; index < self.projectList.length; index++) {
          let element = self.projectList[index];
          if(element.owner){
            wiApi.getFullInfoPromise(element.idProject, element.owner, element.owner ? element.name : null).then((data) => {
              console.log(data);
              console.log('---------------------------------------')
            }).catch((e) => {
              console.error(e);
            })
          } else if (!element.owner){
            wiApi.getListWells(element.idProject).then((data) => {
              console.log(data);
              console.log('---------------------------------------')
            }).catch((e) => {
              console.error(e);
            })
          }
  
        }
      }
    )
  }
  this.setContainerFileBrowser = function(container) {
    self.fileBrowserController = container;
    console.log(container);
  }
  this.uploadZipFileDatabase = function() {
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
      showMarkersets: self.showMarkersets
    };
    var json2 = JSON.stringify(dataMapSetting),
      blob2 = new Blob([json2], { type: "octet/stream" });
    zip.file("mapsetting.json", blob2);

    //file blocks.geojson
    var dataBlocks = self.geoJson;
    var json3 = JSON.stringify(dataBlocks),
      blob3 = new Blob([json3], { type: "octet/stream" });
    zip.file("blocks.geojson", blob3);

    //Compress file
    zip.generateAsync({ type: "blob" }).then(content => {
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
  
        }, function(item) {
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
                            blocks: zip1.file("blocks.geojson").async("string")
                          };
                  })
                  .then(async function (result) {
                    await result.contour.then(function (data) {
                      return new Promise(response => {
                        data = JSON.parse(data);
                        let wells = [];
                        async.each(data.selectWell, (w, next) => {
                          if(w.shared) {
                            $http({
                              method: "POST",
                              url: BASE_URL + "/project/fullinfo",
                              data: {
                                idProject: w.idProject,
                                name: w.nameOwner,
                                shared: true,
                                owner: w.owner
                              },
                              headers: {
                                Authorization: wiToken.getToken()
                              }
                            })
                            .then((res) => {
                              console.log(res)
                              project = res.data.content;
                              proWells = project.wells;
                              wll = proWells.find(wl => wl.idWell == w.idWell)
                              wll ? wells.push(wll) : null
                              next()
                            })
                          }else {
                            $http({
                                  method: "POST",
                                  url: BASE_URL + "/project/fullinfo",
                                  data: {
                                    idProject: w.idProject,
                                    name: w.nameOwner,
                                  },
                                  headers: {
                                    Authorization: wiToken.getToken()
                                  }
                                })  
                            .then((res) => {
                              console.log(res)
                              project = res.data.content;
                              proWells = project.wells;
                              wll = proWells.find(wl => wl.idWell == w.idWell)
                              wll ? wells.push(wll) : null
                              next()
                            })
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
                          // if (!$scope.$$phase) {
                          //   $scope.$apply();
                          //   $timeout(res, 500);
                          // }
                          $timeout(async () => {
                            await updateCurveList();
                            await updateZoneList();
                            await updateMarkerList();
                            response();
                          });
                        })
                      })
                    });
                    result.mapSetting.then(function (data) {
                      data = JSON.parse(data);
                      $scope.themeMap = data.themeMap;
                      $scope.allPopup = data.allPopup;
                      self.activeTheme = data.activeTheme;
                      self.controlPanel = data.controlPanel;
                      self.point = data.point;
                      self.showContour = data.showContour;
                      self.showTrajectory = data.showTrajectory;
                      self.darkMode = data.darkMode;
                      setDarkMode(self.darkMode);
                      self.showZonesets = data.showZonesets;
                      self.showMarkersets = data.showMarkersets;
                      $scope.zoneMap = data.zoneMap;
                      $timeout(() => {
                        if (!$scope.$$phase) {
                          $scope.$apply();
                        };
                      })
                    });
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
    if (!points[0]) return;
    let idx = points[0]._index;
    wiDialog.colorPickerDialog(widgetConfig.colors[idx], {}, function (colorStr) {
      widgetConfig.colors[idx] = colorStr;
    });
  }

  function getDepthsOfWell (well) {
    const topDepth = Math.min(...well.datasets.map(dts => dts.top));
    const bottomDepth = Math.max(...well.datasets.map(dts => dts.bottom));
    return { topDepth, bottomDepth };
  }
  const WELL_INFOS = [
    { field: "Well Name", matchKeys: ["WELL"], getValueFn:(matchField, well) => well.alias || well.name },
    { field: "Top Depth", matchKeys: ["STRT"], getValueFn:(matchField, well) => {
      const unit = well.unit;
      return `${ wiApi.bestNumberFormat(wiApi.convertUnit(getDepthsOfWell(well).topDepth, 'm', unit), 4) } (${unit})`;
    } },
    { field: "Bottom Depth", matchKeys: ["STOP"], getValueFn:(matchField, well) => {
      const unit = well.unit;
      return `${ wiApi.bestNumberFormat(wiApi.convertUnit(getDepthsOfWell(well).bottomDepth, 'm', unit), 4 ) } (${unit})`;
    } },
    { field: "unit", matchKeys: [""], getValueFn:(matchField, well) => well.unit },
    { field: "UWI", matchKeys: ["UWI"], getValueFn:(matchField, well) => matchField.value },
    { field: "API", matchKeys: ["API"], getValueFn:(matchField, well) => matchField.value },
    { field: "Id", matchKeys: ["ID"], getValueFn:(matchField, well) => matchField.value },
    { field: "Name", matchKeys: ["NAME"], getValueFn:(matchField, well) => matchField.value },
    { field: "Company", matchKeys: ["COMP"], getValueFn:(matchField, well) => matchField.value },
    { field: "Operator", matchKeys: ["OPERATOR"], getValueFn:(matchField, well) => matchField.value },
    { field: "Author", matchKeys: ["AUTHOR"], getValueFn:(matchField, well) => matchField.value },
    { field: "Date", matchKeys: ["DATE"], getValueFn:(matchField, well) => matchField.value },
    { field: "Logging date", matchKeys: ["LOGDATE"], getValueFn:(matchField, well) => matchField.value },
    { field: "Service company", matchKeys: ["SRVC"], getValueFn:(matchField, well) => matchField.value },
    { field: "License number", matchKeys: ["LIC"], getValueFn:(matchField, well) => matchField.value },
    { field: "County", matchKeys: ["CNTY"], getValueFn:(matchField, well) => matchField.value },
    { field: "State", matchKeys: ["STATE"], getValueFn:(matchField, well) => matchField.value },
    { field: "Province", matchKeys: ["PROV"], getValueFn:(matchField, well) => matchField.value },
    { field: "Country", matchKeys: ["CTRY"], getValueFn:(matchField, well) => matchField.value },
    { field: "Location", matchKeys: ["LOC"], getValueFn:(matchField, well) => matchField.value },
    { field: "Field", matchKeys: ["FLD"], getValueFn:(matchField, well) => matchField.value },
    { field: "Project", matchKeys: ["PROJ"], getValueFn:(matchField, well) => matchField.value },
    { field: "Code", matchKeys: ["CODE"], getValueFn:(matchField, well) => matchField.value },
    { field: "Area", matchKeys: ["AREA"], getValueFn:(matchField, well) => matchField.value },
    { field: "Type", matchKeys: ["TYPE"], getValueFn:(matchField, well) => matchField.value },
    { field: "Status", matchKeys: ["STATUS"], getValueFn:(matchField, well) => matchField.value },
    { field: "Well Type", matchKeys: ["WTYPE"], getValueFn:(matchField, well) => matchField.value },
    { field: "Fluid", matchKeys: ["FLUID"], getValueFn:(matchField, well) => matchField.value },
  ];
  this.dashboardTableSortableOptions = {
    placeholder: 'sortable-placeholder',
    cursor: 'grabbing',
    stop: function(event, ui) {
      self.updateDashboardTableSelectedFields();
    },
    start: function (event, ui) {
      ui.placeholder.height(ui.item.outerHeight());
      ui.placeholder.width(ui.item.outerWidth());
      ui.helper.css({"background-color": "#fff"})
    },
  }
  this.showDashboardTable = true;
  this.dashboardTableFields = WELL_INFOS.map(w => ({...w, selected: false}));
  this.dashboardTableWidthArr = [];
  this.dashboardTableHeaders = this.dashboardTableFields.filter(w => w.selected).map(w => w.field);
  this.dashboardTableDefaultWidths = WELL_INFOS.map(w => 100);
  this.updateDashboardTableSelectedFields = function() {
    self.showDashboardTable = false;
    $timeout(() => {
      const newFields = self.dashboardTableFields.filter(w => w.selected).map(w => w.field);
      const newTableWidths = newFields.map(f => 100);
      /*
      for (let i = 0; i < newTableWidths.length; ++i) {
        const lastIdx = self.dashboardTableHeaders.findIndex(_h => _h == newFields[i]);
        if (lastIdx && lastIdx >= 0) {
          newTableWidths[i] = self.dashboardTableWidthArr[lastIdx];
        }
      }
      */
      Object.assign(self.dashboardTableWidthArr, newTableWidths);
      Object.assign(self.dashboardTableDefaultWidths, newTableWidths);
      Object.assign(self.dashboardTableHeaders, newFields);
      self.dashboardTableHeaders.length = newFields.length;
      self.dashboardTableWidthArr.length = newTableWidths.length;
      self.dashboardTableDefaultWidths.length = newTableWidths.length;
      self.updateDashboardTableRows();
      self.showDashboardTable = true;
    }, 100)
  }
  this.onDashboardTableInit = function(tableWidthArray) {
    $timeout(() => {
      self.dashboardTableWidthArr = tableWidthArray;
    })
  }
  this.onDashboardTableHeaderWidthChanged = function(leftColIdx, leftColWidth, rightColIdx, rightColWidth) {
    $timeout(() => {
      self.dashboardTableWidthArr[leftColIdx] = leftColWidth;
      self.dashboardTableWidthArr[rightColIdx] = rightColWidth;
    });
  }
  this.dashboardTableRows = [];
  this.updateDashboardTableRows = function() {
    if (!self.dashboardContent) return;
    const newRows = self.dashboardContent.project.wells.map(well => {
      return self.dashboardTableFields.filter(field => field.selected).map(fieldObj => {
        const match = (well.wellheaders.find(wh => fieldObj.matchKeys.includes(wh.header)) || {});
        return {
          criteria: fieldObj,
          matched: match,
          well
        }
      })
    })
    Object.assign(self.dashboardTableRows, newRows);
    self.dashboardTableRows.length = newRows.length;
  }
  this.isDashboardTableCheckAll = function() {
    return self.dashboardTableFields.every(f => f.selected);
  }
  this.toggleDashboardTableCheckAll = function() {
    if (self.isDashboardTableCheckAll()) {
      self.dashboardTableFields.forEach(f => f.selected = false);
    } else {
      self.dashboardTableFields.forEach(f => f.selected = true);
    }
    self.updateDashboardTableSelectedFields();
  }
}