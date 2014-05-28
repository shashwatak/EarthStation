/*
 * EarthStation v0.3
 * pixijs.js
 * PLANETARIUM VIEW
 */

function PixiJS(WorkerManager) {

	// -- GLOBAL VARS ------------------------------------------------------------
	// Global satellite info
	var sat_table 	= {};	// uses "satnum", holds info for satellites
	var sat_marker = {};	// uses satnum also, container for satellite graphics
	var sat_text	= {};	// goes with sat_marker and has text
	var sat_path	= {};	// yup hi
	
	var observer_coords_gd;
	var observer_coords_ecf;
	
	var num_active_satellites = 0;
	var request_id;
	//var objects = []; 	// object list to store all objects ?

	// Display data
	var $container =  $('#two_d_display'); // $('#two_d_display');	// TEMP
	var mouse = { x: 0, y: 0 };
	var c_width 	= $container.width();
	var c_height	= $container.height();
	var two_d_running = false;
	var horizon_radius = 0;	// distance from center to "0 degrees" (horizon)
	var planetarium_center 	= { x:0, y:0 };	// reference point for planetarium view
	var azimuth_center 		= { x:0, y:0 };	// ref point for azimuth marker
	var elevation_center 	= { x:0, y:0 };	// ref point for elevation angle marker
	
	// Time variables
	var start_time = get_time();
	var current_time = start_time;
	var update_wait_time = 0;
	var time_offset = 0;
	
	// Stage/graphics
	var stage;
	var renderer;
	var bunny;
	
	// --- DISPLAY FUNCTIONS -----------------------------------------------------
	
	/* init()
	   Initializes pixi.js scene with guides
	 */
	function init() {
		console.log("PixiJS.init()");
		
		// Setup
		stage = new PIXI.Stage(0x033E6B); // leaving this obnoxious color here for easy debugging
		renderer = new PIXI.autoDetectRenderer(c_width, c_height, null, false, true);
		$container.append(renderer.view);
		requestAnimFrame( animate );
		
		// initialize variables used to scale images to the planetarium view
		horizon_radius = ( (c_height<c_width)? c_height:c_width ) / 3;
		planetarium_center.x = c_width/2;
		planetarium_center.y = c_height/2;

		// Creating a test sprite
		var texture = PIXI.Texture.fromImage("../img/bunny.png");
		bunny = new PIXI.Sprite(texture);
		bunny.anchor.x = 0.5;		// Set anchor in the middle of the bunny
		bunny.anchor.y = 0.5;

		var testpos = azel2pixi(0,90);		// 45, 135, 225, 305
		//console.log("x="+test);
		bunny.position.x = testpos.x; //testpos[0]; //c_width/2;
		bunny.position.y = testpos.y; //c_height/2;
		
		// Add in azimuth/elevation guides
		var guides = new PIXI.Graphics();
		guides.position.x = planetarium_center.x;
		guides.position.y = planetarium_center.y;
		guides.beginFill(0xFFFFFF, 0.2);		// elevation circles
		guides.lineStyle(1, 0xFFFFFF, 1);
		guides.drawCircle(0, 0, horizon_radius);
		guides.drawCircle(0, 0, 2*horizon_radius/3);
		guides.drawCircle(0, 0, horizon_radius/3);
		guides.endFill()
		guides.lineStyle(1, 0xFFFFFF);		// azimuth lines
		guides.moveTo(0, -horizon_radius);
		guides.lineTo(0,  horizon_radius);
		guides.moveTo(-horizon_radius, 0);
		guides.lineTo( horizon_radius, 0);
		
		// Add text
		var guidetext_n = new PIXI.Text("North", {font:"14px Arial", fill:"white"});
		guidetext_n.anchor.x = guidetext_n.anchor.y = 0.5;
		guidetext_n.position.x = (azel2pixi(0,10)).x;
		guidetext_n.position.y = (azel2pixi(0,10)).y;
		
		var guidetext_e = new PIXI.Text("East", {font:"14px Arial", fill:"white"});
		guidetext_e.anchor.x = guidetext_e.anchor.y = 0.5;
		guidetext_e.position.x = (azel2pixi(90,10)).x;
		guidetext_e.position.y = (azel2pixi(90,10)).y;
		
		var guidetext_s = new PIXI.Text("South", {font:"14px Arial", fill:"white"});
		guidetext_s.anchor.x = guidetext_s.anchor.y = 0.5;
		guidetext_s.position.x = (azel2pixi(180,10)).x;
		guidetext_s.position.y = (azel2pixi(180,10)).y;
		
		var guidetext_w = new PIXI.Text("West", {font:"14px Arial", fill:"white"});
		guidetext_w.anchor.x = guidetext_w.anchor.y = 0.5;
		guidetext_w.position.x = (azel2pixi(270,10)).x;
		guidetext_w.position.y = (azel2pixi(270,10)).y;
		
		var guidetext_w = new PIXI.Text("West", {font:"14px Arial", fill:"white"});
		guidetext_w.anchor.x = guidetext_w.anchor.y = 0.5;
		guidetext_w.position.x = (azel2pixi(270,10)).x;
		guidetext_w.position.y = (azel2pixi(270,10)).y;
		
		var guidetext_0 = new PIXI.Text("0 deg", {font:"14px Arial", fill:"white"});
		guidetext_0.anchor.x = guidetext_0.anchor.y = 0.5;
		guidetext_0.position.x = (azel2pixi(305,0)).x;
		guidetext_0.position.y = (azel2pixi(305,0)).y;
		
		var guidetext_30 = new PIXI.Text("30 deg", {font:"14px Arial", fill:"white"});
		guidetext_30.anchor.x = guidetext_30.anchor.y = 0.5;
		guidetext_30.position.x = (azel2pixi(305,30)).x;
		guidetext_30.position.y = (azel2pixi(305,30)).y;
		
		var guidetext_60 = new PIXI.Text("60 deg", {font:"14px Arial", fill:"white"});
		guidetext_60.anchor.x = guidetext_60.anchor.y = 0.5;
		guidetext_60.position.x = (azel2pixi(305,60)).x;
		guidetext_60.position.y = (azel2pixi(305,60)).y;
		
		// Add everything to the stage
		stage.addChild(guides);
		stage.addChild(bunny);
		
		stage.addChild(guidetext_n);
		stage.addChild(guidetext_e);
		stage.addChild(guidetext_s);
		stage.addChild(guidetext_w);
		stage.addChild(guidetext_0);
		stage.addChild(guidetext_30);
		stage.addChild(guidetext_60);
		
	}; // end init()
	
	/* start_animation()
	 */
	function start_animation() {
		console.log("start pixi animation");
		if(!two_d_running) {
			two_d_running = true;
			animate();
		};
	};
	
	/* stop_animation()
	 */
	function stop_animation() {
		if(two_d_running) {
			two_d_running = false;
		}
	}
	
	/* animate()
		Updates renderer continuously. Called animate_for_time() which actually
		updates the positions of the markers
	 */
	function animate(anim_time) {
		if(two_d_running) {
			requestAnimFrame( animate );
			// just for fun, lets rotate mr rabbit a little
			//bunny.rotation += 0.1;
			// render the stage   
			renderer.render(stage);
			animate_for_time(anim_time);
		};
	};
	
	/* animate_for_time()
		Called every 0.2 secconds to update positions of all the objects.
	 */
	function animate_for_time(anim_time) {
		if((anim_time - update_wait_time) > 200) { // update every .2s, 5 Hz
			current_time = increment_time.by_milliseconds(start_time, anim_time + time_offset);
			WorkerManager.update_sats(current_time);
			update_wait_time = anim_time;
		};
	};
	
	/* get_time()
	 */
	function get_time() {
		var d_now = new Date();
		console.log("d_now="+d_now);
		var time = {
			year: 			d_now.getUTCFullYear(),
			month: 			d_now.getUTCMonth() + 1,
			date_of_month: d_now.getUTCDate(),
			hour: 			d_now.getUTCHours(),
			minute: 			d_now.getUTCMinutes(),
			second: 			d_now.getUTCSeconds()
		};
		var p_now = performance.now();
		var start_time = increment_time.by_milliseconds(time, -p_now);
		return start_time;
	};
	
	/* add_to_time_offset()
	 */
	function add_to_time_offset(time_delta) {
		time_offset += time_delta * 1000;
	};
	
	/* reset_time_offset()
	 */
	function reset_time_offset() {
		time_offset = 0;
	};
	
	/* onDocumentMouseDown()
		Allows the UI to register a mouse click
	 */
	function onDocumentMouseDown(event) {
		event.preventDefault();
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
	}
	
	/*	set_observer_location()
		Translates longitude, latitude, and altitude to ecf coordinates
	 */
	function set_observer_location(observer_longitude, observer_latitude, observer_altitude) {
		// Get all coordinates information
		observer_coords_gd =  [deg2rad(observer_longitude),
                              	deg2rad(observer_latitude),
                              	observer_altitude];
		observer_coords_ecf = satellite.geodetic_to_ecf(observer_coords_gd);
		console.log("observer coordinates ecf="+observer_coords_ecf);
	};
	
	// --- WORKER MANAGER & CALLBACKS --------------------------------------------
	
	WorkerManager.register_command_callback("live_update", live_update_callback);

	/* live_update_callback()
		WorkerManager service that updates the satellite data.
	 */
	function live_update_callback(data) {
		var sat_item = data.sat_item;					// data!!!
		var satnum = sat_item.satnum;
		
		// use sat_item.look_angles.x or .look_angles[0]?
		var az = rad2deg(sat_item.look_angles[0]);
		var el = rad2deg(sat_item.look_angles[1]);
		//console.log("new az="+az+", el="+el);
		
		//console.log("sat_item.satnum="+sat_item.satnum);
		// *~*~*~*~ what was i trying to do? ~*~*~*~*
		// sat_item.____ definitions are in track_sat.js
		// doesn't look like there's one for a name?
		
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
		}
		if(sat_table[satnum]["is_tracking"]) {
			update_satellite_marker(satnum, az, el);
		};
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
	
	function hide_pixijs() {
		console.log("hiding pixijs");
		stop_animation();
		for (var i = stage.children.length - 1; i >= 0; i--) {
			stage.removeChild(stage.children[i]);
		};
	};
	
	// --- SATELLITE FUNCTIONS ---------------------------------------------------
	
	/* add_satellite()
		Called by the UI and adds the satellite info into Pixi
	 */
	function add_satellite(satnum, satrec) {
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
			sat_table[satnum]["is_tracking"] = true;

			console.log("hi friend, satnum="+satnum+", satrec="+satrec);
			add_satellite_marker(satnum);
			
			num_active_satellites++;
		};
		WorkerManager.add_satellite(satrec);
		WorkerManager.propagate_orbit(satrec, current_time, 1);
	};
	
	/* add_satellite_marker()
		inputs: satnum/name?, satrec?
		Adds a graphical marker for the satellite
	 */
	function add_satellite_marker(satnum) {
		sat_marker[satnum] = new PIXI.Graphics();
		sat_marker[satnum].lineStyle(1, 0xFFFFFF, 1);
		sat_marker[satnum].drawCircle(0, 0, horizon_radius/30);
		sat_marker[satnum].endFill()
		sat_marker[satnum].lineStyle(1, 0xFFFFFF);		// azimuth lines
		sat_marker[satnum].moveTo(0, -horizon_radius/20);
		sat_marker[satnum].lineTo(0,  horizon_radius/20);
		sat_marker[satnum].moveTo(-horizon_radius/20, 0);
		sat_marker[satnum].lineTo( horizon_radius/20, 0);
		
		sat_text[satnum] = new PIXI.Text(
			"SAT",													// change this later
			{font:"12px Arial", fill:"white"}
		);
		//sat_text[satnum].anchor.x = sat_text[satnum].y = 0;
		sat_text[satnum].x = sat_text[satnum].y = horizon_radius/30;	// offset
		
		stage.addChild(sat_marker[satnum]);
		stage.addChild(sat_text[satnum]);
	};
	
	/* remove_satellite()
		bye friend
	 */
	function remove_satellite(satnum) {
		if(sat_table[satnum]) {
			WorkerManager.remove_satellite(satnum);
			num_active_satellites--;
			console.log("bye friend");
			remove_satellite_marker(satnum);
			sat_table[satnum] = undefined;
		};
	};
	
	/* remove_satellite_marker()
	 */
	function remove_satellite_marker(satnum) {
		stage.removeChild(sat_marker[satnum]);		// this should work
		stage.removeChild(sat_text[satnum]);
	};
	
	/* update_satellite_marker()
		Called by Worker Manager to update satellite position
	 */
	function update_satellite_marker(satnum, az, el) {
		//console.log("update_satellite_marker()");
		if(el>=0) {
			sat_marker[satnum].visible = true;
			sat_text[satnum].visible = true;
			sat_marker[satnum].position.x = azel2pixi(az,el).x;
			sat_marker[satnum].position.y = azel2pixi(az,el).y;
			sat_text[satnum].position.x = azel2pixi(az,el).x;
			sat_text[satnum].position.y = azel2pixi(az,el).y;
			//console.log("satellite visible, coords.x="+azel2pixi(az,el).x);
		} else {
			console.log("satellite invisible");
			sat_marker[satnum].visible = false;
			sat_text[satnum].visible = false;
		}
	};
	
	// --- PATH FUNCTIONS --------------------------------------------------------
	
	function add_path(satnum, ecf_coords_list) {
		// there is no convenient way ot drawing lines :(
		// so we'll basically need to make a for loop that connects a bunch of points
		// this might be beneficial for us in the end
		//
		sat_path[satnum] = new PIXI.Graphics();
		sat_path[satnum].lineStyle(1, 0xFFFFFF, 1);
		sat_path[satnum].position.x = planetarium_center.x;
		sat_path[satnum].position.y = planetarium_center.y;
		
		//console.log("ecf_coords_list.length="+ecf_coords_list.length);
		//console.log("ecf_coords_list[10]="+ecf_coords_list[17]);
		
		for(var i=0; i<ecf_coords_list.length; i++) {
			var pos = satellite.ecf_to_look_angles(observer_coords_gd,ecf_coords_list[i]);
			pos[0] = rad2deg(pos[0]);
			pos[1] = rad2deg(pos[1]);
			console.log("pos="+pos);
			console.log("pos.x="+pos[0]+", pos.y="+pos[1]);
			sat_path[satnum].lineTo(azel2pixi(pos.x,pos.y));
		}
		
		stage.addChild(sat_path[satnum]);
	}
	
	function remove_path(satnum) {
		stage.removeChild(sat_path[satnum]);
	}
	
	function update_path(satnum, ecf_coords_list) {
		remove_path(satnum);
		add_path(satnum, ecf_coords_list);
	}
	
	/* --- HELPER FUNCTIONS --------------------------------------------------- */
	
	// Notes on the different coordinate systems:
	// Pixi stage:
	//		- All coordinates will be with respect to the center of the stage, (0,0)
	// ECF/ECEF: Earth-centered Fixed
	//		- Stays stationary with respect to the earth.
	// ECI: Earth-centered Inertial
	// 	- Does NOT stay stationary w/ respect to the earth.
	// Geodetic (Latitude/Longitude/Height)
	// 	- Time-dependant
	// Topcentric (v - North, w - Up, u - East)
	//		- Uses the observer's location as the reference point for bearings in
	//		  altitude and azimuth.
	// "Look Angles"
	// 	- Uses topocentric and gives azimuth and elevation angles and distance
	
	/* azel2pixi()
		Maps azimuth and elevation angles (rads) to coordinates on stage.
		Both the az and el angles must be given (VECTOR CALC NOOOO)
		Use this for both the motors and the satellites.
	 */
	function azel2pixi(az, el) {
		var pixi = { x:0, y:0 };	
		// calculate unscaled x, y coordinates
		if (el>=0) {
			pixi.x = Math.abs((90-el)) * Math.sin(az * (3.14159/180));
			pixi.y = -(Math.abs((90-el)) * Math.cos(az * (3.14159/180)));
			if (az>360) az = az - 360;
		}
		// scale to stage
		pixi.x = pixi.x * (horizon_radius / 90)
		pixi.y = pixi.y * (horizon_radius / 90)
		// add offset
		pixi.x = pixi.x + planetarium_center.x;
		pixi.y = pixi.y + planetarium_center.y;
		//console.log(pixi.x);
		return pixi;
	};	// end azel2pixi()

	/* rad2deg()
	 */
	function rad2deg(rad) {
		return rad*180/Math.PI;
	};
	
	/* deg2rad()
	 */
	function deg2rad(deg) {
		return deg*Math.PI/180;
	};

	// --- RETURN FUNCTIONS ------------------------------------------------------
	return {
		// All the exposed functions of the PixiJS Service.
		// Allow external initialization of scene, adding satellites, etc?
		// Reference threejs service for examples of other funcitonality
		init: 						init,
		onDocumentMouseDown:		onDocumentMouseDown,
		start_animation:			start_animation,
		stop_animation: 			stop_animation,
		add_satellite: 			add_satellite,
		remove_satellite: 		remove_satellite,
		add_to_time_offset:		add_to_time_offset,
		reset_time_offset:		reset_time_offset,
		get_time:					get_time,
		set_observer_location:	set_observer_location,
		hide_pixijs: 				hide_pixijs		// hide errythang
	};
};