/*
 * EarthStation v0.3
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/EarthStation
 * License: MIT
 */

var EarthStation = angular.module('EarthStation', ['monospaced.mousewheel']);
EarthStation.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
  when('/', {templateUrl: 'templates/EarthStation.html',
              controller: UICtrl}).
   otherwise({redirectTo: '/'});
}]);

EarthStation.service('ThreeJS', ThreeJS);
EarthStation.service('PixiJS', PixiJS);
EarthStation.service('WorkerManager', WorkerManager);
EarthStation.service('Motors', Motors);
EarthStation.service('Radios', Radios);
EarthStation.service('Taffy', Taffy);

EarthStation.filter('latitude', latitude_filter);
EarthStation.filter('longitude', longitude_filter);
EarthStation.filter('azimuth', azimuth_filter);
EarthStation.filter('elevation', elevation_filter);
EarthStation.filter('distance', distance_filter);
EarthStation.filter('seconds', seconds_filter);
