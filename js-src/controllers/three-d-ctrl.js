function ThreeDCtrl($scope) {
  var three_d_running = false;
  var camera, scene, renderer, earth, skybox, camera_pivot;
  $scope.sat_table = {};

  var request_id;
  var $container  = $('#three_d_display');
  var WIDTH       = $container.width(),
      HEIGHT      = $container.height();
  var VIEW_ANGLE  = 35,
      ASPECT      = WIDTH / HEIGHT,
      NEAR        = 0.1,
      FAR         = 1000000;

  var import_tles = new Worker('lib/workers/import_tles.js');
  var propagate_path = new Worker('lib/workers/propagate_path.js');
  import_tles.addEventListener('message', worker_update);
  propagate_path.addEventListener('message', worker_update);

  init();
  animate();

  function init (){
    // Initialize the big three
    renderer    = new THREE.WebGLRenderer();
    camera      = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.x = 70000;
    camera.lookAt ( new THREE.Vector3 (0, 0, 0) );
    camera.up = new THREE.Vector3( 0, 0, 1 );
    scene       = new THREE.Scene();

    // Add initialized renderer to the DOM
    renderer.setSize(WIDTH, HEIGHT);
    $container.append(renderer.domElement);

    // Set the skybox properties.
    var skybox_radius      = 100000,
        skybox_segments    = 500,
        skybox_rings       = 100;
    var skybox_sphere      = new THREE.SphereGeometry( skybox_radius, skybox_segments, skybox_rings );
    var skybox_material    = new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: false, side: THREE.BackSide});
    // Create map 3D object
    skybox = new THREE.Mesh(skybox_sphere, skybox_material);

    // Set the globes properties.
    var earth_radius      = 6378,
        earth_segments    = 500,
        earth_rings       = 100;
    var earth_sphere      = new THREE.SphereGeometry( earth_radius, earth_segments, earth_rings );
    var earth_texture     = new THREE.ImageUtils.loadTexture("img/world.jpg");
    var earth_material    = new THREE.MeshBasicMaterial({ map: earth_texture, wireframe: false });
    // Create map 3D object
    earth = new THREE.Mesh(earth_sphere, earth_material);

    // Rotating this pivot allows reasonable camera manipulations.
    camera_pivot = new THREE.Object3D();
    earth.add(camera_pivot);
    camera_pivot.add(camera);

    // Add the Earth and Sky to the scene
    scene.add(skybox);
    scene.add(earth);

    // when window is ready, render
    three_d_running = true;
    $(window).load(function() {
        renderer.render(scene, camera);
    });
  };

  function animate() {
    if (three_d_running){
      request_id = requestAnimationFrame( animate );
      renderer.render( scene, camera );
    }
  };

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
        // Send the file to a wen worker to be parsed.
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
      pivot_camera_for_mouse_deltas (mouse_delta_X, mouse_delta_Y);
    }
    mouse_X = event.offsetX;
    mouse_Y = event.offsetY;
  };

  $scope.mouse_wheel = function (event, delta, deltaX, deltaY){
    event.preventDefault();
    zoom_camera_for_mouse_delta(delta);
  };


  function pivot_camera_for_mouse_deltas (mouse_delta_X, mouse_delta_Y) {
    /*  Apparent Up-Down rotation of the Earth,
        caused by dragging the mouse up-down.
        Up-Down is the Y-axis in HTML/CSS.
        The WebGL world is 3D, and uses a different
        coordinate system.

        The "Up-Down" rotation that the user sees
        corresponds to rotating the Camera Pivot
        on its Z axis.
    */
    var pivot_delta_rot_Y = -mouse_delta_X/WIDTH*Math.PI*2;
    var new_pivot_rot_y = camera_pivot.rotation.y + pivot_delta_rot_Y;
    camera_pivot.rotation.y = new_pivot_rot_y;

    var pivot_delta_rot_Z = mouse_delta_Y/HEIGHT*Math.PI*2;
    var new_pivot_rot_z = camera_pivot.rotation.z + pivot_delta_rot_Z;
    if (new_pivot_rot_z < Math.PI/3 &&
        new_pivot_rot_z > -Math.PI/3){
      camera_pivot.rotation.z = new_pivot_rot_z;
    }
  };

  function zoom_camera_for_mouse_delta (delta){
    // Move camera inwards when user scrolls up
    // Move camera out when user scrolls down.
    var new_camera_position = delta*10 + camera.position.x;
    if (new_camera_position > 10000 && new_camera_position < 80000){
      camera.position.x = new_camera_position;
    }
  };

  function geometry_from_points (path_points) {
    var spline = new THREE.Spline();
    spline.initFromArray (path_points);
    var geometry = new THREE.Geometry();
    var colors = [];
    var n_sub = 6;
    for ( var i = 0; i < path_points.length * n_sub; i++ ) {
      var index = i / ( path_points.length * n_sub );
      var position = spline.getPoint(index);
      geometry.vertices[ i ] = new THREE.Vector3( position.x, position.y, position.z );
      colors[ i ] = new THREE.Color( 0xff00ff );
      //colors[ i ].setHSV( 0.6, ( 200 + position.x ) / 400, 1.0 );
    }
    geometry.colors = colors;
    return geometry;
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
            // No path has been rendered for this.
            var path_material_ecf = new THREE.LineBasicMaterial( { color: 0x708090, opacity: 1, linewidth: 3, vertexColors: THREE.VertexColors } );
            var path_ecf = new THREE.Line( geometry_from_points(sat_item.ecf_coords),  path_material_ecf );
            $scope.sat_table[sat_item.satnum][path_ecf] = path_ecf;
            scene.add(path_ecf);
          }

        }
      }
    }
  };
};


