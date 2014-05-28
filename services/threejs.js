/*
 * EarthStation v0.3
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/EarthStation
 * License: MIT
 */
function ThreeJS(WorkerManager) {
	// This is for the most part a very standard THREEjs setup.
	// Please familiarize yourself with this magnificent library.
	var current_camera, scene, renderer, earth, skybox, ambient_light, directional_light, ball;
	var space_camera, space_camera_pivot, ground_camera, ground_camera_pivot, ground_camera_flag = false;
	var domEvents;
	var mouse = { x: 0, y: 0 };
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
	var $container = $('#three_d_display');
	var WIDTH = $container.width(),
		HEIGHT = $container.height();
	var VIEW_ANGLE = 35,
		ASPECT = WIDTH / HEIGHT,
		NEAR = 100,
		FAR = 500000;
	var EARTH_RADIUS = 6378;

	//Added in object list to store all objects

	var objects = [];

	/*	init()
		Initializes scene, camera, renderer, etc
	 */
	function init() {
	
		// Initialize the big three
		renderer = new THREE.WebGLRenderer();
		scene = new THREE.Scene();
		ambient_light = new THREE.AmbientLight(0xF0F0F0);

		// Add initialized renderer to the DOM
		renderer.setSize(WIDTH, HEIGHT);
		$container.append(renderer.domElement);
		container = renderer.domElement;

		// Set the skybox properties.
		var skybox_radius = 18000,
			skybox_segments = 500,
			skybox_rings = 100;
		var neheTexture = new THREE.ImageUtils.loadTexture("../img/stars.jpg");
		var skybox_sphere = new THREE.SphereGeometry(skybox_radius, skybox_segments, skybox_rings);
		var skybox_material = new THREE.MeshBasicMaterial({
			map: neheTexture,
			wireframe: false,
			side: THREE.BackSide
		});

		// Create map 3D object
		skybox = new THREE.Mesh(skybox_sphere, skybox_material);

		// Set the globes properties.
		var earth_radius = EARTH_RADIUS,
			earth_segments = 500,
			earth_rings = 100;
		var earth_sphere = new THREE.SphereGeometry(earth_radius, earth_segments, earth_rings);
		var earth_texture = new THREE.ImageUtils.loadTexture("../img/world.jpg");
		var earth_material = new THREE.MeshPhongMaterial({
			map: earth_texture,
			wireframe: false,
			shininess: 1
		});
		earth = new THREE.Mesh(earth_sphere, earth_material);

		// Create custom material from the shader code above
		// that is within specially labelled script tags
		var customMaterial = new THREE.ShaderMaterial({
			uniforms: {},
			vertexShader: document.getElementById('vertexShader').textContent,
			fragmentShader: document.getElementById('fragmentShader').textContent,
			side: THREE.BackSide,
			blending: THREE.AdditiveBlending,
			transparent: true
		});

		// Created custom glow in the background for better visibility
		var ballGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 1400, 500, 100);
		ball = new THREE.Mesh(ballGeometry, customMaterial);
		scene.add(ball);

		// Initialize the space camera.
		space_camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
		space_camera.position.x = 40000;
		space_camera.lookAt(new THREE.Vector3(0, 0, 0));

		// Rotating this pivot allows camera manipulations.
		space_camera_pivot = new THREE.Object3D();
		space_camera_pivot.add(space_camera);
		earth.add(space_camera_pivot);
		controls = new THREE.OrbitControls(space_camera, renderer.domElement);
		
		// Initialize the ground camera.
		ground_camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
		earth.add(ground_camera);

		// Set the camera to be used for initial rendering.
		current_camera = space_camera;

		// Add the Earth and Sky to the scene
		scene.add(skybox);
		scene.add(earth);
		scene.add(ambient_light);
		
		// Last but not least, render!
		renderer.render(scene, current_camera);

		THREEx.WindowResize(renderer, current_camera);
	};
	// end init()


	var three_d_running = false;

	/*	start_animation()
	 */
	function start_animation() {
		console.log("start threejs animation");
		if(!three_d_running) {
			three_d_running = true;
			animate();
		};
	};

	//Added function that hides the earth
	var earth_hidden = false;
	// hide_earth()
	function hide_earth() {
		if(!earth_hidden) {
			earth.visible = false;
			ball.visible = false;
			earth_hidden = true;
		} else {
			earth.visible = true;
			ball.visible = true;
			earth_hidden = false;
		};
	}; // end hide_earth()

	function stop_animation() {
		if(three_d_running) {
			three_d_running = false; // This will put a stop to the 'rAF() calls in animate()'
		};
	};

	function get_start_time() {
		var d_now = new Date();
		console.log("d_now="+d_now);
		var time = {
			year: d_now.getUTCFullYear(),
			month: d_now.getUTCMonth() + 1,
			date_of_month: d_now.getUTCDate(),
			hour: d_now.getUTCHours(),
			minute: d_now.getUTCMinutes(),
			second: d_now.getUTCSeconds()
		};
		var p_now = performance.now();
		var start_time = increment_time.by_milliseconds(time, -p_now);
		return start_time;
	};

	var start_time = get_start_time();

	function animate(anim_time) {
		if(three_d_running) {
			request_id = requestAnimationFrame(animate);
			renderer.render(scene, current_camera);
			TWEEN.update();
			animate_for_time(anim_time);
			controls.update();
		};
	};
	var current_time = start_time;
	var update_wait_time = 0;

	function animate_for_time(anim_time) {
		if((anim_time - update_wait_time) > 200) { // update every .2s, 5 Hz
			current_time = increment_time.by_milliseconds(start_time, anim_time + time_offset);
			WorkerManager.update_sats(current_time);
			update_wait_time = anim_time;
		};
	};

	/*
  function camera_left_right_pivot (mouse_delta_X) {
	//  IMPORTANT NOTE:
	//  The WebGL world is 3D, and uses a different coordinate system.

	//  Apparent Left-Right rotation of the Earth,
	//  caused by dragging the mouse left-right.
	//  Left-Right is the X-axis in HTML/CSS.
	//  The "Left-Right" rotation that the user sees corresponds to
	//  rotating the Camera Pivot on its Y axis in WebGL.
	var camera_rotation_start = { y: space_camera_pivot.rotation.y };
	var pivot_delta_rot_Y = -mouse_delta_X/WIDTH*Math.PI*6;
	var new_pivot_rot_y = space_camera_pivot.rotation.y + pivot_delta_rot_Y;
	var camera_rotation_target = { y: new_pivot_rot_y };

	var tween = new TWEEN.Tween(camera_rotation_start).to(camera_rotation_target, 500);
	tween.onUpdate(function(){
	  space_camera_pivot.rotation.y = camera_rotation_start.y;
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
	var camera_rotation_start = { z: space_camera_pivot.rotation.z };
	var pivot_delta_rot_Z = mouse_delta_Y/HEIGHT*Math.PI*6;
	var new_pivot_rot_z = space_camera_pivot.rotation.z + pivot_delta_rot_Z;

	if (new_pivot_rot_z > Math.PI/3) { new_pivot_rot_z = Math.PI/3; }
	else if (new_pivot_rot_z < -Math.PI/3) { new_pivot_rot_z = -Math.PI/3; };

	var camera_rotation_target = { z: new_pivot_rot_z };

	var tween = new TWEEN.Tween(camera_rotation_start).to(camera_rotation_target, 500);
	tween.onUpdate(function(){
	  space_camera_pivot.rotation.z = camera_rotation_start.z;
	});
	tween.easing(TWEEN.Easing.Exponential.Out);
	tween.start();
  };

  function pivot_camera_for_mouse_deltas (mouse_delta_X, mouse_delta_Y) {
	if (!ground_camera_flag){
	  // Don't move the space camera if we are using the ground camera
	  camera_left_right_pivot (mouse_delta_X);
	  camera_up_down_pivot (mouse_delta_Y);
	};
  };

  
  function zoom_camera_for_scroll_delta (delta){
	// Move camera inwards when user scrolls up
	// Move camera out when user scrolls down.
	if (!ground_camera_flag){
	  // Don't move the space camera is we are using the ground camera
	  var new_camera_position = delta*1000 + space_camera.position.x;
	  if (new_camera_position < 10000){
		new_camera_position = 10000;
	  }
	  else if (new_camera_position > 100000){
		new_camera_position = 100000;
	  };

	  var camera_zoom_start = { x: space_camera.position.x };
	  var camera_zoom_target = { x: new_camera_position };

	  var tween = new TWEEN.Tween(camera_zoom_start).to(camera_zoom_target, 500);
	  tween.onUpdate(function(){
		space_camera.position.x = camera_zoom_start.x;
	  });
	  tween.easing(TWEEN.Easing.Exponential.Out);
	  tween.start();
	};
  };
*/

	function switch_to_ground_camera() {
		earth.visible = false;
		ball.visible = false;
		ground_camera_flag = true;
		current_camera = ground_camera;
	};

	function switch_to_space_camera() {
		earth.visible = true;
		ball.visible = true;
		ground_camera_flag = false;
		current_camera = space_camera;
	};

	function geometry_from_points(path_points) {
		// This turns a set of points into a ThreeJS LineGeometry
		// Uses the ThreeJS Spline function to produce a continuous
		// and smooth circle out of at least 90 points,
		// though I haven't tried less
		var spline = new THREE.Spline();
		spline.initFromArray(path_points);
		var geometry = new THREE.Geometry();
		var colors = [];
		var n_sub = 5;

		//made length smaller
		for(var i = 0; i < path_points.length * n_sub; i++) {
			var index = i / (path_points.length * n_sub);
			var position = spline.getPoint(index);
			position = ecf_obj_to_webgl_pos(position);
			geometry.vertices[i] = new THREE.Vector3(position.x, position.y, position.z);
			colors[i] = new THREE.Color(0xff00ff);
			//colors[ i ].setHSV( 0.6, ( 200 + position.x ) / 400, 1.0 );
		};
		geometry.colors = colors;
		return geometry;
	};

	function ecf_array_to_webgl_pos(ecf_array) {
		return { // WEBGL  : ECF
			x: ecf_array[0], // X      : X
			y: ecf_array[2], // Y      : Z
			z: -ecf_array[1] // Z      : -Y
		};
	};

	function ecf_obj_to_webgl_pos(ecf_obj) {
		return { // WEBGL  : ECF
			x: ecf_obj.x, // X      : X
			y: ecf_obj.z, // Y      : Z
			z: -ecf_obj.y // Z      : -Y
		};
	};

	WorkerManager.register_command_callback("live_update", live_update_callback);

	function live_update_callback(data) {
		// When the WorkerManager service updates the satellite data.
		//console.log("threejs live_update_callback");
		var sat_item = data.sat_item;		// data!!!!!
		var satnum = sat_item.satnum;
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
		}
		if(sat_table[satnum]["is_tracking"]) {
			if(sat_table[satnum]["marker_ecf"]) {
				update_marker(satnum, sat_item.position_ecf);
			} else {
				add_marker(satnum, sat_item.position_ecf);
			};
		}
	};
	

	WorkerManager.register_command_callback("path_update", path_update_callback);

	function path_update_callback(data) {
		var sat_item = data.sat_item;		// this has the data
		var satnum = sat_item.satnum;
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
		};
		if(sat_table[satnum]["is_tracking"]) {
			if(sat_table[satnum]["path_ecf"]) {
				update_path(satnum, sat_item["ecf_coords_list"]);
			} else {
				add_path(satnum, sat_item["ecf_coords_list"]);
			};
		};
	};

	function add_satellite(satnum, satrec) {
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
			sat_table[satnum]["is_tracking"] = true;

			if(num_active_satellites <= 0) {
				num_active_satellites = 0;

				var light_intesity_start = {
					//intensity: directional_light.intensity
				};
				var light_intesity_target = {
					//intensity: 0
				};

				var tween = new TWEEN.Tween(light_intesity_start).to(light_intesity_target, 1000);
				tween.onUpdate(function () {
					//directional_light.intensity = light_intesity_start.intensity;
				});
				tween.easing(TWEEN.Easing.Linear.None);
				tween.start();
				
				console.log("add_satellite() in threejs");

			};

			num_active_satellites++;

			WorkerManager.add_satellite(satrec); // satrec=[object Object], also time should be running properly....
			WorkerManager.propagate_orbit(satrec, current_time, 1); // dis one!!
		};

	};

	function remove_satellite(satnum) {
		if(sat_table[satnum]) {
			WorkerManager.remove_satellite(satnum);
			num_active_satellites--;

			if(num_active_satellites <= 0) {
				num_active_satellites = 0;
				var light_intesity_start = {
					//intensity: directional_light.intensity
				};
				var light_intesity_target = {
					intensity: 1
				};

				var tween = new TWEEN.Tween(light_intesity_start).to(light_intesity_target, 1000);
				tween.onUpdate(function () {
					//directional_light.intensity = light_intesity_start.intensity;
				});
				tween.easing(TWEEN.Easing.Linear.None);
				tween.start();
			};

			remove_path(satnum);
			remove_marker(satnum);

			sat_table[satnum] = undefined;
		};
	};

	function add_to_time_offset(time_delta) {
		time_offset += time_delta * 1000;
	};

	function reset_time_offset() {
		time_offset = 0;
	};

	function add_marker(satnum, position_ecf) {
		var marker_radius = 300,
			marker_segments = 1000,
			marker_rings = 100;
		var marker_sphere = new THREE.SphereGeometry(marker_radius, marker_segments, marker_rings);
		var marker_material = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			emissive: 0xffffff,
			wireframe: false
		});
		// Create marker 3D object

		var marker_ecf = new THREE.Mesh(marker_sphere, marker_material);
		marker_ecf.name = satnum;
		var position = ecf_array_to_webgl_pos(position_ecf);
		marker_ecf.position = position;
		var point_light = new THREE.PointLight(0xffffff, 2, 0);
		point_light.position = position;
		//marker_ecf.add(point_light);
		scene.add(marker_ecf);
		objects.push(marker_ecf);
		sat_table[satnum]["marker_ecf"] = marker_ecf;
		earth.material.needsUpdate = true;
	};

	function add_path(satnum, ecf_coords_list) {
		var path_material_ecf = new THREE.LineBasicMaterial({
			color: 0x708090,
			opacity: 1,
			linewidth: 3,
			vertexColors: THREE.VertexColors
		});
		var path_ecf = new THREE.Line(geometry_from_points(ecf_coords_list), path_material_ecf);
		objects.push(path_ecf);
		path_ecf.callback = function () {
			console.log("This is " + satnum);
		}
		scene.add(path_ecf);
		sat_table[satnum]["path_ecf"] = path_ecf;
	};

	function update_marker(satnum, position_ecf) {
		var start_position = sat_table[satnum]["marker_ecf"].position;
		var target_position = ecf_array_to_webgl_pos(position_ecf);
		var tween = new TWEEN.Tween(start_position).to(target_position, 500);
		tween.onUpdate(function () {
			if(sat_table[satnum] && sat_table[satnum]["marker_ecf"]) {
				sat_table[satnum]["marker_ecf"].position = start_position;
			};
		});
		tween.easing(TWEEN.Easing.Linear.None);
		tween.start();
	};

	function update_path(satnum, ecf_coords_list) {
		remove_path(satnum);
		add_path(satnum, ecf_coords_list);
	};

	function remove_marker(satnum) {
		scene.remove(sat_table[satnum]["marker_ecf"]);
		sat_table[satnum]["marker_ecf"] = undefined;
	};

	function remove_path(satnum) {
		scene.remove(sat_table[satnum]["path_ecf"]);
		sat_table[satnum]["path_ecf"] = undefined;
	};

	function get_current_time() {
		return current_time;
	};

	//Interaction added in. 
	//document.addEventListener( 'mousedown', onDocumentMouseDown, false );

	var projector = new THREE.Projector();

	function onDocumentMouseDown(event) {

		event.preventDefault();

		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

		// find intersections

		// create a Ray with origin at the mouse position
		//   and direction into the scene (camera direction)
		var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
		projector.unprojectVector(vector, space_camera);
		var ray = new THREE.Raycaster(space_camera.position, vector.sub(space_camera.position).normalize());

		// create an array containing all objects in the scene with which the ray intersects
		var intersects = ray.intersectObjects(objects);

		// if there is one (or more) intersections
		if(intersects.length > 0) {
			console.log("Hit @ " + toString(intersects[0].point));
			console.log(intersects[0].object.name);
			//Radios.start_radio_tracking(intersects[ 0 ].object.name);
			return intersects[0].object.name;
		}
	}

	//interaction ended

	/*	set_observer_location()
		Translates longitude, latitude, and altitude to webGL coordinates
	 */
	function set_observer_location(observer_longitude, observer_latitude, observer_altitude) {
		
		// Get all coordinates information
		var deg2rad = Math.PI / 180;
		var observer_coords_gd = [observer_longitude * deg2rad,
                              observer_latitude * deg2rad,
                              observer_altitude];
		var observer_coords_ecf = satellite.geodetic_to_ecf(observer_coords_gd);
		var observer_coords_webgl = ecf_array_to_webgl_pos(observer_coords_ecf);
		
		console.log("observer coordinates ecf="+observer_coords_ecf);
		//observer coordinates ecf=-2705.717750383951,-4325.633999311837,3815.1335772482084
		
		// Add marker to indicate user location
		// SphereGeometry( radius, segments, rings )
		var marker_sphere = new THREE.SphereGeometry( 100, 100, 100 );
		var marker_material = new THREE.MeshPhongMaterial({
			color: 0xff0000,
			emissive: 0xffffff,
			wireframe: false
		});

		var marker_ecf = new THREE.Mesh(marker_sphere, marker_material);
		marker_ecf.name = "observer";
		marker_ecf.position = observer_coords_webgl;

		scene.add(marker_ecf);
		
		// Position ground camera
		ground_camera.position = new THREE.Vector3(0, 0, 0);
		ground_camera.lookAt(observer_coords_webgl);
		//ground_camera.translateZ(EARTH_RADIUS);
	};
	
	/*	hide_threejs()
		Hides errythang
	 */
	function hide_threejs() {
		// set visibility of everything to false (?) by traversing from a parent node
		// to all the children of the scene
		// wow so poetic
		console.log("hiding threejs");
		//stop_animation();
		//var visible = false;
		scene.traverse( function ( object ) { object.visible = false; } );
		
	};

	return {
		// All the exposed functions of the ThreeJS Service.
		// Should be enough to allow users of this service to
		// initialize, and add satellites, and move camera
		init: 							init,
		start_animation:				start_animation,
		stop_animation:				stop_animation,
		add_satellite:					add_satellite,
		remove_satellite:				remove_satellite,
		onDocumentMouseDown:			onDocumentMouseDown,
		add_to_time_offset:			add_to_time_offset,
		reset_time_offset:			reset_time_offset,
		get_current_time:				get_current_time,
		switch_to_ground_camera:	switch_to_ground_camera,
		switch_to_space_camera:		switch_to_space_camera,
		hide_earth:						hide_earth,
		set_observer_location:		set_observer_location,
		hide_threejs:					hide_threejs		// hide yo wife hide yo world
	};
};

/*
pivot_camera_for_mouse_deltas : pivot_camera_for_mouse_deltas,
	zoom_camera_for_scroll_delta  : zoom_camera_for_scroll_delta,
	*/