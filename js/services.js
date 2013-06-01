function ThreeJS(WorkerManager) {
  // This is for the most part a very standard THREEjs setup.
  // Please familiarize yourself with this magnificent library.
  var camera, scene, renderer, earth, skybox, camera_pivot;
  var sat_table = {};
  /*  sat_table = {
        satnum: {
          path_ecf : THREE.Line,
          marker_ecf: THREE.Mesh,
          etc
        }
      }
  */
  var request_id;
  var $container  = $('#three_d_display');
  var WIDTH       = $container.width(),
      HEIGHT      = $container.height();
  var VIEW_ANGLE  = 35,
      ASPECT      = WIDTH / HEIGHT,
      NEAR        = 0.1,
      FAR         = 1000000;

  function init (){
    // Initialize the big three
    renderer    = new THREE.WebGLRenderer();
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
    var earth_texture     = new THREE.ImageUtils.loadTexture("../img/world.jpg");
    var earth_material    = new THREE.MeshBasicMaterial({ map : earth_texture, wireframe: false });
    // Create map 3D object
    earth = new THREE.Mesh(earth_sphere, earth_material);

    // Initialize the camera.
    camera      = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.x = 40000;
    camera.lookAt ( new THREE.Vector3 (0, 0, 0) );

    // Rotating this pivot allows camera manipulations.
    camera_pivot = new THREE.Object3D();
    camera_pivot.add(camera);
    earth.add(camera_pivot);

    // Add the Earth and Sky to the scene
    scene.add(skybox);
    scene.add(earth);
    // when window is ready, render
    renderer.render(scene, camera);
    THREEx.WindowResize(renderer, camera);
  };

  var three_d_running = false;
  function start_animation() {
    if(!three_d_running){
      three_d_running = true;
      animate();
    }
  };

  function stop_animation() {
    if(three_d_running){
      three_d_running = false; // This will put a stop to the 'rAF() calls in animate()'
    }
  };

  function animate(anim_time) {
    if (three_d_running) {
      request_id = requestAnimationFrame( animate );
      renderer.render( scene, camera );
      animate_for_time(anim_time);
    }
  };
  var update_wait_time = 0;
  var start_time = get_start_time();
  function animate_for_time (anim_time){
    if ((anim_time - update_wait_time) > 200){
      var current_time = increment_time.by_milliseconds(start_time, anim_time);
      WorkerManager.update_sats(current_time);
      WorkerManager.update_paths(current_time);
      update_wait_time = anim_time;
    }
  }
  function get_start_time (){
    var now = new Date();
    var p_now = performance.now();
    var time = {
      year   : now.getUTCFullYear(),
      month  : now.getUTCMonth()+1,
      date_of_month    : now.getUTCDate(),
      hour   : now.getUTCHours(),
      minute : now.getUTCMinutes(),
      second : now.getUTCSeconds()
    };
    var start_time = increment_time.by_milliseconds(time, -p_now);
    return start_time;
  }



  function camera_left_right_pivot (mouse_delta_X) {
    //  IMPORTANT NOTE:
    //  The WebGL world is 3D, and uses a different coordinate system.

    //  Apparent Left-Right rotation of the Earth,
    //  caused by dragging the mouse left-right.
    //  Left-Right is the X-axis in HTML/CSS.
    //  The "Left-Right" rotation that the user sees corresponds to
    //  rotating the Camera Pivot on its Y axis in WebGL.
    var pivot_delta_rot_Y = -mouse_delta_X/WIDTH*Math.PI*2;
    var new_pivot_rot_y = camera_pivot.rotation.y + pivot_delta_rot_Y;
    camera_pivot.rotation.y = new_pivot_rot_y;
  }
  function camera_up_down_pivot (mouse_delta_Y){
    //  IMPORTANT NOTE:
    //  The WebGL world is 3D, and uses a different coordinate system.

    //  Apparent Up-Down rotation of the Earth,
    //  caused by dragging the mouse up-down.
    //  Up-Down is the Y-axis in HTML/CSS.
    //  The "Up-Down" rotation that the user sees corresponds to
    //  rotating the Camera Pivot on its Z axis in WebGL.
    var pivot_delta_rot_Z = mouse_delta_Y/HEIGHT*Math.PI*2;
    var new_pivot_rot_z = camera_pivot.rotation.z + pivot_delta_rot_Z;
    if (new_pivot_rot_z < Math.PI/3 &&
        new_pivot_rot_z > -Math.PI/3){
        // Limit the up down motion
        // so the globe won't flip upside down.
      camera_pivot.rotation.z = new_pivot_rot_z;
    }
  }

  function pivot_camera_for_mouse_deltas (mouse_delta_X, mouse_delta_Y) {
    camera_left_right_pivot (mouse_delta_X);
    camera_up_down_pivot (mouse_delta_Y);
  };

  function zoom_camera_for_scroll_delta (delta){
    // Move camera inwards when user scrolls up
    // Move camera out when user scrolls down.
    var new_camera_position = delta*10 + camera.position.x;
    if (new_camera_position > 20000 && new_camera_position < 50000){
      camera.position.x = new_camera_position;
    }
  };

  function geometry_from_points (path_points) {
    // This turns a set of points into a ThreeJS LineGeometry
    // Uses the ThreeJS Spline function to produce a continuous
    // and smooth circle out of at least 90 points,
    // though I haven't tried less
    var spline = new THREE.Spline();
    spline.initFromArray (path_points);
    var geometry = new THREE.Geometry();
    var colors = [];
    var n_sub = 6;
    for ( var i = 0; i < path_points.length * n_sub; i++ ) {
      var index = i / ( path_points.length * n_sub );
      var position = spline.getPoint(index);
      position = ecf_obj_to_webgl_pos (position);
      geometry.vertices[ i ] = new THREE.Vector3( position.x, position.y, position.z );
      colors[ i ] = new THREE.Color( 0xff00ff );
      //colors[ i ].setHSV( 0.6, ( 200 + position.x ) / 400, 1.0 );
    }
    geometry.colors = colors;
    return geometry;
  };

  function ecf_array_to_webgl_pos (ecf_array){
    return {              // WEBGL  : ECF
      x :  ecf_array[0],  // X      : X
      y :  ecf_array[2],  // Y      : Z
      z : -ecf_array[1]   // Z      : -Y
    }
  };

  function ecf_obj_to_webgl_pos (ecf_obj){
    return {              // WEBGL  : ECF
      x :  ecf_obj.x,     // X      : X
      y :  ecf_obj.z,     // Y      : Z
      z : -ecf_obj.y      // Z      : -Y
    }
  };

  WorkerManager.register_command_callback("tles_update", import_callback);
  function import_callback (data) {
    var satnum = data.sat_item.satnum;
    if (!sat_table[satnum]){
      sat_table[satnum] = {};
    }
  };

  WorkerManager.register_command_callback("live_update", live_update_callback);
  function live_update_callback (data) {
    // When the WorkerManager service updates the satellite data,
    // it callbacks the controller to update the model here.
    var sat_item = data.sat_item;
    var satnum = sat_item.satnum;
    if (!sat_table[satnum]["marker_ecf"]){
      sat_table[satnum]["marker_ecf"] =
        add_marker(sat_item.position_ecf);
    }
    else {
      update_marker(sat_table[satnum]["marker_ecf"],
        sat_item.position_ecf);
    }
  };

  WorkerManager.register_command_callback("path_update", path_update_callback);
  function path_update_callback (data) {
    var sat_item = data.sat_item;
    var satnum = sat_item.satnum;
    if (!sat_table[satnum]["path_ecf"]){
      sat_table[satnum]["path_ecf"] =
        add_path(sat_item.ecf_coords_list);
    }
  };

  function add_path(ecf_coords_list){
    var path_material_ecf = new THREE.LineBasicMaterial( { color: 0x708090, opacity: 1, linewidth: 1, vertexColors: THREE.VertexColors } );
    var path_ecf = new THREE.Line ( geometry_from_points(ecf_coords_list),  path_material_ecf );
    scene.add(path_ecf);
    return path_ecf;
  }

  function update_path (path_ecf, ecf_coords_list) {
    var path_material_ecf = new THREE.LineBasicMaterial( { color: 0x708090, opacity: 1, linewidth: 1, vertexColors: THREE.VertexColors } );
    path_ecf = new THREE.Line ( geometry_from_points(ecf_coords_list),  path_material_ecf );
  }

  function add_marker(position_ecf){
    var marker_radius      = 50,
        marker_segments    = 5,
        marker_rings       = 5;
    var marker_sphere      = new THREE.SphereGeometry( marker_radius, marker_segments, marker_rings );
    var marker_material    = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false, side: THREE.BackSide});
    // Create marker 3D object
    var marker_ecf = new THREE.Mesh(marker_sphere, marker_material);
    var position = ecf_array_to_webgl_pos(position_ecf);
    marker_ecf.position = position;
    scene.add(marker_ecf);
    return marker_ecf;
  }

  function update_marker(marker_ecf, position_ecf){
    var position = ecf_array_to_webgl_pos(position_ecf);
    marker_ecf.position = position;
  }

  function remove_marker (marker_ecf) {
    scene.remove(marker_ecf);
  }

  function remove_path (path_ecf) {
    scene.remove(path_ecf);
  }

  return {
    // All the exposed functions of the ThreeJS Service.
    // Should be enough to allow users of this service to
    // initialize, and add objects, and move camera
    init                          : init,
    start_animation               : start_animation,
    stop_animation                : stop_animation,
    add_path                      : add_path,
    add_marker                    : add_marker,
    update_path                   : update_path,
    update_marker                 : update_marker,
    remove_path                   : remove_path,
    remove_marker                 : remove_marker,
    pivot_camera_for_mouse_deltas : pivot_camera_for_mouse_deltas,
    zoom_camera_for_scroll_delta   : zoom_camera_for_scroll_delta
  }
};

function WorkerManager (){
  // AngularJS Service, provides those that depend on it with
  // the ability to use the Web Workers.
  var track_sat_worker = new Worker('../lib/workers/track_sat.js');
  track_sat_worker.addEventListener('message', worker_update);

  var propagate_path_worker = new Worker('lib/workers/propagate_path.js');
  propagate_path_worker.addEventListener('message', worker_update);

  var import_tles = new Worker('lib/workers/import_tles.js');
  import_tles.addEventListener('message', worker_update);

  // The users of this service register callbacks with an id 'cmd'
  // they are kept in here. When a message is received, this service
  // fires all registered callbacks keyed with e.data.cmd.
  var callbacks_table = {};
  function worker_update (e){
    if( console4Worker.filterEvent(e) ) { console.log(e.data.data.data[0]);   }
    else {
      if (callbacks_table[e.data.cmd]){
        var callbacks = callbacks_table[e.data.cmd];
        var num_callbacks = callbacks.length;
        var callback_itor = 0;
        while (callback_itor < num_callbacks){
          // Fire all callbacks for this cmd.
          callbacks[callback_itor++](e.data);
        }
      }
    }
  };

  function register_command_callback (cmd, callback) {
    if (!callbacks_table[cmd]){
      // First time, make new list.
      callbacks_table[cmd] = [callback];
    }
    else{
      // Add a callback for a given command
      callbacks_table[cmd].push(callback);
    }
  };

  function add_satellite (satrec) {
    track_sat_worker.postMessage({cmd : 'add_satellite', satrec : satrec});
    propagate_path_worker.postMessage({cmd : 'add_satellite', satrec : satrec});
  };

  function update_sats (time) {
    track_sat_worker.postMessage({cmd : 'update_sats', time : time});
  };

  function update_paths (time) {
    propagate_path_worker.postMessage({cmd : 'update_paths', time : time});
  }

  function update_tles (read_file){
    import_tles.postMessage({cmd : 'update_tles', read_file : read_file})
  }

  return {
    register_command_callback : register_command_callback,
    add_satellite : add_satellite,
    update_paths: update_paths,
    update_sats : update_sats,
    update_tles : update_tles
  }
}

