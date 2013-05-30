function UICtrl($scope, ThreeJS, WorkerManager) {
  $scope.sat_table = {};

  ThreeJS.init();
  ThreeJS.start_animation();

  WorkerManager.register_command_callback("tles_update", import_callback);
  function import_callback (data) {
    var sat_item = data.sat_item;
    var satnum = sat_item.satnum;
    if (!$scope.sat_table[satnum]){
      $scope.sat_table[satnum] = sat_item;
      WorkerManager.add_satellite(sat_item.satrec);
    }
  };

  WorkerManager.register_command_callback("done_import", done_import_callback);
  function done_import_callback (data) {
    WorkerManager.update_paths();
  };

  WorkerManager.register_command_callback("live_update", live_update_callback);
  function live_update_callback (data) {
    // When the WorkerManager service updates the satellite data,
    // it callbacks the controller to update the model here.
    var sat_item = data.sat_item;
    var satnum = sat_item.satnum;
    $scope.$apply(function() {
      // I apply these right away because I want these to refresh in the UI.
      $scope.sat_table[satnum]["look_angles"] = sat_item.look_angles;
      $scope.sat_table[satnum]["position_ecf"] = sat_item.position_ecf;
      $scope.sat_table[satnum]["position_gd"] = sat_item.position_gd;
    });
    if (!$scope.sat_table[satnum]["marker_ecf"]){
      $scope.sat_table[satnum]["marker_ecf"] =
        ThreeJS.add_marker(sat_item.position_ecf);
    }
    else {
      ThreeJS.update_marker($scope.sat_table[satnum]["marker_ecf"],
        sat_item.position_ecf);
    }
  };

  WorkerManager.register_command_callback("path_update", path_update_callback);
  function path_update_callback (data) {
    var sat_item = data.sat_item;
    var satnum = sat_item.satnum;
    if (!$scope.sat_table[satnum]["path_ecf"]){
      $scope.sat_table[satnum]["path_ecf"] =
        ThreeJS.add_path(sat_item.ecf_coords_list);
    }/*
    else {
      ThreeJS.update_path($scope.sat_table[satnum]["path_ecf"], sat_item.ecf_coords_list);
    }*/
  };

  var is_fullscreen = false;
  $scope.fullscreen = function () {
    if (!is_fullscreen){
      is_fullscreen = true;
      document.body.webkitRequestFullscreen();
    }
    else {
      is_fullscreen = false;
      document.webkitCancelFullScreen();
    }

  }

  $scope.choose_file = function  () {
    chrome.fileSystem.chooseEntry({type: 'openFile'}, function(tle_file) {
      if (!tle_file) {
        console.log ('No file selected.');
        return;
      }
      google_file_utils.readAsText(tle_file, function (result) {
        // Send the file to a webworker to be parsed.
        // The webworker will update the main thread
        // with new information.
        WorkerManager.update_tles(result);
      });
    });
  };

  var mouse_is_down = false;
  var mouse_X = 0;
  var mouse_Y = 0;

  $scope.mouse_down = function (event) {
    mouse_is_down = true;
  };

  $scope.mouse_up = function (event) {
    mouse_is_down = false;
  };

  $scope.mouse_move = function (event) {
    if (mouse_is_down) {
      var mouse_delta_X = (event.offsetX - mouse_X);
      var mouse_delta_Y = (event.offsetY - mouse_Y);
      ThreeJS.pivot_camera_for_mouse_deltas (mouse_delta_X, mouse_delta_Y);
    }
    mouse_X = event.offsetX;
    mouse_Y = event.offsetY;
  };

  $scope.mouse_wheel = function (event, delta, deltaX, deltaY){
    event.preventDefault();
    ThreeJS.zoom_camera_for_scroll_delta(delta);
  };
};
