var EarthStation = angular.module('EarthStation', []);
EarthStation.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
      when('/',    {
                        templateUrl: 'templates/ThreeD.html',
                        controller: ThreeDCtrl
                    }).
      otherwise({redirectTo: '/'});
}]);
