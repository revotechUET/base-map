var componentName = 'baseMap';
module.exports.name = componentName;
require('./style.less');

var app = angular.module(componentName, ['mapView', 'sideBar', 'wi-base-treeview', 'wiTreeView', 'wiDroppable', 'wiLogin', 'ngDialog', 'wiToken']);
app.component(componentName, {
    template: require('./template.html'),
    controller: baseMapController,
    controllerAs: 'self',
    bindings: {
        zoneDefault: "@",
        hasWiLogin: "<",
        projectId: "<",
        hasProjectList: "<",
        username: "@",
        password: "@"
    },
    transclude: true
});

function baseMapController($scope, $http, wiToken) {

    let self = this;
    $scope.wellList = [];
    $scope.wellSelect = [];
    $scope.focusWell = [];
    $scope.deleteWellId = 0;

    this.$onInit = function () {
        //CHECK TOKEN
        if ((localStorage.getItem("token")) !== null) {
            getProjectList();
            getZoneList();
            getCurveTree();
        }

        if (self.username && self.password) {
            $http({
                method: 'POST',
                url: 'http://admin.dev.i2g.cloud/login',
                data: {
                    username: self.username,
                    password: self.password,
                },
                headers: {}
            }).then(function (response) {
                wiToken.setToken(response.data.content.token);
                wiToken.saveToken(response.data.content)
            }, function (errorResponse) {
                console.error(errorResponse);
            });
        }
        $scope.$watch(function () {

            return localStorage.getItem('token');
        }, function (newValue, oldValue) {
            // console.log(newValue, oldValue);
            if ((localStorage.getItem("token")) !== null) {
                getProjectList();
                getZoneList();
                getCurveTree();
            }

        });
    }

    function getZoneList() {
        $http({
            method: 'POST',
            url: 'http://dev.i2g.cloud/utm-zones',
            data: {},
            headers: {}
        }).then(function (response) {
            $scope.zoneFieldTable = response.data;
            // Show display value
            $scope.zoneSelected = $scope.zoneFieldTable.find(function (zone) {
                return zone.Name === self.zoneDefault
            });
            // Get value default
            if ($scope.zoneSelected) {
                $scope.zoneMap = $scope.zoneSelected.output;
            }
            // Change value
            $scope.hasChanged = function () {
                $scope.zoneMap = $scope.zoneSelected.output;
            }
        }, function (errorResponse) {
            console.error(errorResponse);
        });
    }

    $scope.getIdWell = function (wellSelectIdx) {
        // this.baseClick.apply(this, arguments);
        $scope.deleteWellId = $scope.wellSelect[wellSelectIdx].properties.idWell;
        $scope.focusWell = $scope.wellSelect[wellSelectIdx].properties;
    }
    $scope.focusWellonMap = function (wellSelectIdx) {
        $scope.focusWell = $scope.wellSelect[wellSelectIdx].properties;
    }

    this.refesh = function () {
        getProjectList();
        getZoneList();
        getCurveTree();
        $scope.wellList = [];
        $scope.wellSelect = [];
    }

    this.moveAllWell = function () {
        for (let index = 0; index < $scope.wellList.length; index++) {
            let wellId = $scope.wellList[index].properties.idWell;
            let foundWell = $scope.wellSelect.find(function (item) {
                return item.properties.idWell === wellId;
            });
            if (!foundWell) {
                $scope.wellSelect.push($scope.wellList[index]);
            }
        }
    }

    this.cleanMap = function () {
        $scope.wellSelect = [];
    }

    function getProjectList(projectList) {
        var projectList = [];
        let _token = wiToken.getToken();
        if (!_token) {
            window.alert("Please login!");
            return;
        }
        if (self.projectId) {
            this.hasProjectList = true;
            var wellList = [];
            $http({
                method: 'POST',
                url: 'http://dev.i2g.cloud/project/well/list',
                data: {
                    idProject: self.projectId
                },
                headers: {
                    "Authorization": wiToken.getToken(),
                }
            }).then(function (response) {
                let wells = response.data.content;
                for (let index = 0; index < wells.length; index++) {
                    pushWellintoList(wellList, wells[index]);
                }
                $scope.wellList = wellList;
                if ((wellList.length) === 0) {
                    window.alert("Well not found in this project!");
                }
            }, function (errorResponse) {
                console.error(errorResponse);
            });
            return;
        } else if (self.projectId === undefined) {
            this.hasProjectList = false;
            $http({
                method: 'POST',
                url: 'http://dev.i2g.cloud/project/list',
                data: {},
                headers: {
                    "Authorization": wiToken.getToken(),
                }
            }).then(function (response) {
                let projects = response.data.content;
                for (let index = 0; index < projects.length; index++) {
                    projectList.push({
                        data: {
                            icon: "project-normal-16x16",
                            label: projects[index].alias,
                        },
                        properties: projects[index]
                    });
                }
            }, function (errorResponse) {
                window.alert("Unauthorized access!");
                console.error(errorResponse);
            });
            $scope.projectList = projectList;
            return;
        }
    }

    $scope.onClickPrj = function (prjIdx) {
        // this.baseClick.apply(this, arguments);
        let clickedPrj = $scope.projectList[prjIdx];
        let idPrj = clickedPrj.properties.idProject;
        var wellList = [];
        $http({
            method: 'POST',
            url: 'http://dev.i2g.cloud/project/well/list',
            data: {
                idProject: idPrj
            },
            headers: {
                "Authorization": wiToken.getToken(),
            }
        }).then(function (response) {
            let wells = response.data.content;
            for (let index = 0; index < wells.length; index++) {
                pushWellintoList(wellList, wells[index]);
            }
            $scope.wellList = wellList;
            if ((wellList.length) === 0) {
                window.alert("Well not found in " + clickedPrj.properties.alias + "!");
            }
        }, function (errorResponse) {
            console.error(errorResponse);
        });
    }

    $scope.onClickWell = function (wellIdx) {
        // this.baseClick.apply(this, arguments);
        let wellId = $scope.wellList[wellIdx].properties.idWell;
        let foundWell = $scope.wellSelect.find(function (item) {
            return item.properties.idWell === wellId;
        });
        if (!foundWell) {
            $scope.wellSelect.push($scope.wellList[wellIdx]);
        }
    }

    this.deleteWell = function () {
        for (let index = 0; index < $scope.wellSelect.length; index++) {
            if ($scope.wellSelect[index].properties.idWell === $scope.deleteWellId) {
                $scope.wellSelect.splice((index), 1);
            }
        }
    }
    this.showAllPopup = function () {

    }

    function pushWellintoList(list, wellToPush) {
        list.push({
            data: {
                icon: "well-16x16",
                label: wellToPush.name,
            },
            properties: wellToPush
        });
    }



    ////////////////////////////////////////////////////////////////////


    this.getLabel = function (node) {
        if (node.idCurve) {
            return node.name;
        } else if (node.idDataset) {
            return node.name;
        } else if (node.idWell) {
            return node.name;
        } else if (node.idProject) {
            return node.alias;
        }
    }
    this.getIcon = function (node) {
        if (node.idCurve) return "curve-16x16";
        else if (node.idDataset) return "curve-data-16x16";
        else if (node.idWell) return "well-16x16";
        else if (node.idProject) return "project-normal-16x16";
    }
    this.getChildren = function (node) {
        if (node.idDataset) {
            return node.curves;
        } else if (node.idWell) {
            return node.datasets;
        } else if (node.idProject) {
            return node.wells;
        }
    }
    this.runMatch = function (node, criteria) {
        return node.name.includes(criteria);
    }
    this.clickFunction = function ($event, node) {

        if (node.idCurve) {
            console.log("Curve clicked");
        } else if (node.idDataset) {
            console.log("Dataset clicked");
        } else if (node.idWell) {
            console.log("Well clicked");
        } else if (node.idProject) {
            if (!node.timestamp || (Date.now() - node.timestamp > 10 * 1000)) {
                getWells(node.idProject, node, function (err, wells) {
                    if (err) {
                        return alertMessage.error(err.data.content);
                    }
                    node.wells = wells;
                    async.eachOf(node.wells, function (well, idx, cb) {
                        getDatasets(well.idWell, well, function (err, datasets) {
                            if (err) {
                                return cb(err);
                            }
                            well.datasets = datasets;
                            cb();
                        });
                    }, function (err) {
                        if (err) {
                            return alertMessage.error(err.message);
                        }
                        node.timestamp = Date.now();
                    });
                });
            }
        }
    }
    this.getCurveTree = getCurveTree;
    const BASE_URL = "http://dev.i2g.cloud";

    function getCurveTree() {
        $scope.treeConfig = [];
        getProjects($scope.treeConfig, function (err, projects) {
            if (err) {
                return alertMessage.error(err.data.content);
            }
            $scope.treeConfig = projects;
        });
    }

    function getProjects(treeConfig, cb) {
        $http({
            method: 'POST',
            url: BASE_URL + '/project/list',
            data: {},
            headers: {
                "Authorization": wiToken.getToken(),
            }
        }).then(function (response) {
            let projects = response.data.content;
            cb(null, projects, treeConfig);
        }, function (err) {
            cb(err);
        });
    }

    function getWells(projectId, projectNodeChildren, cb) {
        $http({
            method: 'POST',
            url: BASE_URL + '/project/well/list',
            data: {
                idProject: projectId
            },
            headers: {
                "Authorization": wiToken.getToken(),
            }
        }).then(function (response) {
            cb(null, response.data.content, projectNodeChildren);
        }, function (err) {
            cb(err);
        });
    }

    function getDatasets(wellId, wellNodeChildren, cb) {
        $http({
            method: 'POST',
            url: BASE_URL + '/project/well/info',
            data: {
                idWell: wellId
            },
            headers: {
                "Authorization": wiToken.getToken(),
            }
        }).then(function (response) {
            cb(null, response.data.content.datasets, wellNodeChildren);
        }, function (err) {
            cb(err);
        });
    }

}