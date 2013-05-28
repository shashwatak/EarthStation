var EarthStation = angular.module('EarthStation', ['monospaced.mousewheel']);
EarthStation.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
      when('/',    {
                        templateUrl: 'templates/ThreeD.html',
                        controller: ThreeDCtrl
                    }).
      otherwise({redirectTo: '/'});
}]);
EarthStation.service('ThreeJS', ThreeJS);

