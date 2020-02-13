var componentName = "baseMap";
module.exports.name = componentName;
require("./style.less");
const queryString = require("query-string");
const JSZip = require("jszip");
const fileSaver = require("file-saver");

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
  'wiDialog'
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
    }
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
    getValue: function (widgetConfig) {
      return widgetConfig.dataSourceLabel;
    },
    setValue: function (selectedProps, widgetConfig) {
      console.log("setting data source");
      if (selectedProps) {
        /*
        widgetConfig.data = getData(widgetConfig.dataSources[DTSRC_MAP[selectedProps.value]]);
        widgetConfig.labelFn = function (config, datum, idx) {
          return Object.keys(widgetConfig.dataSources[DTSRC_MAP[selectedProps.value]])[idx];
        }
        */
        widgetConfig.data = getData(CHART_DATA_SOURCE[DTSRC_MAP[selectedProps.value]]);
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
  },

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
  self.point = false;
  $timeout(()=>{
    self.point = true;
  },5000)
  self.showContour = false;
  self.showTrajectory = true;
  self.showAxes = true;
  self.axesUnitOptions = AxesUnitOptions;
  self.wellPositionOptions = WellPositionOptions;
  self.wellPosition = self.wellPositionOptions[0].value;
  self.axesUnit = self.axesUnitOptions[0];
  self.selectedIdsHash = {};
  self.selectedNode = null;
  self.selectedNodes = [];
  self.showLoading = false;
  self.showLoadingDashboard = false;
  self.showMap = true;
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
    const files = $element.find("input.file-upload")[0].files;
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
    const files = $element.find("input.file-upload")[0].files;
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
    const files = $element.find("input.file-upload")[1].files;
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
    const files = $element.find("input.file-upload")[1].files;
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
              return new Promise(res => {
                data = JSON.parse(data);
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
                if (!$scope.$$phase) {
                  $scope.$apply();
                  $timeout(res, 500);
                }
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
  this.changeLayout = function () {
    if(!self.showDashboard) {
      self.showDashboard = !self.showDashboard;
    }
    $(".main").toggleClass("change-layout");
    $(".dialog").toggleClass("change-layout-dialog");
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
        Object.assign(widgetConfig.config, {
          data: getData(data),
          // dataSources: result,
          labelFn: function (config, datum, idx) {
            return Object.keys(data)[idx];
          },
          colorFn: function (config, datum, idx) {
            let palette = wiApi.getPalette("RandomColor");
            return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
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
    const config = await getDashboardTemplate();
    if (!config) return;
    const widgetConfigs = config.widgets;
    self.showLoadingDashboard = true;
    wiApi.getFullInfoPromise(self.selectedNode.idProject, self.selectedNode.owner, self.selectedNode.owner ? self.selectedNode.name : null).then((prjTree) => {
      projectTree = prjTree;
      let result = groupWells(prjTree);
      Object.assign(CHART_DATA_SOURCE, result)

      const _dashboardContent = widgetConfigs.map(wConfig => {
        const data = result[DTSRC_MAP[DTSRC_OPTIONS_MAP[wConfig.config.dataSourceLabel]]];
        Object.assign(wConfig.config, {
          data: getData(data),
          // dataSources: result,
          labelFn: function (config, datum, idx) {
            return Object.keys(data)[idx];
          },
          colorFn: function (config, datum, idx) {
            let palette = wiApi.getPalette("RandomColor");
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
      let WidgetConfig = {
        name: "New Dashboard",
        config: {
          type: 'bar',
          data: getData(result.wTypes),
          // dataSources: result,
          labelFn: function (config, datum, idx) {
            return Object.keys(result.wTypes)[idx];
          },
          colorFn: function (config, datum, idx) {
            let palette = wiApi.getPalette("RandomColor");
            return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
          },
          title: 'New Dashboard',
          bar_chart_options: {
            scales: {
              yAxes: [{
                ticks: {
                  // stepSize: 1.0
                  maxTicksLimit: 10
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
  this.openDashboard = function () {
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
    let wTypeWidgetConfig = {
      name: "Well Type",
      config: {
        type: 'bar',
        data: getData(result.wTypes),
        // dataSources: result,
        dataSourceLabel: 'Well By Type',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.wTypes)[idx];
        },
        colorFn: function (config, datum, idx) {
          let palette = wiApi.getPalette("RandomColor");
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        },
        title: 'Well Type',
        bar_chart_options: {
          scales: {
            yAxes: [{
              ticks: {
                maxTicksLimit: 10,
                min: 0
              }
            }],
            xAxes: [{
              ticks: {
                // maxTicksLimit: 10,
                min: 0
              }
            }]
          }
        },
      },
      id: getUniqChartID()
    }
    let fieldWidgetConfig = {
      name: "Fields",
      config: {
        type: 'bar',
        data: getData(result.fields),
        // dataSources: result,
        dataSourceLabel: 'Well By Field',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.fields)[idx];
        },
        colorFn: function (config, datum, idx) {
          // return 'rgba(64,64,200,0.7)';
          let palette = wiApi.getPalette("RandomColor");
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        },
        bar_chart_options: {
          scales: {
            yAxes: [{
              ticks: {
                maxTicksLimit: 10,
                min: 0
              }
            }],
            xAxes: [{
              ticks: {
                // maxTicksLimit: 10,
                min: 0
              }
            }]
          }
        },
        title: 'Fields'
      },
      id: getUniqChartID()
    }
    let operatorWidgetConfig = {
      name: "Operators",
      config: {
        type: 'bar',
        data: getData(result.operators),
        // dataSources: result,
        dataSourceLabel: 'Well By Operator',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.operators)[idx];
        },
        colorFn: function (config, datum, idx) {
          // return 'rgba(64,200,64,0.7)';
          let palette = wiApi.getPalette("RandomColor");
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        },
        bar_chart_options: {
          scales: {
            yAxes: [{
              ticks: {
                maxTicksLimit: 10,
                min: 0
              }
            }],
            xAxes: [{
              ticks: {
                // maxTicksLimit: 10,
                min: 0
              }
            }]
          }
        },
      },
      id: getUniqChartID()
    }
    let tagWidgetConfig = {
      name: "Tags",
      config: {
        type: 'bar',
        data: getData(result.tags),
        // dataSources: result,
        dataSourceLabel: 'Well By Tag',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.tags)[idx];
        },
        colorFn: function (config, datum, idx) {
          let palette = wiApi.getPalette("RandomColor");
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        },
        bar_chart_options: {
          scales: {
            yAxes: [{
              ticks: {
                maxTicksLimit: 10,
                min: 0
              }
            }],
            xAxes: [{
              ticks: {
                // maxTicksLimit: 10,
                min: 0
              }
            }]
          }
        },
      },
      id: getUniqChartID()
    }
    let curveTagWidgetConfig = {
      name: "Curve Tags",
      config: {
        type: 'bar',
        data: getData(result.curveTags),
        // dataSources: result,
        dataSourceLabel: 'Curve By Tag',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.curveTags)[idx];
        },
        colorFn: function (config, datum, idx) {
          let palette = wiApi.getPalette("RandomColor");
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        },
        bar_chart_options: {
          scales: {
            yAxes: [{
              ticks: {
                maxTicksLimit: 10,
                min: 0
              }
            }],
            xAxes: [{
              ticks: {
                // maxTicksLimit: 10,
                min: 0
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
    self.baseUrl = $location.search().baseUrl || self.baseUrl;
    // self.getLoginUrl = `${WI_AUTH_HOST}/login`;
    self.loginUrl =
      `${WI_AUTH_HOST}/login` || $location.search().loginUrl || self.loginUrl;
    self.queryString = queryString.parse(location.search);
    if (localStorage.getItem("token") !== null) {
      getZoneList();
      getCurveTree();
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
        }
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
        $scope.zoneFieldTable = _.orderBy(response.data,'DisplayName',true);
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
    for (let deleteNode of deleteNodes) {
      let idx = $scope.wellSelect.findIndex(node => node === deleteNode);
      $scope.wellSelect.splice(idx, 1);
    }
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
      let node = self.selectedNodes[i];
      if (node.idWell) {
        let wellId = node.idWell;
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
    console.log(node)
    if (node.idCurve) {
      // console.log("Curve clicked");
    } else if (node.idDataset) {
      // console.log("Dataset clicked");
    } else if (node.idWell) {
      // console.log("Well clicked");
    } else if (node.idProject) {
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
              label: e.name
            },  
            icon: "project-normal-16x16",
            properties: e
          }
        });
        console.log(list);
        wiDialog.promptListDialog({
          title: "Select project to save",
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
            var file = new File([content], "i2G_basemap_configuration.zip");
            wiDialog.treeExplorer({
                selectWhat: 'folder',
                file: file,
                url: config.url,
                storage_database: JSON.stringify({
                  company: sd.company,
                  directory: sd.input_directory,
                  whereami: "WI_BASE_MAP"
                })

              }, Upload, (res) => {
                console.log(res);
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
              label: e.name
            },  
            icon: "project-normal-16x16",
            properties: e
          }
        });
        console.log(list);
        wiDialog.promptListDialog({
          title: "Select project to save",
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
                      return new Promise(res => {
                        data = JSON.parse(data);
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
                        if (!$scope.$$phase) {
                          $scope.$apply();
                          $timeout(res, 500);
                        }
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
                  // if (/(.zip)/.exec(file.name)) {
                  //   console.log(".zip file upzip");
                  //   JSZip.loadAsync(file)
                  //     .then(function (zip) {
                  //       return {
                  //         contour: zip.file("contour.json").async("string"),
                  //         mapSetting: zip.file("mapsetting.json").async("string"),
                  //         blocks: zip.file("blocks.geojson").async("string")
                  //       };
                  //     })
                  //     .then(async function (result) {
                  //       await result.contour.then(function (data) {
                  //         return new Promise(res => {
                  //           data = JSON.parse(data);
                  //           $scope.wellSelect = data.selectWell || [];
                  //           $scope.curveList = data.selectCurve || [];
                  //           $scope.zoneList = data.selectedZone || [];
                  //           $scope.markerList = data.selectedMarker || [];
                  //           self.noWell = false;
                  //           $scope.focusCurve = $scope.curveList.find(c => c._selected);
                  //           let selectedZoneset = $scope.zoneList.find(zs => zs.zones.find(z => z._selected));
                  //           let selectedMarkerset = $scope.markerList.find(ms => ms.markers.find(m => m._selected));
                  //           $scope.focusMZ = selectedZoneset
                  //               ? selectedZoneset.zones.find(z => z._selected)
                  //               : selectedMarkerset ? selectedMarkerset.markers.find(m => m._selected) : null
                  //           if (!$scope.$$phase) {
                  //             $scope.$apply();
                  //             $timeout(res, 500);
                  //           }
                  //         })
                  //       });
                  //       result.mapSetting.then(function (data) {
                  //         data = JSON.parse(data);
                  //         $scope.themeMap = data.themeMap;
                  //         $scope.allPopup = data.allPopup;
                  //         self.activeTheme = data.activeTheme;
                  //         self.controlPanel = data.controlPanel;
                  //         self.point = data.point;
                  //         self.showContour = data.showContour;
                  //         self.showTrajectory = data.showTrajectory;
                  //         self.darkMode = data.darkMode;
                  //         setDarkMode(self.darkMode);
                  //         self.showZonesets = data.showZonesets;
                  //         self.showMarkersets = data.showMarkersets;
                  //         $scope.zoneMap = data.zoneMap;
                  //         $timeout(() => {
                  //           if (!$scope.$$phase) {
                  //             $scope.$apply();
                  //           };
                  //         })
                  //       });
                  //       result.blocks.then(function (data) {
                  //         data = JSON.parse(data);
                  //         self.geoJson = data;
                  //         $scope.$digest();
                  //       });
                  //     });
                  // } else {
                  //   const reader = new FileReader();
                  //   reader.onload = function (event) {
                  //     shp(event.target.result).catch(e => console.error(e));
                  //   };
                  //   reader.onerror = function (event) {
                  //     console.error(event);
                  //   };
                  //   reader.readAsArrayBuffer(file);
                  // }
                }
            });
          });
        });
      });
  }
  this.GetFileSizeNameAndType3 = function (file) {
    if (file) {
      document.getElementById('fp3').innerHTML = '';
        let fsize = file.size;
        document.getElementById('fp3').innerHTML =
          document.getElementById('fp3').innerHTML
          + '<b>File Name: </b>' + file.name + '</br>'
          // + '<b>File Size: </b>' + Math.round((fsize / 1024)) + 'KB </br>'
          // + '<b>File Type: </b>' + file.type + "</br>";
    }
  }
}
