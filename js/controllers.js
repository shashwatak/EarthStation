function UICtrl($scope, ThreeJS, WorkerManager, Motors, Radios) {
  $scope.sat_table = {};

  ThreeJS.init();
  ThreeJS.start_animation();

  WorkerManager.register_command_callback("tles_update", import_callback);
  function import_callback (data) {
    var sat_item = data.sat_item;
    var satnum = sat_item.satnum;
    if (!$scope.sat_table[satnum]){
      $scope.$apply(function(){
        $scope.sat_table[satnum] = sat_item;
        $scope.sat_table[satnum]["uplink_frequency"] = 450000000;
        $scope.sat_table[satnum]["downlink_frequency"] = 145000000;
      });
    }
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
      $scope.sat_table[satnum]["position_eci"] = sat_item.position_eci;
      $scope.sat_table[satnum]["position_gd"] = sat_item.position_gd;
      $scope.sat_table[satnum]["doppler_factor"] = sat_item.doppler_factor;
    });
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

  $scope.select_sat = function (satnum, sat) {
    if (!sat.selected) {
      ThreeJS.add_satellite(satnum, sat.satrec);
      sat.selected = true;
    }
    else {
      ThreeJS.remove_satellite(satnum);
      sat.selected = false;
    };
  };

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


  /* Prepare Motor/Radio Controller. */
  $scope.COM_list = [];
  $scope.selected_motor_port = "";
  $scope.selected_radio_port = "";

  $scope.supported_motor_types = Motors.get_supported_motors();
  $scope.supported_radio_types = Radios.get_supported_radios();
  $scope.selected_motor_type = $scope.supported_motor_types[0];
  $scope.selected_radio_type = $scope.supported_radio_types[0];

  function refresh_com_ports_list () {
    chrome.serial.getPorts(function(ports) {
      if (ports.length > 0) {
        var i = 0;
        for (i = 0; i < ports.length; i++) {
          $scope.$apply (function () {
            $scope.COM_list.push(ports[i]);
          });
        };
        $scope.$apply (function () {
          $scope.selected_motor_port = ports[0];
          $scope.selected_radio_port = ports[0];
        });
      }
      else {
        $scope.selected_port = "¡ERROR, HOMBRE!";
      };
    });
  };
  refresh_com_ports_list();

  $scope.refresh_com_ports_list = refresh_com_ports_list;

  $scope.connect_motors_to_sat = function (satnum, selected_port, selected_motor_type){
    function motor_tracking_callback(motor_data) {
      $scope.$apply(function() {
        $scope.sat_table[satnum]["motor_az"] = motor_data["azimuth"];
        $scope.sat_table[satnum]["motor_el"] = motor_data["elevation"];
        $scope.sat_table[satnum]["motor_status"] = motor_data["motor_status"];
      });
    };
    Motors.connect_motors(satnum, selected_port, selected_motor_type, motor_tracking_callback);
  };

  $scope.start_motor_tracking = function (satnum) {
    Motors.start_motor_tracking(satnum);
  };

  $scope.stop_motor_tracking = function (satnum) {
    Motors.stop_motor_tracking(satnum);
  };

  $scope.close_motors = function (satnum) {
    Motors.close_motors (satnum);
  };

  $scope.connect_radio_to_sat = function (satnum, selected_port, selected_radio_type){
    function radio_tracking_callback(radio_data) {
      $scope.$apply(function() {
        $scope.sat_table[satnum]["radio_main_frequency"] = radio_data["radio_main_frequency"];
        $scope.sat_table[satnum]["radio_sub_frequency"]  = radio_data["radio_sub_frequency"];
      });
    };
    Radios.connect_radio(satnum, selected_port, selected_radio_type, radio_tracking_callback,
      $scope.sat_table[satnum]["uplink_frequency"], $scope.sat_table[satnum]["downlink_frequency"]);
  };

  $scope.start_radio_tracking = function (satnum) {
    Radios.start_radio_tracking(satnum);
  };

  $scope.stop_radio_tracking = function (satnum) {
    Radios.stop_radio_tracking(satnum);
  };

  $scope.close_radio = function (satnum) {
    Radios.close_radio (satnum);
  };
};
