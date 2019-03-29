var app = angular.module('myApp', ['mapView', 'sideBar', 'wi-base-treeview', 'wiLogin', 'ngDialog', 'wiToken']);
app.controller('myCtrl', function ($scope, $http, wiToken) {
    $scope.wellList = [];
    $scope.wellSelect = [];
    if ((localStorage.getItem("token")) !== null) {
        getProjectList();
    }
    $scope.$watch(function () {
        return localStorage.getItem('token');
    }, function (newValue, oldValue) {
        console.log(newValue, oldValue);
        if ((localStorage.getItem("token")) !== null) {
            getProjectList();
        }
    });

    this.refesh = function () {
        getProjectList();
        $scope.wellList = [];
        $scope.wellSelect = [];
    }

    function getProjectList(projectList) {
        var projectList = [];
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
            window.alert("Please login!");
            console.error(errorResponse);
        });
        $scope.projectList = projectList;
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
    $scope.onClickPrj = function (prjIdx) {
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
        let wellId = $scope.wellList[wellIdx].properties.idWell;
        let foundWell = $scope.wellSelect.find(function (item) {
            return item.properties.idWell === wellId;
        });
        if (!foundWell) {
            $scope.wellSelect.push($scope.wellList[wellIdx]);
        }
    }
    $scope.onClickWellonMap = function (wellSelectIdx) {
        $scope.wellSelect.splice((wellSelectIdx), 1);
    }
});