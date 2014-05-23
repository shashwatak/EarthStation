/*
 * EarthStation v0.3
 * pixijs.js
 */

function PixiJS(WorkerManager) {

	// -- global vars ------------------------------------------------------------
	// Global satellite info
	var sat_table = {};		// uses "satnum", holds info for satellites
	var sat_markers = {};	// uses satnum also, container for satellite graphics
	var num_active_satellites = 0;
	var time_offset = 0;
	var request_id;
	//var objects = []; 	// object list to store all objects ?

	// Display data
	var $container =  $('#three_d_display'); // $('#two_d_display');	// TEMP
	var c_width = $container.width();
	var c_height = $container.height();
	var mouse = { x: 0, y: 0 };
	var two_d_running = false;
	
	var el_0deg;	// distance from center to "0 degrees" (horizon)
	var el_30deg;	// used for the radius of the marker circles
	var el_60deg;
	
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
		stage = new PIXI.Stage(0x006699); // leaving this obnoxious color here for easy debugging
		renderer = new PIXI.autoDetectRenderer(c_width, c_height, null, false, true);
		$container.append(renderer.view);
		requestAnimFrame( animate );
		
		// init variables for radius of circle
		// these will be used to scale distances
		el_0deg = ( (c_height<c_width)? c_height:c_width ) / 2;
		el_30deg = el_0deg/3;
		el_60deg = 2*el_0deg/3


		// Creating a test sprite
		var texture = PIXI.Texture.fromImage("../img/bunny.png");
		bunny = new PIXI.Sprite(texture);
		bunny.anchor.x = 0.5;		// Set anchor in the middle of the bunny
		bunny.anchor.y = 0.5;

		var testpos = azel2pixi(350,60);		// 45, 135, 225, 305
		bunny.position.x = (azel2pixi(350,60))[0]; //testpos[0]; //c_width/2;
		bunny.position.y = testpos[1]; //c_height/2;
		
		// Add in azimuth/elevation guides
		var guides = new PIXI.Graphics();
		guides.position.x = c_width/2;
		guides.position.y = c_height/2;
		guides.beginFill(0xCCCCCC, 0.2);		// elevation circles
		guides.lineStyle(1, 0xFFFFFF, 1);
		guides.drawCircle(0, 0, el_0deg);
		guides.drawCircle(0, 0, el_30deg);
		guides.drawCircle(0, 0, el_60deg);
		guides.endFill()
		guides.lineStyle(1, 0xFFFFFF);		// azimuth lines
		guides.moveTo(0, -el_0deg);
		guides.lineTo(0,  el_0deg);
		guides.moveTo(-el_0deg, 0);
		guides.lineTo( el_0deg, 0);
		
		// Add text
		var guidetext_n = new PIXI.Text("North)", {font:"12px Arial", fill:"white"});
		guidetext_n.anchor.x = guidetext_n.anchor.y = 0.5;
		guidetext_n.position.x = (azel2pixi(0,10))[0];
		guidetext_n.position.y = (azel2pixi(0,10))[1];
		
		var guidetext_e = new PIXI.Text("East", {font:"12px Arial", fill:"white"});
		guidetext_e.anchor.x = guidetext_e.anchor.y = 0.5;
		guidetext_e.position.x = (azel2pixi(90,10))[0];
		guidetext_e.position.y = (azel2pixi(90,10))[1];
		
		var guidetext_s = new PIXI.Text("South", {font:"12px Arial", fill:"white"});
		guidetext_s.anchor.x = guidetext_s.anchor.y = 0.5;
		guidetext_s.position.x = (azel2pixi(180,10))[0];
		guidetext_s.position.y = (azel2pixi(180,10))[1];
		
		var guidetext_w = new PIXI.Text("West", {font:"12px Arial", fill:"white"});
		guidetext_w.anchor.x = guidetext_w.anchor.y = 0.5;
		guidetext_w.position.x = (azel2pixi(270,10))[0];
		guidetext_w.position.y = (azel2pixi(270,10))[1];
		
		var guidetext_w = new PIXI.Text("West", {font:"12px Arial", fill:"white"});
		guidetext_w.anchor.x = guidetext_w.anchor.y = 0.5;
		guidetext_w.position.x = (azel2pixi(270,10))[0];
		guidetext_w.position.y = (azel2pixi(270,10))[1];
		
		var guidetext_0 = new PIXI.Text("0 deg", {font:"12px Arial", fill:"white"});
		guidetext_0.anchor.x = guidetext_0.anchor.y = 0.5;
		guidetext_0.position.x = (azel2pixi(305,0))[0];
		guidetext_0.position.y = (azel2pixi(305,0))[1];
		
		var guidetext_30 = new PIXI.Text("30 deg", {font:"12px Arial", fill:"white"});
		guidetext_30.anchor.x = guidetext_30.anchor.y = 0.5;
		guidetext_30.position.x = (azel2pixi(305,30))[0];
		guidetext_30.position.y = (azel2pixi(305,30))[1];
		
		var guidetext_60 = new PIXI.Text("60 deg", {font:"12px Arial", fill:"white"});
		guidetext_60.anchor.x = guidetext_60.anchor.y = 0.5;
		guidetext_60.position.x = (azel2pixi(305,60))[0];
		guidetext_60.position.y = (azel2pixi(305,60))[1];
		
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
	
	var start_time = get_time();
	
	/* animate()
		Hi. All animations will go in here.
	 */
	function animate(anim_time) {
		if(two_d_running) {
			console.log("animate()");
			requestAnimFrame( animate );
	
			// just for fun, lets rotate mr rabbit a little
			bunny.rotation += 0.1;
		
			// render the stage   
			renderer.render(stage);
			//controls.update();
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
	
	
	function get_time() {
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

	
	// --- MOTORS/SATELLITES/STUFF -----------------------------------------------
	
	// I believe
	WorkerManager.register_command_callback("live_update", live_update_callback);

	/* live_update_callback()
		WorkerManager service that updates the satellite data.
	 */
	function live_update_callback(data) {					// exactly the same as threejs
		console.log("pixijs live_update_callback ????");
		var sat_item = data.sat_item;
		var satnum = sat_item.satnum;
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
		}
		if(sat_table[satnum]["is_tracking"]) {
			if(sat_table[satnum]["marker_ecf"]) {
				update_satellite_marker(satnum, sat_item.position_ecf);
			} else {
				add_satellite_marker(satnum, sat_item.position_ecf);
			};
		};
	};
	
	// ≈≈≈ bacon
	
	WorkerManager.register_command_callback("path_update", path_update_callback);

	// updates path?
	function path_update_callback(data) {
		console.log("pixijs path_update_callback");		// this is called
		var sat_item = data.sat_item;
		var satnum = sat_item.satnum;
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
		};
		if(sat_table[satnum]["is_tracking"]) {
			if(sat_table[satnum]["path_ecf"]) {
				//update_path(satnum, sat_item["ecf_coords_list"]);
			} else {
				//add_path(satnum, sat_item["ecf_coords_list"]);
			};
		};
	};
	
	/* add_satellite()
		Called by the UI and adds the satellite info into Pixi
	 */
	function add_satellite(satnum, satrec) {
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
			sat_table[satnum]["is_tracking"] = true;

			console.log("hi friend, satnum="+satnum+", satrec="+satrec);

			// not sure what this check does?
			//if(num_active_satellites <= 0) {
				//num_active_satellites = 0;
				// Called when you click on a satellite
				//console.log("hi friend");
				//};

			num_active_satellites++;
		};
		WorkerManager.add_satellite(satrec);
		WorkerManager.propagate_orbit(satrec, current_time, 1);
	};			// this seems to be initialized properly
	
	/* add_satellite_marker()
		inputs: satnum/name?, satrec?
		Adds a grpahical marker for the satellite, uses satnum table?
	 */
	function add_satellite_marker(satnum) {
		
	}
	
	/* remove_satellite()
		bye friend
	 */
	function remove_satellite() {
		if(sat_table[satnum]) {
			WorkerManager.remove_satellite(satnum);
			num_active_satellites--;
			
			console.log("bye friend");

			// not sure what this check does?
			if(num_active_satellites <= 0) {
				num_active_satellites = 0;
				// Called when a satellite is deselected (closed)
				//console.log("bye friend");
			};

			remove_path(satnum);
			remove_marker(satnum);

			sat_table[satnum] = undefined;
		};
	};
	
	/* remove_satellite_marker()
	 */
	function remove_satellite_marker() {
		// whee
	}
	
	/* update_satellite()
		Includes updating marker?
	 */
	function update_satellite_marker() {
		// called by worker manager to update satellite position
	}
	
	
	function onDocumentMouseDown(event) {
		event.preventDefault();
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
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
		var x = -1;
		var y = -1;
		
		//console.log("az="+az+", el="+el);
		
		// calculate raw x,y
		if (el>=0) {
			x = Math.abs((90-el)) * Math.sin(az * (3.14159/180));
			y = -(Math.abs((90-el)) * Math.cos(az * (3.14159/180)));
			
			//console.log("x="+x+", y="+y+", [x,y]="+[x,y]);
			
			if (az>360) az = az - 360;
			
		}
		
		// scale to stage
		// think of a better variable name -.-
		x = x * (el_0deg / 90)
		y = y * (el_0deg / 90)
		
		// add offset
		x = x + c_width/2;
		y = y + c_height/2;
		
		
		return [x,y];
	}
	
	/* ll2stage()
		Maps latitude and longitude to coordinates on stage
	 */
	//function ll2pixi(lat, long) {
	//	x = -1;
	//	y = -1;
	//	stage_coord = [x,y];
	//}
	
	return {
		// All the exposed functions of the PixiJS Service.
		// Allow external initialization of scene, adding satellites, etc?
		// Reference threejs service for examples of other funcitonality
		init: 						init,
		onDocumentMouseDown:		onDocumentMouseDown,
		start_animation:			start_animation,
		stop_animation: 			stop_animation,
		add_satellite: 				add_satellite,
		remove_satellite: 			remove_satellite
		//add_to_time_offset:			add_to_time_offset,
		//reset_time_offset:			reset_time_offset,
		//get_current_time:				get_current_time,
	};
	
};