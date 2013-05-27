function ThreeDCtrl($scope, ThreeJS) {
  $scope.sat_table = {};
  var import_tles = new Worker('lib/workers/import_tles.js');
  var propagate_path = new Worker('lib/workers/propagate_path.js');
  import_tles.addEventListener('message', worker_update);
  propagate_path.addEventListener('message', worker_update);
  ThreeJS.init();
  ThreeJS.start_animation();
  var mouse_is_down = false;
  var mouse_X = 0;
  var mouse_Y = 0;

  $scope.choose_file = function  () {
    chrome.fileSystem.chooseEntry({type: 'openFile'}, function(tle_file) {
      if (!tle_file) {
        console.log ('No file selected.');
        return;
      }
      readAsText(tle_file, function (result) {
        // Send the file to a webworker to be parsed.
        // The webworker will update the main thread
        // with new information.
        import_tles.postMessage(result);
      });
    });
  };

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
    ThreeJS.zoom_camera_for_mouse_delta(delta);
  };

  function worker_update (e){
    if (e.data.cmd === 'update'){
      var sat_item = e.data.sat_item;
      if (! $scope.sat_table[sat_item.satnum]) {
        // if no entry exists for this catalog number,
        // add this sat to the sat table, under this catalog number.
        $scope.$apply(function (){
          $scope.sat_table[sat_item.satnum] = sat_item;
        });
        propagate_path.postMessage(sat_item.satrec);
      }
      else {
        // This sat is already in the table, just update
        // the pertinent fields.
        if (sat_item.ecf_coords){
          $scope.$apply(function (){
            $scope.sat_table[sat_item.satnum]["ecf_coords"] = sat_item.ecf_coords;
          });
          if ($scope.sat_table[sat_item.satnum][path_ecf]){
            console.log("Update existing paths");
          }
          else{
            var path_ecf = ThreeJS.add_path (sat_item.ecf_coords);
            $scope.sat_table[sat_item.satnum][path_ecf] = path_ecf;
          }
        }
      }
    }
  };

};


