function ThreeJS(WorkerManager) {
  // This is for the most part a very standard THREEjs setup.
  // Please familiarize yourself with this magnificent library.
  var camera, scene, renderer, earth, skybox, camera_pivot, ambient_light, directional_light;
  var sat_table = {};
  /*sat_table = {
      satnum: {
        path_ecf : THREE.Line,
        marker_ecf: THREE.Mesh,
        is_tracking: true
      }
    }*/
  var num_active_satellites = 0;
  var time_offset = 0;
  var request_id;
  var $container  = $('#three_d_display');
  var WIDTH       = $container.width(),
      HEIGHT      = $container.height();
  var VIEW_ANGLE  = 35,
      ASPECT      = WIDTH / HEIGHT,
      NEAR        = 100,
      FAR         = 500000;

  function init (){
    // Initialize the big three
    renderer      = new THREE.WebGLRenderer();
    scene         = new THREE.Scene();
    ambient_light = new THREE.AmbientLight(0x202020);
    directional_light = new THREE.DirectionalLight(0xFFFFFF, 1);

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
    var earth_material    = new THREE.MeshPhongMaterial({ map : earth_texture, wireframe: false, shininess: 1 });
    // Create map 3D object
    earth = new THREE.Mesh(earth_sphere, earth_material);

    // Initialize the camera.
    camera      = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.add (directional_light);
    camera.position.x = 40000;
    camera.lookAt ( new THREE.Vector3 (0, 0, 0) );

    // Rotating this pivot allows camera manipulations.
    camera_pivot = new THREE.Object3D();
    camera_pivot.add(camera);
    earth.add(camera_pivot);

    // Add the Earth and Sky to the scene
    scene.add(skybox);
    scene.add(earth);
    scene.add(ambient_light);
    // when window is ready, render
    renderer.render(scene, camera);
    THREEx.WindowResize(renderer, camera);
  };

  var three_d_running = false;
  function start_animation() {
    if(!three_d_running){
      three_d_running = true;
      animate();
    };
  };

  function stop_animation() {
    if(three_d_running){
      three_d_running = false; // This will put a stop to the 'rAF() calls in animate()'
    };
  };

  function get_start_time (){
    var d_now = new Date();
    var time = {
      year   : d_now.getUTCFullYear(),
      month  : d_now.getUTCMonth()+1,
      date_of_month    : d_now.getUTCDate(),
      hour   : d_now.getUTCHours(),
      minute : d_now.getUTCMinutes(),
      second : d_now.getUTCSeconds()
    };
    var p_now = performance.now();
    var start_time = increment_time.by_milliseconds(time, -p_now);
    return start_time;
  };

  var start_time = get_start_time();
  function animate(anim_time) {
    if (three_d_running) {
      request_id = requestAnimationFrame( animate );
      renderer.render( scene, camera );
      TWEEN.update();
      animate_for_time(anim_time);
    };
  };
  current_time = start_time;
  var update_wait_time = 0;
  function animate_for_time (anim_time){
    if ((anim_time - update_wait_time) > 200){ // update every .2s, 5 Hz
      var time_for_this_update = increment_time.by_milliseconds(start_time, anim_time+time_offset);
      WorkerManager.update_sats(time_for_this_update);
      update_wait_time = anim_time;
    };
  };

  function camera_left_right_pivot (mouse_delta_X) {
    //  IMPORTANT NOTE:
    //  The WebGL world is 3D, and uses a different coordinate system.

    //  Apparent Left-Right rotation of the Earth,
    //  caused by dragging the mouse left-right.
    //  Left-Right is the X-axis in HTML/CSS.
    //  The "Left-Right" rotation that the user sees corresponds to
    //  rotating the Camera Pivot on its Y axis in WebGL.
    var camera_rotation_start = { y: camera_pivot.rotation.y };
    var pivot_delta_rot_Y = -mouse_delta_X/WIDTH*Math.PI*6;
    var new_pivot_rot_y = camera_pivot.rotation.y + pivot_delta_rot_Y;
    var camera_rotation_target = { y: new_pivot_rot_y };

    var tween = new TWEEN.Tween(camera_rotation_start).to(camera_rotation_target, 500);
    tween.onUpdate(function(){
      camera_pivot.rotation.y = camera_rotation_start.y;
    });
    tween.easing(TWEEN.Easing.Exponential.Out);
    tween.start();
  };

  function camera_up_down_pivot (mouse_delta_Y){
    //  IMPORTANT NOTE:
    //  The WebGL world is 3D, and uses a different coordinate system.

    //  Apparent Up-Down rotation of the Earth,
    //  caused by dragging the mouse up-down.
    //  Up-Down is the Y-axis in HTML/CSS.
    //  The "Up-Down" rotation that the user sees corresponds to
    //  rotating the Camera Pivot on its Z axis in WebGL.
    var camera_rotation_start = { z: camera_pivot.rotation.z };
    var pivot_delta_rot_Z = mouse_delta_Y/HEIGHT*Math.PI*6;
    var new_pivot_rot_z = camera_pivot.rotation.z + pivot_delta_rot_Z;

    if (new_pivot_rot_z > Math.PI/3) { new_pivot_rot_z = Math.PI/3; }
    else if (new_pivot_rot_z < -Math.PI/3) { new_pivot_rot_z = -Math.PI/3; };

    var camera_rotation_target = { z: new_pivot_rot_z };

    var tween = new TWEEN.Tween(camera_rotation_start).to(camera_rotation_target, 500);
    tween.onUpdate(function(){
      camera_pivot.rotation.z = camera_rotation_start.z;
    });
    tween.easing(TWEEN.Easing.Exponential.Out);
    tween.start();
  };

  function pivot_camera_for_mouse_deltas (mouse_delta_X, mouse_delta_Y) {
    camera_left_right_pivot (mouse_delta_X);
    camera_up_down_pivot (mouse_delta_Y);
  };

  function zoom_camera_for_scroll_delta (delta){
    // Move camera inwards when user scrolls up
    // Move camera out when user scrolls down.
    var new_camera_position = delta*1000 + camera.position.x;
    if (new_camera_position < 10000){
      new_camera_position = 10000;
    }
    else if (new_camera_position > 100000){
      new_camera_position = 100000;
    };

    var camera_zoom_start = { x: camera.position.x };
    var camera_zoom_target = { x: new_camera_position };

    var tween = new TWEEN.Tween(camera_zoom_start).to(camera_zoom_target, 500);
    tween.onUpdate(function(){
      camera.position.x = camera_zoom_start.x;
    });
    tween.easing(TWEEN.Easing.Exponential.Out);
    tween.start();
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
    var n_sub = 5;
    for ( var i = 0; i < path_points.length * n_sub; i++ ) {
      var index = i / ( path_points.length * n_sub );
      var position = spline.getPoint(index);
      position = ecf_obj_to_webgl_pos (position);
      geometry.vertices[ i ] = new THREE.Vector3( position.x, position.y, position.z );
      colors[ i ] = new THREE.Color( 0xff00ff );
      //colors[ i ].setHSV( 0.6, ( 200 + position.x ) / 400, 1.0 );
    };
    geometry.colors = colors;
    return geometry;
  };

  function ecf_array_to_webgl_pos (ecf_array){
    return {              // WEBGL  : ECF
      x :  ecf_array[0],  // X      : X
      y :  ecf_array[2],  // Y      : Z
      z : -ecf_array[1]   // Z      : -Y
    };
  };

  function ecf_obj_to_webgl_pos (ecf_obj){
    return {              // WEBGL  : ECF
      x :  ecf_obj.x,     // X      : X
      y :  ecf_obj.z,     // Y      : Z
      z : -ecf_obj.y      // Z      : -Y
    };
  };

  WorkerManager.register_command_callback("live_update", live_update_callback);
  function live_update_callback (data) {
    // When the WorkerManager service updates the satellite data.
    var sat_item = data.sat_item;
    var satnum = sat_item.satnum;
    if (!sat_table[satnum]){
      sat_table[satnum] = {};
    }
    if (sat_table[satnum]["is_tracking"]){
      if (sat_table[satnum]["marker_ecf"]){
        update_marker(satnum, sat_item.position_ecf);
      }
      else {
        add_marker(satnum, sat_item.position_ecf);
      };
    }
  };

  WorkerManager.register_command_callback("path_update", path_update_callback);
  function path_update_callback (data) {
    var sat_item = data.sat_item;
    var satnum = sat_item.satnum;
    if (!sat_table[satnum]){
      sat_table[satnum] = {};
    };
    if (sat_table[satnum]["is_tracking"]){
      if (sat_table[satnum]["path_ecf"]){
        update_path(satnum, sat_item["ecf_coords_list"]);
      }
      else {
        add_path(satnum, sat_item["ecf_coords_list"]);
      };
    }
  };

  function add_satellite (satnum, satrec){
    if (!sat_table[satnum]){
      sat_table[satnum] = {};
      sat_table[satnum]["is_tracking"] = true;
      if (num_active_satellites === 0) {
        var light_intesity_start = { intensity : directional_light.intensity };
        var light_intesity_target = { intensity : 0 };

        var tween = new TWEEN.Tween(light_intesity_start).to(light_intesity_target, 1000);
        tween.onUpdate(function(){
          directional_light.intensity = light_intesity_start.intensity;
        });
        tween.easing(TWEEN.Easing.Linear.None);
        tween.start();
      };
      num_active_satellites++;
      WorkerManager.add_satellite(satrec);
      WorkerManager.propagate_orbit(satrec, current_time, 1);
    };
  };

  function remove_satellite (satnum) {
    if (sat_table[satnum]){
      WorkerManager.remove_satellite(satnum);
      num_active_satellites--;
      if (num_active_satellites === 0) {
        var light_intesity_start = { intensity : directional_light.intensity };
        var light_intesity_target = { intensity : 1 };

        var tween = new TWEEN.Tween(light_intesity_start).to(light_intesity_target, 1000);
        tween.onUpdate(function(){
          directional_light.intensity = light_intesity_start.intensity;
        });
        tween.easing(TWEEN.Easing.Linear.None);
        tween.start();
      };
      remove_path(satnum);
      remove_marker(satnum);

      sat_table[satnum] = undefined;
    };
  };

  function add_to_time_offset () {
    time_offset += 60*1000;
  };
  function subtract_from_time_offset () {
    time_offset -= 60*1000;
  };

  function reset_time_offset () {
    time_offset = 0;
  };

  function add_marker(satnum, position_ecf){
    var marker_radius      = 50,
        marker_segments    = 500,
        marker_rings       = 100;
    var marker_sphere      = new THREE.SphereGeometry( marker_radius, marker_segments, marker_rings );
    var marker_material    = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive : 0xffffff, wireframe: false});
    // Create marker 3D object
    var marker_ecf = new THREE.Mesh(marker_sphere, marker_material);
    var position = ecf_array_to_webgl_pos(position_ecf);
    marker_ecf.position = position;
    var point_light = new THREE.PointLight( 0xffffff, 2, 0 );
    point_light.position = position;
    marker_ecf.add(point_light);
    scene.add(marker_ecf);
    sat_table[satnum]["marker_ecf"] = marker_ecf;
    earth.material.needsUpdate = true;
  };

  function add_path(satnum, ecf_coords_list){
    var path_material_ecf = new THREE.LineBasicMaterial( { color: 0x708090, opacity: 1, linewidth: 3, vertexColors: THREE.VertexColors } );
    var path_ecf = new THREE.Line ( geometry_from_points(ecf_coords_list),  path_material_ecf );
    scene.add(path_ecf);
    sat_table[satnum]["path_ecf"] = path_ecf;
  };

  function update_marker(satnum, position_ecf){
    var start_position = sat_table[satnum]["marker_ecf"].position;
    var target_position = ecf_array_to_webgl_pos(position_ecf);
    var tween = new TWEEN.Tween(start_position).to(target_position, 1000);
    tween.onUpdate(function(){
      sat_table[satnum]["marker_ecf"].position = start_position;
    });
    tween.easing(TWEEN.Easing.Linear.None);
    tween.start();
  };

  function update_path (satnum, ecf_coords_list) {
    remove_path (satnum);
    add_path (satnum, ecf_coords_list);
  };

  function remove_marker (satnum) {
    scene.remove(sat_table[satnum]["marker_ecf"]);
    sat_table[satnum]["marker_ecf"] = undefined;
  };

  function remove_path (satnum) {
    scene.remove(sat_table[satnum]["path_ecf"]);
    sat_table[satnum]["path_ecf"] = undefined;
  };

  return {
    // All the exposed functions of the ThreeJS Service.
    // Should be enough to allow users of this service to
    // initialize, and add satellites, and move camera
    init                          : init,
    start_animation               : start_animation,
    stop_animation                : stop_animation,
    add_satellite                 : add_satellite,
    remove_satellite              : remove_satellite,
    pivot_camera_for_mouse_deltas : pivot_camera_for_mouse_deltas,
    zoom_camera_for_scroll_delta  : zoom_camera_for_scroll_delta,
    add_to_time_offset            : add_to_time_offset,
    subtract_from_time_offset     : subtract_from_time_offset,
    reset_time_offset             : reset_time_offset
  };
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
        };
      };
    };
  };

  function register_command_callback (cmd, callback) {
    if (!callbacks_table[cmd]){
      // First time, make new list.
      callbacks_table[cmd] = [callback];
    }
    else {
      // Add a callback for a given command
      callbacks_table[cmd].push(callback);
    };
  };

  function add_satellite (satrec) {
    track_sat_worker.postMessage({cmd : 'add_satellite', satrec : satrec});
  };

  function update_sats (time) {
    track_sat_worker.postMessage({cmd : 'update_sats', time : time});
  };

  function remove_satellite (satnum) {
    track_sat_worker.postMessage({cmd : 'remove_satellite', satnum : satnum});
  };

  function propagate_orbit (satrec, time, orbit_fraction) {
    propagate_path_worker.postMessage({
      cmd : 'propagate_orbit',
      time : time,
      satrec : satrec,
      orbit_fraction : orbit_fraction
    });
  };

  function update_tles (read_file){
    import_tles.postMessage({cmd : 'update_tles', read_file : read_file})
  };

  return {
    register_command_callback : register_command_callback,
    add_satellite : add_satellite,
    propagate_orbit : propagate_orbit,
    update_sats : update_sats,
    update_tles : update_tles,
    remove_satellite : remove_satellite
  };
};

function Motors (WorkerManager){
  var sat_table = {};

  var supported_motors = {
    'Slug Motor' : {
      functions : slug_motor,
      bitrate : 57600
    }
  };
  var sat_table = {};
  /* sat_table = {
      satnum : {
        connectionId : -1 // -1 means it's not connected
        COMport : "COM1" // The string ID of the COM port
        functions   : {
          // Functions defined in a different script,
          // so that we can modularly load a motor's
          // control functions.
          stop_motors : stop_motors,
          move_az_to  : move_az_to,
          move_el_to  : move_el_to,
          get_status  : get_motor_status
        }
        azimuth : motor_az_reading,
        elevation : motor_el_reading,
        status : motor_status
      }
   }*/

  WorkerManager.register_command_callback("live_update", live_update_callback);
  function live_update_callback (data) {
    // When the WorkerManager service updates the satellite data,
    // it callbacks the controller to update the model here.
    var sat_item = data.sat_item;
    var satnum = sat_item.satnum;
    if (sat_table[satnum] && sat_table[satnum]["connectionId"] > 0) {
      if (sat_table[satnum]["is_tracking"]) {
        sat_table[satnum]["functions"].move_az_to(sat_table[satnum].connectionId, sat_item.look_angles[0]);
        sat_table[satnum]["functions"].move_el_to(sat_table[satnum].connectionId, sat_item.look_angles[1]);
      };
      sat_table[satnum]["functions"].get_status(sat_table[satnum].connectionId, sat_table[satnum]["callback"]);
    };
  };

  function connect_motors (satnum, COMport, motor_type, callback){
    function on_open (open_info) {
      if (open_info.connectionId > 0) {
        console.log("Motors.connect_motors(" + COMport + ", " + motor_type + ", " + satnum + ")");
        sat_table[satnum] = {
          connectionId : open_info.connectionId,
          COMport : COMport,
          functions : supported_motors[motor_type]["functions"],
          callback : callback
        };
        sat_table[satnum]["functions"].get_status(sat_table[satnum]["connectionId"],
                                                  sat_table[satnum]["callback"]);
        chrome.serial.flush (sat_table[satnum]["connectionId"], function(){});
      }
      else {
        console.log ("Couldn't Open: " + COMport);
      };
    };
    if (COMport && supported_motors[motor_type] && supported_motors[motor_type]["bitrate"]){
      chrome.serial.open (COMport, {bitrate : supported_motors[motor_type]["bitrate"]}, on_open);
    };
  };

  function close_motors (satnum) {
    if (sat_table[satnum] && sat_table[satnum].connectionId > 0) {
      chrome.serial.close (sat_table[satnum].connectionId, function (close_res) {
        console.log("close: " + sat_table[satnum].COMport + " " + close_res)
        if (close_res) {
          sat_table[satnum].connectionId = -1;
          sat_table[satnum].port = "";
        };
      });
    };
  };

  function start_motor_tracking (satnum, callback) {
    if (sat_table[satnum] && !sat_table[satnum]["is_tracking"]) {
      sat_table[satnum]["is_tracking"] = true;
    }
  };

  function stop_motor_tracking (satnum) {
    if (sat_table[satnum] && sat_table[satnum]["is_tracking"]) {
      sat_table[satnum]["functions"].stop_motors(sat_table[satnum].connectionId);
      sat_table[satnum]["is_tracking"] = false;
    };
  };

  function get_supported_motors (){
    var supported_motors_list = [];
    for (var motor_type in supported_motors) {
      if(supported_motors.hasOwnProperty(motor_type)) {
        supported_motors_list.push(motor_type);
      };
    };
    return supported_motors_list;
  };

  return {
    get_supported_motors : get_supported_motors,
    connect_motors : connect_motors,
    close_motors : close_motors,
    start_motor_tracking : start_motor_tracking,
    stop_motor_tracking : stop_motor_tracking
  };
};

function Radios (WorkerManager){
  var sat_table = {};
  var supported_radios = {
    'ICOM IC821H' : {
      functions : icom_821h,
      bitrate : 19200
    },
    'ICOM IC910H' : {
      functions : icom_910h,
      bitrate : 19200
    }
  };

  WorkerManager.register_command_callback("live_update", live_update_callback);
  function live_update_callback (data) {
    // When the WorkerManager service updates the satellite data,
    // it callbacks the controller to update the model here.
    var sat_item = data.sat_item;
    var satnum = sat_item.satnum;
    if (sat_table[satnum]){
      sat_table[satnum]["doppler_factor"] = sat_item["doppler_factor"];
    };
  };

  function radio_comms_async_loop (sat_item) {
    if (sat_item && sat_item["connectionId"] > 0){
      sat_item["functions"].get_main_frequency(sat_item["connectionId"], function(radio_main_frequency) {
        sat_item["functions"].get_sub_frequency(sat_item["connectionId"], function(radio_sub_frequency){
          if (sat_item["radio_main_frequency"] !== radio_main_frequency ||
              sat_item["radio_sub_frequency"] !== radio_sub_frequency){
            // That means that since the last time we set the frequency,
            // somebody else (the user) changed the dials.
            sat_item["background_tuning_wait_start"] = performance.now();
            sat_item["radio_main_offset"] += (radio_main_frequency - sat_item["uplink_frequency"]);
            sat_item["radio_sub_offset"] += (radio_sub_frequency - sat_item["downlink_frequency"]);
          }
          if (sat_item["is_tracking"] &&
              (performance.now() - sat_item["background_tuning_wait_start"] > 3000)){
            sat_item["radio_main_frequency"] = Math.floor(sat_item["doppler_factor"] * sat_item["uplink_frequency"]) + sat_item["radio_main_offset"];
            sat_item["radio_sub_frequency"] = Math.floor(sat_item["doppler_factor"] * sat_item["downlink_frequency"]) + sat_item["radio_sub_offset"];

            sat_item["functions"].set_main_frequency(sat_item["connectionId"], sat_item["radio_main_frequency"], function(set_main_result) {
              sat_item["functions"].set_sub_frequency(sat_item["connectionId"], sat_item["radio_sub_frequency"], function(set_sub_result){
                sat_item["callback"]({
                  radio_main_frequency : sat_item["radio_main_frequency"],
                  radio_sub_frequency : sat_item["radio_sub_frequency"]
                });
                radio_comms_async_loop (sat_item);
              });
            });
          }
          else{
            console.log ("background!");
            sat_item["radio_main_frequency"] = radio_main_frequency;
            sat_item["radio_sub_frequency"] = radio_sub_frequency;
            sat_item["callback"]({
              radio_main_frequency : sat_item["radio_main_frequency"],
              radio_sub_frequency : sat_item["radio_sub_frequency"]
            });
            radio_comms_async_loop (sat_item);
          };
        });
      });
    };
  };

  function connect_radio (satnum, COMport, radio_type, callback, uplink, downlink){
    function on_open (open_info) {
      if (open_info.connectionId > 0) {
        sat_table[satnum] = {
          connectionId : open_info.connectionId,
          COMport : COMport,
          functions : supported_radios[radio_type]["functions"],
          callback : callback
        };
        sat_table[satnum]["uplink_frequency"] = uplink;
        sat_table[satnum]["downlink_frequency"] = downlink;
        sat_table[satnum]["background_tuning_wait_start"] = 0;

        chrome.serial.flush (sat_table[satnum]["connectionId"], function(result){
          if (result){
            sat_table[satnum]["functions"].set_main_frequency(sat_table[satnum]["connectionId"], sat_table[satnum]["uplink_frequency"], function() {
              sat_table[satnum]["functions"].set_sub_frequency(sat_table[satnum]["connectionId"], sat_table[satnum]["downlink_frequency"], function(){
                sat_table[satnum]["radio_main_frequency"] = sat_table[satnum]["uplink_frequency"];
                sat_table[satnum]["radio_sub_frequency"] = sat_table[satnum]["downlink_frequency"];
                sat_table[satnum]["radio_main_offset"] = 0;
                sat_table[satnum]["radio_sub_offset"] = 0;
                sat_table[satnum]["callback"]({
                  radio_main_frequency : sat_table[satnum]["radio_main_frequency"],
                  radio_sub_frequency : sat_table[satnum]["radio_sub_frequency"]
                });
                radio_comms_async_loop (sat_table[satnum]);
              });
            });
          }
          else {
            console.log ("Couldn't Flush: " + COMport);
          };
        });
      }
      else {
        console.log ("Couldn't Open: " + COMport);
      };
    };
    console.log("radios.connect_radios(" + COMport + ", " + radio_type + ", " + satnum + ")");
    if (COMport && supported_radios[radio_type] && supported_radios[radio_type]["bitrate"]){
      chrome.serial.open (COMport, {bitrate : supported_radios[radio_type]["bitrate"]}, on_open);
    };
  };

  function close_radio (satnum) {
    if (sat_table[satnum] && sat_table[satnum].connectionId > 0) {
      chrome.serial.close (sat_table[satnum].connectionId, function (close_res) {
        console.log("close: " + sat_table[satnum].COMport + " " + close_res)
        if (close_res) {
          sat_table[satnum]["is_tracking"] = false;
          sat_table[satnum].connectionId = -1;
          sat_table[satnum].port = "";
        };
      });
    };
  };

  function start_radio_tracking (satnum, callback) {
    if (sat_table[satnum] && !sat_table[satnum]["is_tracking"]) {
      sat_table[satnum]["is_tracking"] = true;
    }
  };

  function stop_radio_tracking (satnum) {
    if (sat_table[satnum] && sat_table[satnum]["is_tracking"]) {
      sat_table[satnum]["is_tracking"] = false;
    };
  };

  function get_supported_radios (){
    var supported_radios_list = [];
    for (var radio_type in supported_radios) {
      if(supported_radios.hasOwnProperty(radio_type)) {
        supported_radios_list.push(radio_type);
      };
    };
    return supported_radios_list;
  };

  return {
    get_supported_radios : get_supported_radios,
    connect_radio : connect_radio,
    close_radio : close_radio,
    start_radio_tracking : start_radio_tracking,
    stop_radio_tracking : stop_radio_tracking
  };
};
