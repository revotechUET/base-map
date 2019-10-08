var componentName = "baseMap";
module.exports.name = componentName;
require("./new-style.less");
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

var app = angular.module(componentName, [
  "mapView",
  "sideBar",
  "wiTreeView",
  "wiDroppable",
  "wiLogin",
  "ngDialog",
  "wiToken",
  "angularResizable"
]);

app.component(componentName, {
  template: require("./new-template.html"),
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
  ngDialog
) {
  let self = this;
  window._basemap = self;
  self.noWell = true;
  $scope.wellSelect = [];
  $scope.focusWell = [];
  $scope.allPopup = false;
  $scope.themeMap = 6;
  self.activeTheme = "Custom theme";
  self.controlPanel = true;
  self.point = false;
  self.showContour = false;
  self.selectedIdsHash = {};
  $scope.curveList = [];
  $scope.focusCurve = null;

  const geoJsonDefault = {
    type: "FeatureCollection",
    features: []
  };

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
      self.geoJson = geoJsonDefault;
      $scope.themeMap = 6;
      $scope.allPopup = false;
      self.activeTheme = "Custom theme";
      self.controlPanel = true;
      self.point = false;
      self.showContour = false;
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
          .then(function (result) {
            result.contour.then(function (data) {
              data = JSON.parse(data);
              $scope.wellSelect = data.selectWell;
              $scope.curveList = data.selectCurve;
              self.noWell = false;
              if (!$scope.$$phase) {
                $scope.$digest();
              }
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
              $scope.$digest();
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
  this.changeTheme = function () {
    document.getElementById("main").classList.toggle("dark-mode");
  }
  this.toggleContour = function () {
    self.showContour = !self.showContour;
  };

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
  $scope.tab = 3;
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
    $scope.wellSelect = [];
    $scope.curveList = [];
    self.noWell = true;
  };

  this.cleanMap = function () {
    $scope.wellSelect = [];
    $scope.curveList.length = 0;
    $scope.focusCurve = null;
    self.noWell = true;
  };

  this.deleteWell = function () {
    console.log("delete selected wells");
    let deleteNodes = Object.values(self.selectedIdsHash).map(
      item => item.data
    );
    for (let deleteNode of deleteNodes) {
      let idx = $scope.wellSelect.findIndex(node => node === deleteNode);
      $scope.wellSelect.splice(idx, 1);
    }
    self.selectedIdsHash = {};
    updateCurveList();
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
      zoneMap: $scope.zoneMap
    };
    var json2 = JSON.stringify(dataMapSetting),
      blob2 = new Blob([json2], { type: "octet/stream" });
    zip.file("mapsetting.json", blob2);

    //file blocks.geojson
    var dataBlocks = _contour.map.getSource("geojson-source")._data;
    var json3 = JSON.stringify(dataBlocks),
      blob3 = new Blob([json3], { type: "octet/stream" });
    zip.file("blocks.geojson", blob3);

    //Compress file
    zip.generateAsync({ type: "blob" }).then(content => {
      fileSaver.saveAs(content, "download.zip");
    });
  };

  async function prepareWellDatasets(well) {
    if (!well.datasets) {
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
  console.log($scope);
  async function updateCurveList() {
    const _curves = $scope.curveList;
    const _wells = $scope.wellSelect;
    if (!_wells.length) return;
    for (let i = 0; i < _wells.length; ++i) {
      await prepareWellDatasets(_wells[i]);
    }
    _curves.length = 0;
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
    if ($scope.focusCurve) {
      if (!_curves.find(c => c.name == $scope.focusCurve.name))
        $scope.focusCurve = null;
    }
    if (!$scope.$$phase) {
      $scope.$digest();
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

          $timeout(() => {
            updateCurveList();
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

              $timeout(() => {
                updateCurveList();
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
      return node.alias || node.name;
    } else if (node && node.idCurve) {
      return node.name;
    }
  };
  this.getIcon = function (node) {
    if (node && node.idWell) return "well-16x16";
    else if (node && node.idProject) return "project-normal-16x16";
    else if (node && node.idCurve) return "curve-16x16";
  };
  this.getChildren = function (node) {
    if (node && node.idProject) {
      return node.wells;
    }
  };
  this.runMatch = function (node, criteria) {
    let keySearch = criteria.toLowerCase();
    let searchArray = node.alias.toLowerCase();
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
  this.clickWellFunction = function ($event, node) {
    $scope.focusWell = node;
  };
  this.clickCurveFunction = function ($event, node) {
    $scope.focusCurve = node;
  };
  this.clickFunction = function ($event, node) {
    if (node.idCurve) {
      // console.log("Curve clicked");
    } else if (node.idDataset) {
      // console.log("Dataset clicked");
    } else if (node.idWell) {
      // console.log("Well clicked");
    } else if (node.idProject) {
      if (!node.timestamp || Date.now() - node.timestamp > 10 * 1000) {
        getWells(node.idProject, node, function (err, wells) {
          if (err) {
            ngDialog.open({
              template: "templateError",
              className: "ngdialog-theme-default",
              scope: $scope
            });
            return console.log(err);
          }
          // node.wells = wells.sort((w1, w2) => (w1.name.localeCompare(w2.name)));
          node.wells = wells;
          async.eachOf(
            node.wells,
            function (well, idx, cb) {
              getDatasets(well.idWell, well, function (err, datasets) {
                if (err) {
                  return cb(err);
                }
                well.datasets = datasets;
                cb();
              });
            },
            function (err) {
              if (err) {
                return console.log(err);
              }
              node.timestamp = Date.now();
            }
          );
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

  function getDatasets(wellId, wellNodeChildren, cb) {
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
        cb(null, response.data.content.datasets, wellNodeChildren);
      },
      function (err) {
        cb(err);
      }
    );
  }

  this.getCurveInfoFn = getCurveInfo;
  const cachedCurvesInfo = {};
  CURVE_CACHING_TIMEOUT = 5000; //ms
  function getCurveInfo(curveId, cb) {
    if (
      cachedCurvesInfo[curveId] &&
      cachedCurvesInfo.timestamp - Date.now() < CURVE_CACHING_TIMEOUT
    )
      return cb(null, cachedCurvesInfo.content);
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
