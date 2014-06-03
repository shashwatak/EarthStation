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
	var mouse = {
		x: 0,
		y: 0
	};
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

	// begin init()
	function init() {
		// Initialize the big three
		renderer = new THREE.WebGLRenderer();
		scene = new THREE.Scene();
		ambient_light = new THREE.AmbientLight(0xF0F0F0);
		directional_light = new THREE.DirectionalLight(0xFFFFFF, 0);

		// Add initialized renderer to the DOM
		renderer.setSize(WIDTH, HEIGHT);
		$container.append(renderer.domElement);
		container = renderer.domElement;

		// Set the skybox properties.
		var skybox_radius 	= 18000,
			skybox_segments	= 500,
			skybox_rings 	= 100;
		var neheTexture 	= new THREE.ImageUtils.loadTexture("../img/stars.jpg");
		var skybox_sphere 	= new THREE.SphereGeometry(skybox_radius, skybox_segments, skybox_rings);
		var skybox_material = new THREE.MeshBasicMaterial({
			map: neheTexture,
			wireframe: false,
			side: THREE.BackSide
		});

		// Create map 3D object
		skybox = new THREE.Mesh(skybox_sphere, skybox_material);

		// Set the globes properties.
		var earth_radius 	= EARTH_RADIUS,
			earth_segments 	= 500,
			earth_rings 	= 100;
		var earth_sphere 	= new THREE.SphereGeometry(earth_radius, earth_segments, earth_rings);
		var earth_texture 	= new THREE.ImageUtils.loadTexture("../img/world.jpg");
		var earth_material 	= new THREE.MeshPhongMaterial({
			map: earth_texture,
			wireframe: false,
			shininess: 1
		});
		// Create map 3D object
		earth = new THREE.Mesh(earth_sphere, earth_material);
		//objects.push(earth);

		// create custom material from the shader code above
		//   that is within specially labeled script tags
		var customMaterial = new THREE.ShaderMaterial({
			uniforms: {},
			vertexShader: document.getElementById('vertexShader').textContent,
			fragmentShader: document.getElementById('fragmentShader').textContent,
			side: THREE.BackSide,
			blending: THREE.AdditiveBlending,
			transparent: true
		});
 
		//load axis for debugging purposes - turn it off if you want, but it does look nice, 
		
		
	
		//Created Custom glow in the background
		var ballGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 1400, 500, 100);
		ball = new THREE.Mesh(ballGeometry, customMaterial);
		scene.add(ball);

		// Initialize the space camera.
		space_camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
		//space_camera.add (directional_light);
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

		// Set the camera to be used for rendering.
		current_camera = space_camera;

		// Add the Earth and Sky to the scene
		//scene.add(skybox);
		scene.add(earth);
		scene.add(ambient_light);
		// when window is ready, render
		renderer.render(scene, current_camera);

		THREEx.WindowResize(renderer, current_camera);
	};	// end init()


	var three_d_running = false;
	function start_animation() {
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
			ball.visible  = false;
			earth_hidden  = true;
		} else {
			earth.visible = true;
			ball.visible  = true;
			earth_hidden  = false;
		};
	}; // end hide_earth()

	function stop_animation() {
		if(three_d_running) {
			three_d_running = false; // This will put a stop to the 'rAF() calls in animate()'
		};
	};

	function get_start_time() {
		var d_now = new Date();
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
		return {              // WEBGL  : ECF
			x: ecf_array[0], // X      : X
			y: ecf_array[2], // Y      : Z
			z: -ecf_array[1] // Z      : -Y
		};
	};

	function ecf_obj_to_webgl_pos(ecf_obj) {
		return {           // WEBGL  : ECF
			x: ecf_obj.x, // X      : X
			y: ecf_obj.z, // Y      : Z
			z: -ecf_obj.y // Z      : -Y
		};
	};

	WorkerManager.register_command_callback("live_update", live_update_callback);

	function live_update_callback(data) {
		// When the WorkerManager service updates the satellite data.
		var sat_item = data.sat_item;
		var satnum = sat_item.satnum;
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
		}
		if(sat_table[satnum]["is_tracking"]) {
			if(sat_table[satnum]["marker_ecf"]) {
				update_marker(satnum, sat_item.position_ecf,sat_item.position_gd);
			} else {
				add_marker(satnum, sat_item.position_ecf, sat_item.position_gd);
			};
		}
	};

	WorkerManager.register_command_callback("path_update", path_update_callback);

	function path_update_callback(data) {
		var sat_item = data.sat_item;
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
					intensity: directional_light.intensity
				};
				var light_intesity_target = {
					intensity: 0
				};

				var tween = new TWEEN.Tween(light_intesity_start).to(light_intesity_target, 1000);
				tween.onUpdate(function () {
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

	function remove_satellite(satnum) {
		if(sat_table[satnum]) {
			WorkerManager.remove_satellite(satnum);
			num_active_satellites--;

			if(num_active_satellites <= 0) {
				num_active_satellites = 0;
				var light_intesity_start = {
					intensity: directional_light.intensity
				};
				var light_intesity_target = {
					intensity: 1
				};

				var tween = new TWEEN.Tween(light_intesity_start).to(light_intesity_target, 1000);
				tween.onUpdate(function () {
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

	function add_to_time_offset(time_delta) {
		time_offset += time_delta * 1000;
	};

	function reset_time_offset() {
		time_offset = 0;
	};

	function add_marker(satnum, position_ecf,position_gd) {
		var marker_radius = 300,
			marker_segments = 1000,
			marker_rings = 100;
		var marker_sphere = new THREE.SphereGeometry(marker_radius, marker_segments, marker_rings);
		var marker_material = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			emissive: 0xffffff,
			wireframe: false
		});
		
		//Load satellite images
		var satTexture = THREE.ImageUtils.loadTexture( "../img/sat_icon.png" );
		// Create marker 3D object
        //Custom satellite image
		var crateMaterial = new THREE.SpriteMaterial( { map: satTexture, useScreenCoordinates: false, color: 0xFFFFFF } );
	var sprite2 = new THREE.Sprite( crateMaterial );
	
		var marker_ecf = new THREE.Mesh(marker_sphere, marker_material);
		sprite2.name = satnum;
		//console.log(position_ecf);
		var position = ecf_array_to_webgl_pos(position_ecf);
		marker_ecf.position = position;
		var point_light = new THREE.PointLight(0xffffff, 2, 0);
		//console.log(position_gd[2]);
		
		//Started here for footprint
		
		var deg2rad = Math.PI / 180;
		var tot = (Math.sqrt(2)/2); 
		
		
		var p = get_distance(position_gd[2],position_gd[1]); //returns [lat,long]
		var numPoints = 12;
		var a = [];
       
		
		a[0] = convert_longitude(position_gd[0]);
		a[1] = convert_latitude(position_gd[1]);
		a[2] = 60;
		//console.log("LONG,LAT,HEIGHT");
		//console.log("BEFORE A : " + a[0] + " " + a[1] + " " + a[2]);
		
		a[0] = parseFloat(a[0]) + parseFloat(p[1]);
		a[0] = a[0].toPrecision(4);
		//console.log("AFTER : " + a[0] + " " + a[1] + " " + a[2]);
		a = [a[0] * deg2rad,a[1] * deg2rad,a[2]];
       var a_array = satellite.geodetic_to_ecf(a);
		var a_gl = ecf_array_to_webgl_pos(a_array);
		//console.log(a_gl);
		var test = satellite.geodetic_to_ecf(position_gd);
		test = ecf_array_to_webgl_pos(test);
		//console.log("TEST IS: ");
		//console.log(test);
	   
	   var b = []
	    b[0] = convert_longitude(position_gd[0]);
		b[1] = convert_latitude(position_gd[1]);
		b[2] = 60;
        b[0] = parseFloat(b[0]) - parseFloat(p[1]);
		b[0] = b[0].toPrecision(4);
		//console.log("AFTER B : " + b[0] + " " + b[1] + " " + b[2]);
		b = [b[0] * deg2rad,b[1] * deg2rad,b[2]];
		//console.log(b);
        var b_array = satellite.geodetic_to_ecf(b);
		var b_gl = ecf_array_to_webgl_pos(b_array);
		
		
		var c = [];
		 c[0] = convert_longitude(position_gd[0]);
		 c[1] = convert_latitude(position_gd[1]);
		 c[2] = 60;
		
       	c[1] = parseFloat(c[1]) + parseFloat(p[0]);
		c[1] = c[1].toPrecision(4);
		//console.log(p);
		// console.log(c[1]);
		// console.log("AFTER C : " + c[0] + " " + c[1] + " " + c[2]);
		c = [c[0] * deg2rad,c[1] * deg2rad,c[2]];
        var c_array = satellite.geodetic_to_ecf(c);
		var c_gl = ecf_array_to_webgl_pos(c_array);
		
		
		
		var d = [];
		 d[1] = convert_latitude(position_gd[1]);
		 d[0] = convert_longitude(position_gd[0]);
		 d[2] = 60;
        d[1] = parseFloat(d[1]) - parseFloat(p[0]); 
		d[1] = d[1].toPrecision(4);
		//console.log("AFTER D : " + d[0] + " " + d[1] + " " + d[2]);
		d = [d[0] * deg2rad,d[1] * deg2rad,d[2]];		
		var d_array = satellite.geodetic_to_ecf(d);
		var d_gl = ecf_array_to_webgl_pos(d_array);
		
		var e =[];
		e[1] = convert_latitude(position_gd[1]);
		e[0] = convert_longitude(position_gd[0]);
		e[2] = 60; 
		e[1] = parseFloat(e[1]) +( tot * parseFloat(p[0])); 
		e[1] = e[1].toPrecision(4);
		e[0] = parseFloat(e[0]) + (tot * parseFloat(p[1]));
		e[0] = e[0].toPrecision(4);
		e = [e[0] * deg2rad,e[1] * deg2rad,e[2]];
		var e_array = satellite.geodetic_to_ecf(e);
		var e_gl = ecf_array_to_webgl_pos(e_array);
		
		var f =[];
		f[1] = convert_latitude(position_gd[1]);
		f[0] = convert_longitude(position_gd[0]);
		f[2] = 60; 
		f[1] = parseFloat(f[1]) +( tot * parseFloat(p[0])); 
		f[1] = f[1].toPrecision(4);
		f[0] = parseFloat(f[0]) - (tot * parseFloat(p[1]));
		f[0] = f[0].toPrecision(4);
		f = [f[0] * deg2rad,f[1] * deg2rad,f[2]];
		var f_array = satellite.geodetic_to_ecf(f);
		var f_gl = ecf_array_to_webgl_pos(f_array);
		
		var g =[];
		g[1] = convert_latitude(position_gd[1]);
		g[0] = convert_longitude(position_gd[0]);
		g[2] = 60; 
		g[1] = parseFloat(g[1]) -( tot * parseFloat(p[0])); 
		g[1] = g[1].toPrecision(4);
		g[0] = parseFloat(g[0]) - (tot * parseFloat(p[1]));
		g[0] = g[0].toPrecision(4);
		g = [g[0] * deg2rad,g[1] * deg2rad,g[2]];
		var g_array = satellite.geodetic_to_ecf(g);
		var g_gl = ecf_array_to_webgl_pos(g_array);
		
		var h =[];
		h[1] = convert_latitude(position_gd[1]);
		h[0] = convert_longitude(position_gd[0]);
		h[2] = 60; 
		h[1] = parseFloat(h[1]) -( tot * parseFloat(p[0])); 
		h[1] = h[1].toPrecision(4);
		h[0] = parseFloat(h[0]) + (tot * parseFloat(p[1]));
		h[0] = h[0].toPrecision(4);
		h = [h[0] * deg2rad,h[1] * deg2rad,h[2]];
		var h_array = satellite.geodetic_to_ecf(h);
		var h_gl = ecf_array_to_webgl_pos(h_array);
		

    spline = new THREE.SplineCurve3([
    new THREE.Vector3(a_gl.x,a_gl.y,a_gl.z),
	new THREE.Vector3(e_gl.x,e_gl.y,e_gl.z),
	new THREE.Vector3(c_gl.x,c_gl.y,c_gl.z),
	new THREE.Vector3(f_gl.x,f_gl.y,f_gl.z),
    new THREE.Vector3(b_gl.x,b_gl.y,b_gl.z),
	new THREE.Vector3(g_gl.x,g_gl.y,g_gl.z),
    new THREE.Vector3(d_gl.x,d_gl.y,d_gl.z),
	new THREE.Vector3(h_gl.x,h_gl.y,h_gl.z),
	new THREE.Vector3(a_gl.x,a_gl.y,a_gl.z)
    ]);
	
	
	

    var material = new THREE.LineBasicMaterial({
        color: 0xff00f0,
    });

    var geometry = new THREE.Geometry();
    var splinePoints = spline.getPoints(numPoints);

    for (var i = 0; i < splinePoints.length; i++) {
        geometry.vertices.push(splinePoints[i]);
    }

    var line = new THREE.Line(geometry, material);
    scene.add(line);
	sat_table[satnum]["line"] = line;
	
	

		
		// ^foot print end ^ 
		//console.log("POSITION IS" + position);
		sprite2.position.set(position.x,position.y,position.z);
	sprite2.scale.set( 1500, 1500, 1.0 ); // imageWidth, imageHeight
	scene.add( sprite2 );
		
		point_light.position = position;
		//marker_ecf.add(point_light);
		//scene.add(marker_ecf);
		objects.push(sprite2);
		sat_table[satnum]["marker_ecf"] = sprite2;
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

	function update_marker(satnum, position_ecf,position_gd) {
		var tot = (Math.sqrt(2)/2);
		var deg2rad = Math.PI / 180;
		var start_position = sat_table[satnum]["marker_ecf"].position;
		var target_position = ecf_array_to_webgl_pos(position_ecf);
		//edited /*
		scene.remove(sat_table[satnum]["line"]);
		var p = get_distance(position_gd[2],position_gd[1]); //returns [lat,long]
		var numPoints = 12;
		var a = [];
       
		
		a[0] = convert_longitude(position_gd[0]);
		a[1] = convert_latitude(position_gd[1]);
		a[2] = 60;
		//console.log("LONG,LAT,HEIGHT");
		//console.log("BEFORE A : " + a[0] + " " + a[1] + " " + a[2]);
		
		a[0] = parseFloat(a[0]) + parseFloat(p[1]);
		a[0] = a[0].toPrecision(4);
		//console.log("AFTER : " + a[0] + " " + a[1] + " " + a[2]);
		a = [a[0] * deg2rad,a[1] * deg2rad,a[2]];
       var a_array = satellite.geodetic_to_ecf(a);
		var a_gl = ecf_array_to_webgl_pos(a_array);
		//console.log(a_gl);
		var test = satellite.geodetic_to_ecf(position_gd);
		test = ecf_array_to_webgl_pos(test);
		//console.log("TEST IS: ");
		//console.log(test);
	   
	   var b = []
	    b[0] = convert_longitude(position_gd[0]);
		b[1] = convert_latitude(position_gd[1]);
		b[2] = 60;
        b[0] = parseFloat(b[0]) - parseFloat(p[1]);
		b[0] = b[0].toPrecision(4);
		//console.log("AFTER B : " + b[0] + " " + b[1] + " " + b[2]);
		b = [b[0] * deg2rad,b[1] * deg2rad,b[2]];
		//console.log(b);
        var b_array = satellite.geodetic_to_ecf(b);
		var b_gl = ecf_array_to_webgl_pos(b_array);
		
		
		var c = [];
		 c[0] = convert_longitude(position_gd[0]);
		 c[1] = convert_latitude(position_gd[1]);
		 c[2] = 60;
		
       	c[1] = parseFloat(c[1]) + parseFloat(p[0]);
		c[1] = c[1].toPrecision(4);
		//console.log(p);
		// console.log(c[1]);
		// console.log("AFTER C : " + c[0] + " " + c[1] + " " + c[2]);
		c = [c[0] * deg2rad,c[1] * deg2rad,c[2]];
        var c_array = satellite.geodetic_to_ecf(c);
		var c_gl = ecf_array_to_webgl_pos(c_array);
		
		
		
		var d = [];
		 d[1] = convert_latitude(position_gd[1]);
		 d[0] = convert_longitude(position_gd[0]);
		 d[2] = 60;
        d[1] = parseFloat(d[1]) - parseFloat(p[0]); 
		d[1] = d[1].toPrecision(4);
		//console.log("AFTER D : " + d[0] + " " + d[1] + " " + d[2]);
		d = [d[0] * deg2rad,d[1] * deg2rad,d[2]];		
		var d_array = satellite.geodetic_to_ecf(d);
		var d_gl = ecf_array_to_webgl_pos(d_array);

   var e =[];
		e[1] = convert_latitude(position_gd[1]);
		e[0] = convert_longitude(position_gd[0]);
		e[2] = 60; 
		e[1] = parseFloat(e[1]) +( tot * parseFloat(p[0])); 
		e[1] = e[1].toPrecision(4);
		e[0] = parseFloat(e[0]) + (tot * parseFloat(p[1]));
		e[0] = e[0].toPrecision(4);
		e = [e[0] * deg2rad,e[1] * deg2rad,e[2]];
		var e_array = satellite.geodetic_to_ecf(e);
		var e_gl = ecf_array_to_webgl_pos(e_array);
		
		var f =[];
		f[1] = convert_latitude(position_gd[1]);
		f[0] = convert_longitude(position_gd[0]);
		f[2] = 60; 
		f[1] = parseFloat(f[1]) +( tot * parseFloat(p[0])); 
		f[1] = f[1].toPrecision(4);
		f[0] = parseFloat(f[0]) - (tot * parseFloat(p[1]));
		f[0] = f[0].toPrecision(4);
		f = [f[0] * deg2rad,f[1] * deg2rad,f[2]];
		var f_array = satellite.geodetic_to_ecf(f);
		var f_gl = ecf_array_to_webgl_pos(f_array);
		
		var g =[];
		g[1] = convert_latitude(position_gd[1]);
		g[0] = convert_longitude(position_gd[0]);
		g[2] = 60; 
		g[1] = parseFloat(g[1]) -( tot * parseFloat(p[0])); 
		g[1] = g[1].toPrecision(4);
		g[0] = parseFloat(g[0]) - (tot * parseFloat(p[1]));
		g[0] = g[0].toPrecision(4);
		g = [g[0] * deg2rad,g[1] * deg2rad,g[2]];
		var g_array = satellite.geodetic_to_ecf(g);
		var g_gl = ecf_array_to_webgl_pos(g_array);
		
		var h =[];
		h[1] = convert_latitude(position_gd[1]);
		h[0] = convert_longitude(position_gd[0]);
		h[2] = 60; 
		h[1] = parseFloat(h[1]) -( tot * parseFloat(p[0])); 
		h[1] = h[1].toPrecision(4);
		h[0] = parseFloat(h[0]) + (tot * parseFloat(p[1]));
		h[0] = h[0].toPrecision(4);
		h = [h[0] * deg2rad,h[1] * deg2rad,h[2]];
		var h_array = satellite.geodetic_to_ecf(h);
		var h_gl = ecf_array_to_webgl_pos(h_array);
		
		

    spline = new THREE.SplineCurve3([
    new THREE.Vector3(a_gl.x,a_gl.y,a_gl.z),
	new THREE.Vector3(e_gl.x,e_gl.y,e_gl.z),
	new THREE.Vector3(c_gl.x,c_gl.y,c_gl.z),
	new THREE.Vector3(f_gl.x,f_gl.y,f_gl.z),
    new THREE.Vector3(b_gl.x,b_gl.y,b_gl.z),
	new THREE.Vector3(g_gl.x,g_gl.y,g_gl.z),
    new THREE.Vector3(d_gl.x,d_gl.y,d_gl.z),
	new THREE.Vector3(h_gl.x,h_gl.y,h_gl.z),
	new THREE.Vector3(a_gl.x,a_gl.y,a_gl.z)
    ]);

	
	 var material = new THREE.LineBasicMaterial({
        color: 0xff00f0,
    });

    var geometry = new THREE.Geometry();
    var splinePoints = spline.getPoints(numPoints);

    for (var i = 0; i < splinePoints.length; i++) {
        geometry.vertices.push(splinePoints[i]);
    }

    var line = new THREE.Line(geometry, material);
    scene.add(line);
	sat_table[satnum]["line"] = line;
		//ended*/
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
		scene.remove(sat_table[satnum]["line"]);
		sat_table[satnum]["line"] = undefined;
		sat_table[satnum]["marker_ecf"] = undefined;
	};

	function remove_path(satnum) {
		scene.remove(sat_table[satnum]["path_ecf"]);
		sat_table[satnum]["path_ecf"] = undefined;
	};

	function get_current_time() {
		return current_time;
	};
	
	//calcuate w from Petersen's formula here. 
	
	function get_distance(height,latitude){
		var v = Math.sqrt((Math.pow((height+EARTH_RADIUS),2)-(Math.pow((EARTH_RADIUS),2))));
		var u = Math.asin(EARTH_RADIUS/(height+EARTH_RADIUS));		// in radians
		var theta = 90 - (u)*(180/3.14);	// in degrees
		//console.log("V IS : " + v + ", u=" + u + ",   Theta IS: " + theta);
		//var distance = EARTH_RADIUS*3.14*(theta/180);
		var distance = v*Math.sin(u);
		//console.log("distance is: " + distance);
		var radius = v*(Math.sin(u));
		//console.log(radius);
		var lat = distance/110.54;
		var lon = distance/(111.320*Math.cos((latitude*(3.14/180))));
		
		//console.log("LAT IS " + lat +" LONG IS  " + lon); //conversion between lat and long should be about the same
		lat = lat.toPrecision(4);
	return [lat,lon]; 
	//We don't need long anymore because if we wish to make 
	//a circle(footprint), then the radius will both be 
	//the same on a cylindrical map. 
	
	};
	
	function convert_latitude(input){

	var degrees = (input/Math.PI*180) % (360);		// 360
	
    degrees = degrees.toPrecision(4);
	//console.log("INPUT IS " + degrees);
	//console.log("Degrees is: " + degrees);
    if (degrees > 90 || degrees < -90){
	console.log("ERROR IN convert latitude");
      return "Error";
    }

    if (degrees > 0){
      degrees = degrees;
    }
    else{
      degrees = degrees;
	}
	return degrees;
	
	};
	
	function convert_longitude(input) {
    if (typeof input !== 'number') { return input; }
    var degrees = (input/Math.PI*180) % (360);
	//console.log("LONG IS : " + degrees);
    if (degrees > 180){
      degrees = 360 - degrees;
    }
    else if (degrees < -180){
      degrees = 360 + degrees;
    }
    degrees = degrees.toPrecision(4);
	//console.log("Degrees is " + degrees);
    if (degrees > 0) {
      degrees;
    }
    else if (degrees <= 0){
      degrees;
    }
    return degrees;

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
 

  function set_observer_location (observer_longitude, observer_latitude, observer_altitude) {
    var deg2rad = Math.PI / 180;
    var observer_coords_gd = [observer_longitude*deg2rad,
                              observer_latitude*deg2rad,
                              observer_altitude];
    var observer_coords_ecf = satellite.geodetic_to_ecf (observer_coords_gd);
    var observer_coords_webgl = ecf_array_to_webgl_pos (observer_coords_ecf);
    //ground_camera.position = new THREE.Vector3( 0, 0, 0 );
    //ground_camera.lookAt(observer_coords_webgl);
    //ground_camera .translateZ(EARTH_RADIUS);
  };



	//interaction ended

	function add_observer(position_ecf) {
		var marker_radius = 100,
			marker_segments = 1000,
			marker_rings = 100;
		var marker_sphere = new THREE.SphereGeometry(marker_radius, marker_segments, marker_rings);
		var marker_material = new THREE.MeshPhongMaterial({
			color: 0xff0000,
			emissive: 0xffffff,
			wireframe: false
		});
		
		//Load satellite images
		var boxText = THREE.ImageUtils.loadTexture( "../img/chicken.gif" );
		// Create marker 3D object
        //Custom satellite image
		var cMaterial = new THREE.SpriteMaterial( { map: boxText, useScreenCoordinates: false, color: 0xFFFFFF } );
	    var sprite2 = new THREE.Sprite( cMaterial );
		
		// Create marker 3D object

		var marker_ecf = new THREE.Mesh(marker_sphere, marker_material);
		//marker_ecf.name = satnum;

		var position = ecf_array_to_webgl_pos(position_ecf);
		marker_ecf.position = position;
		sprite2.position= position;
	    sprite2.scale.set( 100, 100, 1.0 ); // imageWidth, imageHeight
	    //scene.add( sprite2 );

		var point_light = new THREE.PointLight(0xffffff, 2, 0);
		point_light.position = position;
		//marker_ecf.add(point_light);

		scene.add(marker_ecf);
		//objects.push(marker_ecf);
		//sat_table[satnum]["marker_ecf"] = marker_ecf;
		earth.material.needsUpdate = true;
	};

	function set_observer_location(observer_longitude, observer_latitude, observer_altitude) {
		var deg2rad = Math.PI / 180;
		var observer_coords_gd = [observer_longitude * deg2rad,
							  observer_latitude * deg2rad,
							  observer_altitude];
		var observer_coords_ecf = satellite.geodetic_to_ecf(observer_coords_gd);
		var observer_coords_webgl = ecf_array_to_webgl_pos(observer_coords_ecf);
		add_observer(observer_coords_ecf);
		ground_camera.position = new THREE.Vector3(0, 0, 0);
		ground_camera.lookAt(observer_coords_webgl);
		ground_camera.translateZ(EARTH_RADIUS);

	};
	
	//80
	//-36
	function center_america(observer_longitude, observer_latitude) {
		var deg2rad = Math.PI / 180;
		
		// observer coordinates at ground
		var observer_coords_gd = [observer_longitude * deg2rad,
							  observer_latitude * deg2rad,
							  0];
		// geodetic_to_ecf ????
		var observer_coords_ecf = satellite.geodetic_to_ecf(observer_coords_gd);
		console.log(observer_coords_ecf);
		var observer_coords_webgl = ecf_array_to_webgl_pos(observer_coords_ecf);
		//ground_camera.position = new THREE.Vector3(0, 0, 0);
		//ground_camera.lookAt(observer_coords_webgl);
		//ground_camera.translateZ(EARTH_RADIUS);
		space_camera.position = new THREE.Vector3(0, 0, 0);
		console.log(observer_coords_webgl.y);
		space_camera.lookAt( new THREE.Vector3(
			-observer_coords_webgl.x,
			-observer_coords_webgl.y,
			-observer_coords_webgl.z) );
		space_camera.translateZ(EARTH_RADIUS+15000);
        console.log("'Murica");
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
    onDocumentMouseDown           : onDocumentMouseDown,
    add_to_time_offset            : add_to_time_offset,
    reset_time_offset             : reset_time_offset,
    get_current_time              : get_current_time,
    switch_to_ground_camera       : switch_to_ground_camera,
    switch_to_space_camera        : switch_to_space_camera,
	hide_earth                    : hide_earth,
    set_observer_location         : set_observer_location,
	center_america                : center_america
  };
  };

	