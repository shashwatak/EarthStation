function ThreeJS(LiveTracking) {
  var three_d_running = false;
  var camera, scene, renderer, earth, skybox, camera_pivot;

  var request_id;
  var $container  = $('#three_d_display');
  var WIDTH       = $container.width(),
      HEIGHT      = $container.height();
  var VIEW_ANGLE  = 35,
      ASPECT      = WIDTH / HEIGHT,
      NEAR        = 0.1,
      FAR         = 1000000;



  //init();
  //animate();

  function init (){
    // Initialize the big three
    renderer    = new THREE.WebGLRenderer();
    camera      = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.x = 40000;
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
    var earth_texture     = new THREE.ImageUtils.loadTexture("../img/world.jpg");
    var earth_material    = new THREE.MeshBasicMaterial({ map : earth_texture, wireframe: false });
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
    renderer.render(scene, camera);
  };

  function start_animation() {
    if(!three_d_running){
      three_d_running = true;
      animate();
    }
  }

  function stop_animation() {
    if(three_d_running){
      three_d_running = false;
    }
  }
  var wait_time = 0;
  function animate(anim_time) {
    if (three_d_running) {
      request_id = requestAnimationFrame( animate );
      renderer.render( scene, camera );
      var now = new Date();
      var time = {
        year   : now.getUTCFullYear(),
        month  : now.getUTCMonth()+1,
        day    : now.getUTCDate(),
        hour   : now.getUTCHours(),
        minute : now.getUTCMinutes(),
        second : now.getUTCSeconds()
      };
      if ((anim_time - wait_time) > 1000){
        LiveTracking.update_sats(time);
        wait_time = anim_time;
      }

    }
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
    if (new_camera_position > 20000 && new_camera_position < 50000){
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

  function add_path(ecf_coords){
    var path_material_ecf = new THREE.LineBasicMaterial( { color: 0x708090, opacity: 1, linewidth: 1, vertexColors: THREE.VertexColors } );
    var path_ecf = new THREE.Line( geometry_from_points(ecf_coords),  path_material_ecf );
    scene.add(path_ecf);
    return path_ecf;
  }

  return {
    init : init,
    start_animation : start_animation,
    stop_animation : stop_animation,
    add_path : add_path,
    pivot_camera_for_mouse_deltas : pivot_camera_for_mouse_deltas,
    zoom_camera_for_mouse_delta : zoom_camera_for_mouse_delta,
  }

};

function LiveTracking (){
  var track_sat = new Worker('../lib/workers/track_sat.js');

  function register_message_listener (event_listener_callback) {
    track_sat.addEventListener('message', function (e) {
      if( console4Worker.filterEvent(e) ) {
        console.log(e);
      }
      else if (e.data.cmd === 'track_update'){
        var sat_item = e.data.sat_item;
        if (event_listener_callback){
          event_listener_callback (sat_item);
        };
      };
    });
  };

  function add_satellite (satrec) {
    track_sat.postMessage({cmd : 'add_satellite', satrec : satrec});
  };

  function update_sats (time) {
    track_sat.postMessage({cmd : 'update_sats', time : time});
  };

  return {
    register_message_listener : register_message_listener,
    add_satellite : add_satellite,
    update_sats : update_sats
  }
}

