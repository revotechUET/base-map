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
  'wiApi'
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
app.value('chartSettings', {
  chartTypeOpt: {
    type: 'select',
    label: "Chart Type",
    options: [
      { data: { label: "Bar" }, properties: { value: "bar" } },
      { data: { label: "Horizontal Bar" }, properties: { value: "horizontal-bar" } },
      { data: { label: "Pie" }, properties: { value: "pie" } },
      { data: { label: "Doughnut" }, properties: { value: "doughnut" } }
    ],
    setValue: function (selectedProps, widgetConfig) {
      if (selectedProps)
        widgetConfig.type = selectedProps.value;
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
      if (selectedProps) {
        widgetConfig.data = getData(widgetConfig.dataSources[DTSRC_MAP[selectedProps.value]]);
        widgetConfig.labelFn = function (config, datum, idx) {
          return Object.keys(widgetConfig.dataSources[DTSRC_MAP[selectedProps.value]])[idx];
        }
      }
    }
  },
  tickOpt: {
    type: 'number',
    label: "Ticks",
    getValue: function (widgetConfig, /* editable param */) {
      return _.get(widgetConfig, 'options.scales.yAxes[0].ticks.maxTicksLimit', '[empty]');
    },
    setValue: function (widgetConfig /*editable param*/, newVal) {
      return _.set(widgetConfig, 'options.scales.yAxes[0].ticks.maxTicksLimit', Math.round(Number(newVal)) || 11);
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
});
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

function baseMapController(
  $scope,
  $http,
  $element,
  wiToken,
  $timeout,
  $location,
  ngDialog,
  wiApi
) {
  let self = this;
  window._basemap = self;
  self.noWell = true;
  $scope.wellSelect = [];
  $scope.focusWell = [];
  $scope.allPopup = true;
  $scope.themeMap = 6;
  self.activeTheme = "Standard";
  self.controlPanel = true;
  self.point = false;
  self.showContour = false;
  self.showTrajectory = false;
  self.selectedIdsHash = {};
  self.selectedNode = null;
  self.selectedNodes = [];
  self.showLoading = false;
  self.showLoadingDashboard = false;
  self.showMap = true;
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

  $scope.clearSelectedContourFile = function (event) {
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
            /*
            result.contour.then(function (data) {
              data = JSON.parse(data);
              $scope.wellSelect = data.selectWell || [];
              $scope.curveList = data.selectCurve || [];
              $scope.zoneList = data.selectedZone || [];
              $scope.markerList = data.selectedMarker || [];
              self.noWell = false;
              $timeout(() => {
                if (!$scope.$$phase) {
                  $scope.$apply();
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
              $scope.zoneMap = data.zoneMap;
              $timeout(() => {
                if (!$scope.$$phase) {
                  $scope.$apply();
                };
              })
            });
            */
            await result.contour.then(function (data) {
              return new Promise(res => {
                data = JSON.parse(data);
                $scope.wellSelect = data.selectWell || [];
                $scope.curveList = data.selectCurve || [];
                $scope.zoneList = data.selectedZone || [];
                $scope.markerList = data.selectedMarker || [];
                self.noWell = false;
                $scope.focusCurve = $scope.curveList.find(c => c._selected);
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
            ngDialog.open({
              template: 'dashboard-template-modal',
              controller: ['$scope', function($scope) {
                this.mode = "confirm-modal";
                this.message = "Are you sure to delete this template";
                this.onOkButtonClicked = function() {
                  console.log("Do delete item", item);
                  httpPost("/managementdashboard/delete", {idManagementDashboard: item.properties.idManagementDashboard})
                    .then(res => {
                      console.log(res);
                    })
                    .catch(err => {
                      console.error(err);
                    })
                  $scope.closeThisDialog();
                }
              }],
              controllerAs: 'wiModal'
            })
          }
          this.loadDashboardTemplate = () => {
            resolve(this.selectedNode.content);
            $scope.closeThisDialog();
          }
        }],
        controllerAs: "wiModal"
      });
    })
  }
  this.loadDashboard = async function() {
    const config = await getDashboardTemplate();
    if (!config) return;
    const widgetConfigs = config.widgets;
    self.showLoadingDashboard = true;
    wiApi.getFullInfoPromise(self.selectedNode.idProject, self.selectedNode.owner, self.selectedNode.owner ? self.selectedNode.name : null).then((prjTree) => {
      projectTree = prjTree;
      let result = groupWells(prjTree);

      const _dashboardContent = widgetConfigs.map(wConfig => {
        const data = result[DTSRC_MAP[DTSRC_OPTIONS_MAP[wConfig.config.dataSourceLabel]]];
        Object.assign(wConfig.config, {
          data: getData(data),
          dataSources: result,
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
      console.log(_dashboardContent);
      self.dashboardContent = _dashboardContent;
      self.dashboardContent.project = prjTree;
      $scope.$digest();
    }).catch((e) => {
      console.error(e);
    }).finally(() => {
      self.showLoadingDashboard = false;
    });
  }
  this.saveDashboard = function() {
    const content = self.dashboardContent.map(widget => {
      const { name, id, config } = widget;
      const _config = {
        type: config.type,
        dataSourceLabel: config.dataSourceLabel,
        title: config.title,
        options: config.options,
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
        this.saveDashboardTemplate = function() {
          httpPost("/managementdashboard/new", {content: JSON.stringify(payload)})
            .then(res => {
              console.log(res);
            })
            .catch(err => {
              console.error(err);
            });
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
      let WidgetConfig = {
        name: "New Dashboard",
        config: {
          type: 'bar',
          data: getData(result.wTypes),
          dataSources: result,
          labelFn: function (config, datum, idx) {
            return Object.keys(result.wTypes)[idx];
          },
          colorFn: function (config, datum, idx) {
            let palette = wiApi.getPalette("RandomColor");
            return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
          },
          title: 'New Dashboard',
          options: {
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
    let wTypeWidgetConfig = {
      name: "Well Type",
      config: {
        type: 'bar',
        data: getData(result.wTypes),
        dataSources: result,
        dataSourceLabel: 'Well By Type',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.wTypes)[idx];
        },
        colorFn: function (config, datum, idx) {
          let palette = wiApi.getPalette("RandomColor");
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        },
        title: 'Well Type',
        options: {
          scales: {
            yAxes: [{
              ticks: {
                // stepSize: 1.0
                maxTicksLimit: 10
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
        dataSources: result,
        dataSourceLabel: 'Well By Field',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.fields)[idx];
        },
        colorFn: function (config, datum, idx) {
          // return 'rgba(64,64,200,0.7)';
          let palette = wiApi.getPalette("RandomColor");
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
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
        dataSources: result,
        dataSourceLabel: 'Well By Operator',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.operators)[idx];
        },
        colorFn: function (config, datum, idx) {
          // return 'rgba(64,200,64,0.7)';
          let palette = wiApi.getPalette("RandomColor");
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        }
      },
      id: getUniqChartID()
    }
    let tagWidgetConfig = {
      name: "Tags",
      config: {
        type: 'bar',
        data: getData(result.tags),
        dataSources: result,
        dataSourceLabel: 'Well By Tag',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.tags)[idx];
        },
        colorFn: function (config, datum, idx) {
          let palette = wiApi.getPalette("RandomColor");
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        }
      },
      id: getUniqChartID()
    }
    let curveTagWidgetConfig = {
      name: "Curve Tags",
      config: {
        type: 'bar',
        data: getData(result.curveTags),
        dataSources: result,
        dataSourceLabel: 'Curve By Tag',
        labelFn: function (config, datum, idx) {
          return Object.keys(result.curveTags)[idx];
        },
        colorFn: function (config, datum, idx) {
          let palette = wiApi.getPalette("RandomColor");
          return `rgba(${palette[idx].red},${palette[idx].green},${palette[idx].blue},${palette[idx].alpha})`;
        }
      }, 
      id: getUniqChartID()
    }
    $timeout(() => {
      self.dashboardContent = [wTypeWidgetConfig, fieldWidgetConfig, operatorWidgetConfig, tagWidgetConfig, curveTagWidgetConfig];
      self.dashboardContent.project = prjTree;
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
          tags[tag] = tags[tag] || [];
          tags[tag].push(well);
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
  this.changeTheme = function () {
    document.getElementById("main").classList.toggle("dark-mode");
    $(".dialog").toggleClass("dark-mode");
  }
  this.toggleContour = function () {
    self.showContour = !self.showContour;
  };
  this.toggleTrajectory = function () {
    self.showTrajectory = !self.showTrajectory;
  };

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
        $scope.zoneFieldTable = response.data;
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

  this.refesh = function () {
    getZoneList();
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
      selectCurve: curveSelect
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
      zoneMap: $scope.zoneMap
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
          .sort()
          .reverse()
          .forEach(zsi => _zonesets.splice(zsi, 1));
      }
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
          .sort()
          .reverse()
          .forEach(msi => _markersets.splice(msi, 1));
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
            .sort()
            .reverse()
            .forEach(ci => _curves.splice(ci, 1));
        }
      }
      if ($scope.focusCurve) {
        if (!_curves.find(c => c.name == $scope.focusCurve.name))
          $scope.focusCurve = null;
      }
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
    // console.log(node)
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
}
