const componentName = "baseMap";
module.exports.name = componentName;
require("./style.less");
const queryString = require("query-string");
const utils = require("../utils");

config = require("../../config/default").production;
const WI_AUTH_HOST = config.wi_auth;
localStorage.setItem('__BASE_URL', WI_AUTH_HOST);

const app = angular.module(componentName, [
  "sideBar",
  "wiTreeView",
  "wiTreeViewVirtual",

  "wiLogin",
  "ngDialog",
  "wiToken",
  'wiApi',
  'file-explorer',
  'wiDialog',

  // contour modules
  'contourView',
  'contourFileImport',
  'colorScaleGenerator'
]);

app.component(componentName, {
  template: require("./template.html"),
  controller: baseMapController,
  controllerAs: "self",
  bindings: {
    zoneDefault: "@",
    hasWiLogin: "<",
    projectId: "<",
    hasProjectList: "<",
  },
  transclude: true
});

function baseMapController($scope, $timeout, wiApi) {
  const self = this;

  this.projectConfig = [];
  this.selectedWellConfig = [];
  this.selectedNodes = [];
  this.selectedWells = [];
  const loadingSpinner = {
    show: () => {$scope.__showLoading = true; $timeout(() => $scope.$digest())},
    hide: () => {$scope.__showLoading = false; $timeout(() => $scope.$digest())},
  }
  const notifyDialog = {
    removing: false,
    doRemove: function(notice) {
      if (this.removing) {
        $timeout(() => {
          this.doRemove(notice);
        }, 100);
      } else {
        this.removing = true;
        const idx = $scope.__notifications.findIndex(nt => nt == notice);
        // console.log("remove notice", idx, notice);
        if (isFinite(idx) && idx >= 0) {
          $scope.__notifications.splice(idx, 1);
          this.removing = false;
          $timeout(() => {
            $scope.$digest()
          }, 100);
        }
      }
    },
    autoRemove: function(notice) {
      $timeout(() => {
        this.doRemove(notice);
      }, notice.duration * 1000);
    },
    success: function(message, title = "", duration = 2, isHtml = false) {
      const notice = {status: 'success', message, title, duration, isHtml};
      // console.log("show notice", notice);
      $scope.__notifications.push(notice);
      this.autoRemove(notice);
    },
    error: function(message, title = "", duration = 2, isHtml = false) {
      const notice = {status: 'error', message, title, duration, isHtml};
      // console.log("show notice", notice);
      $scope.__notifications.push(notice);
      this.autoRemove(notice);
    },
    warning: function(message, title = "", duration = 2, isHtml = false) {
      const notice = {status: 'warning', message, title, duration, isHtml};
      // console.log("show notice", notice);
      $scope.__notifications.push(notice);
      this.autoRemove(notice);
    }
  }

  this.$onInit = function () {
    self.showDialog = false;
    self.loginUrl = `${WI_AUTH_HOST}/login`;
    self.queryString = queryString.parse(location.search);

    if (localStorage.getItem("token") !== null) {
      updateProjectTree();
    }

    $scope.__tab = 'project';
    $scope.__notifications = [];
  };
  this.runMatch = function (node, criteria) {
    let keySearch = criteria.toLowerCase();
    let searchArray = (node.alias || node.name || "").toLowerCase();
    return searchArray.includes(keySearch);
  };

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

  this.getChildren = function (node) {
    if (node && node.idProject) {
      return node.wells;
    } else if (node && node.idZoneSet) {
      return node.zones;
    } else if (node && node.idMarkerSet) {
      return node.markers;
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

  this.selectWells = async function() {
    // console.log(self.selectedNodes);
    for (const node of self.selectedNodes) {
      node._selected = false;
      if (node.idWell) {
        const wellId = node.idWell;
        const lat = utils.getLat(node.well_headers);
        const long = utils.getLong(node.well_headers);
        const x = utils.getX(node.well_headers);
        const y = utils.getY(node.well_headers);
        if (utils.checkCoordinate(lat, long, x, y) === undefined) {
          notifyDialog.error(`
            Well: <b>${node.name}</b>.<br/>
            Lat Long cannot be converted to UTM or failed to get projected coordinates.
          `, "Well Error", 2, true);
          continue;
        }
        const foundWell = self.selectedWellConfig.find(function (item) {
          return item.idWell === wellId;
        });
        if (!foundWell) {
          $timeout(function () {
            const cloneNode = angular.copy(node);
            cloneNode._selected = false;
            self.selectedWellConfig.push(cloneNode);
            (self.selectedWellConfig || []).sort((a, b) => a.name.localeCompare(b.name))
          });
        }
      } else if (node.idProject) {
        try {
          const wells = await getWells(node.idProject, node.owner, node.name);
          for (const well of wells) {
            const wellId = well.idWell;
            const lat = utils.getLat(well.well_headers);
            const long = utils.getLong(well.well_headers);
            const x = utils.getX(well.well_headers);
            const y = utils.getY(well.well_headers);
            if (utils.checkCoordinate(lat, long, x, y) === undefined) {
              notifyDialog.error(`
                Well: <b>${well.name}</b>.<br/>
                Lat Long cannot be converted to UTM or failed to get projected coordinates.
              `, "Well Error", 2, true);
              continue;
            }
            const foundWell = self.selectedWellConfig.find(function (item) {
              return item.idWell === wellId;
            });
            if (!foundWell) {
              $timeout(function () {
                self.selectedWellConfig.push(well);
                (self.selectedWellConfig || []).sort((a, b) => a.name.localeCompare(b.name))
              });
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  this.updateProjectTree = updateProjectTree;

  this.clickProjectTreeNodeFn = function($event, node, selectedNodes) {
    self.selectedNodes = selectedNodes.map((e)=>e.data);
    if (!$event.shiftKey && !$event.ctrlKey && !$event.metaKey) {
			for (const project of self.projectConfig) {
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
    } else if (node.idProject) {
      if (!node.timestamp || Date.now() - node.timestamp > 10 * 1000) {
        loadingSpinner.show();
        getWells(node.idProject, node.owner, node.name)
          .then(wells => {
            $timeout(() => {
              node.wells = (wells || []).sort((a, b) => a.name.localeCompare(b.name));
              loadingSpinner.hide();
            })
          })
      } else {
        node.timestamp = Date.now();
      }
    }
  }

  this.clickWellTreeNodeFn = function($event, node, selectedNodes) {
    self.selectedWells = selectedNodes.map(n => n.data);
  }

  this.clearWell = function() {
    for (const well of self.selectedWells) {
      const foundIdx = self.selectedWellConfig.findIndex(w => w.idWell == well.idWell);
      if (isFinite(foundIdx) && foundIdx >= 0) {
        self.selectedWellConfig.splice(foundIdx, 1);
      }
    }
  }

  this.clearAllWells = function() {
    self.selectedWellConfig.length = 0;
  }

  this.nodeComparator = function(node1, node2) {
    return (
      node1.idProject === node2.idProject &&
      node1.idCurve === node2.idCurve &&
      node1.idDataset === node2.idDataset &&
      node1.idWell === node2.idWell
    )
  }

  async function getWells(projectId, projectOwner, projectName) {
    return await wiApi.client("WI_BASE_MAP_CLIENT").getFullInfoPromise(projectId, projectOwner, projectName)
      .then((project) => {      
        return wiApi.client("WI_BASE_MAP_CLIENT").getWellsPromise(project.idProject);
      })
      .catch(e => {
        console.error(e);
      });
  }

  async function updateProjectTree() {
    loadingSpinner.show();
    self.projectConfig = [];
    try {
      const projects = await wiApi.client('WI_BASE_MAP_CLIENT').getProjectsPromise();
      self.projectConfig = projects;
      $timeout(() => {
        $scope.$digest();
        loadingSpinner.hide();
      }, 100);
    } catch (err) {
      console.error(err);
    }
  }
}