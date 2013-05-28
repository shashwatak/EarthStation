var EarthStation = angular.module('EarthStation', ['monospaced.mousewheel']);
EarthStation.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
      when('/',    {
                        templateUrl: 'templates/EarthStation.html',
                        controller: UICtrl
                    }).
      otherwise({redirectTo: '/'});
}]);
EarthStation.service('ThreeJS', ThreeJS);

