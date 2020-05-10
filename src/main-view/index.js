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
require("../../vendors/css/i2g-keyframe.less");
require("../../vendors/css/i2g-toast.less");

var app = angular.module(componentName, ['wiDropdownList', 'ngDialog']);

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
  self.toastArray = [];
  self.toastHistory = [];
  const limitToastDisplayed = 3;

  // map = new google.maps.Map(document.getElementById('map'), {
  //   zoom: 10,
  //   center: { lat: 21.344, lng: 107.036 },
  //   scaleControl: true,
  //   mapTypeId: google.maps.MapTypeId.ROADMAP

  // });
  this.showDialog = function () {
    ngDialog.open({
      template: 'templateOpenProject',
      className: 'i2g-ngdialog',
      scope: $scope,
    });
  }
  this.showLogin = function () {
    ngDialog.open({
      template: 'templateOpenProject',
      className: 'i2g-ngdialog',
      scope: $scope,
    });
  }
  
  this.showNotiFn = function (type, title, message, timeLife) {
    let id;
    let item;
    let currentTime;
    let date = new Date();
    //SET OVERLAY LOADING NOTI
    if (type === 'loading-noti') {
      $(".i2g-toast-container").addClass("cursor-not-allowed");
      setTimeout(function () {
        $(".i2g-toast-container").removeClass("cursor-not-allowed");
      }, timeLife);
    }
    //LIMIT ARRAY ITEM
    if (self.toastArray.length > limitToastDisplayed) {
      self.toastArray.pop();
    }
    //SET ID
    id = type + '-' + String(Math.floor(Math.random() * 1000));
    currentTime = String(date.getHours() + ':' + date.getMinutes() + ':' + date.getMilliseconds());
    item = {
      id: id,
      type: type,
      classTypeToast: type,
      title: title,
      message: message,
      timeLife: timeLife,
      currentTime: currentTime,
    };
    //PUSH ARRAY NOTI
    self.toastArray.unshift(item)
    //PLAY SOUND

    //PUSH ARRAY HISTORY
    self.toastHistory.unshift(item)
    //REMOVE ITEM IN ARRAY, REMOVE DOM HTML
    setTimeout(function () {
      document.getElementById(id).classList.add('i2g-close-notification')
    }, (timeLife - 300));
    setTimeout(function () {
      self.toastArray = self.toastArray.filter(function (obj) {
        return obj.id !== id;
      });
      document.getElementById(id).remove();
    }, timeLife);
  }
}
