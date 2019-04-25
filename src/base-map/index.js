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

function baseMapController($scope, $http, wiToken, $timeout) {

    let self = this;
    $scope.wellSelect = [];
    $scope.focusWell = [];
    $scope.deleteWellId = 0;

    this.$onInit = function () {
        //CHECK TOKEN
        if ((localStorage.getItem("token")) !== null) {
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

    this.refesh = function () {
        getZoneList();
        getCurveTree();
        $scope.wellSelect = [];
    }

    this.cleanMap = function () {
        $scope.wellSelect = [];
    }

    this.deleteWell = function () {
        for (let index = 0; index < $scope.wellSelect.length; index++) {
            if ($scope.wellSelect[index].idWell === $scope.deleteWellId) {
                $scope.wellSelect.splice((index), 1);
            }
        }
    }
    this.showAllPopup = function () {

    }

    this.dropFn = function (event, helper, node) {
        if (node.idWell) {
            let wellId = node.idWell;
            let foundWell = $scope.wellSelect.find(function (item) {
                return item.idWell === wellId;
            });
            if (!foundWell) {
                $timeout(function () {
                    $scope.wellSelect.push(node);
                })
            }
        } else if (node.idProject) {
            getWells(node.idProject, node, function (err, wells) {
                let countWell = 0;
                for (let index = 0; index < wells.length; index++) {
                    let wellId = wells[index].idWell;
                    let foundWell = $scope.wellSelect.find(
                        function (item) {
                            return item.idWell === wellId;
                        }
                    );
                    if (!foundWell) {
                        $timeout(function () {
                            $scope.wellSelect.push(wells[index]);
                        })
                    }

                }
            });
        }

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

    this.getLabel = function (node) {
        if (node.idWell) {
            return node.name;
        } else if (node.idProject) {
            return node.name;
        }
    }
    this.getIcon = function (node) {
        if (node.idWell) return "well-16x16";
        else if (node.idProject) return "project-normal-16x16";
    }
    this.getChildren = function (node) {
        if (node.idProject) {
            return node.wells;
        }
    }
    this.runMatch = function (node, criteria) {
        return node.name.includes(criteria);
    }
    this.clickWellFunction = function ($event, node) {
        $scope.deleteWellId = node.idWell;
        $scope.focusWell = node;
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