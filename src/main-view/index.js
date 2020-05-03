var componentName = "mainView";
module.exports.name = componentName;
require("./style.less");
require("../../vendors/css/i2g-magic.less");
require("../../vendors/css/i2g-reset-css.less");
require("../../vendors/css/i2g-color.less");
require("../../vendors/css/i2g-input.less");
require("../../vendors/css/i2g-select.less");
require("../../vendors/css/i2g-reset-ui-select.less");
require("../../vendors/css/i2g-ngdialog.less");

var app = angular.module(componentName, ['wiDropdownList','ngDialog']);

app.component(componentName, {
  template: require("./template.html"),
  controller: mainViewController,
  controllerAs: "self",
  bindings: {
    
  },
  transclude: true
});

function mainViewController($scope, ngDialog) {
  let self = this;
  // map = new google.maps.Map(document.getElementById('map'), {
  //   zoom: 10,
  //   center: { lat: 21.344, lng: 107.036 },
  //   scaleControl: true,
  //   mapTypeId: google.maps.MapTypeId.ROADMAP

  // });
  this.showDialog = function() {
    ngDialog.open({
      template: 'templateOpenProject',
      className: 'i2g-ngdialog',
      scope: $scope,
  });
  }
}
