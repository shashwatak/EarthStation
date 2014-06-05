/*
 * EarthStation v0.3
 * pixijs.js
 * PLANETARIUM VIEW:
 *		- Basic planetarium view with azimuth/elevation guides showing the
 *		  positions of the satellites and motors
 *		- Side bar with more specific information about the satellite angles
 * TO-DO:
 * 	- Show motor marker
 *  - Path: still glitches for multiple passes
 * 	- Display AOS/LOS: need to convert gmst to utc
 */

function PixiJS(WorkerManager) {

	// -- GLOBAL VARS ------------------------------------------------------------
	// Global satellite info
	var sat_table 	= {};	// uses "satnum", holds info for satellites
	
	var sat_marker 	= {};	// uses satnum also, container for satellite graphics
	var sat_text	= {};	// goes with sat_marker and has text
	var sat_path	= {};	// yup hi
	var sat_aos		= {};
	var sat_los		= {};
	
	var motor_marker;
	
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
	var compass_radius = 0;
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
		stage = new PIXI.Stage(0x000000);
		renderer = new PIXI.autoDetectRenderer(c_width, c_height, null, false, true);
		$container.append(renderer.view);
		requestAnimFrame( animate );
		
		// Variables for planetarium view
		horizon_radius = 2*( (c_height<c_width)? c_height:c_width ) / 5;
		compass_radius = horizon_radius/3;
		planetarium_center.x = c_width/2;
		planetarium_center.y = c_height/2;
		
		// Variables for compass views
		azimuth_center.x = 4*c_width/5;
		azimuth_center.y = 1*c_height/3;
		elevation_center.x = 4*c_width/5;
		elevation_center.y = 2*c_height/3;
		

		// Creating a test sprite
		//var texture = PIXI.Texture.fromImage("../img/bunny.png");
		//bunny = new PIXI.Sprite(texture);
		//bunny.anchor.x = 0.5;		// Set anchor in the middle of the bunny
		//bunny.anchor.y = 0.5;
		//console.log("x="+test);
		//bunny.position = azel2pixi(0,90);
		
		
		// Add in planetarium view
		var planetarium_guides = new PIXI.Graphics();
		planetarium_guides.position = planetarium_center;
		planetarium_guides.beginFill(0xFFFFFF, 0);		// elevation circles
		planetarium_guides.lineStyle(3, 0x226F95);
		planetarium_guides.drawCircle(0, 0, horizon_radius);
		planetarium_guides.lineStyle(1, 0xCCCCCC);
		planetarium_guides.drawCircle(0, 0, 2*horizon_radius/3);
		planetarium_guides.drawCircle(0, 0, horizon_radius/3);
		planetarium_guides.endFill()
		planetarium_guides.lineStyle(1, 0x226F95);		// azimuth lines
		planetarium_guides.moveTo(0, -horizon_radius);
		planetarium_guides.lineTo(0,  horizon_radius);
		planetarium_guides.moveTo(-horizon_radius, 0);
		planetarium_guides.lineTo( horizon_radius, 0);
		
		// Add in azimuth compass
		var azimuth_guides = new PIXI.Graphics();
		azimuth_guides.position = azimuth_center;
		azimuth_guides.beginFill(0xFFFFFF, 0);
		azimuth_guides.lineStyle(3, 0x226F95);
		azimuth_guides.drawCircle(0, 0, compass_radius);
		
		// Add in elevation compass
		var elevation_guides = new PIXI.Graphics();
		elevation_guides.position = elevation_center;
		elevation_guides.beginFill(0xFFFFFF, 0);
		elevation_guides.lineStyle(3, 0x226F95);
		elevation_guides.drawCircle(0, 0, compass_radius);
		
		//var test = new PIXI.Graphics();
		//test.position = planetarium_center;
		//test.beginFill(0xFFFFFF, 0);
		//test.lineStyle(3, 0x00FF00);
		//test.moveTo( 0, -horizon_radius );
		//test.lineTo( horizon_radius, 0 );
		//test.moveTo( 0, horizon_radius );
		//test.lineTo( -horizon_radius, 0 );
		//stage.addChild(test);
		
		// Add text
		var guidetext_n 		= new PIXI.Text("N", {font:"20px Arial", fill:"white"});
		guidetext_n.anchor.x = guidetext_n.anchor.y = 0.5;
		guidetext_n.position = (azel2pixi(0,0));
		
		var guidetext_e 		= new PIXI.Text("E", {font:"20px Arial", fill:"white"});
		guidetext_e.anchor.x = guidetext_e.anchor.y = 0.5;
		guidetext_e.position = (azel2pixi(90,0));
		
		var guidetext_s 		= new PIXI.Text("S", {font:"20px Arial", fill:"white"});
		guidetext_s.anchor.x = guidetext_s.anchor.y = 0.5;
		guidetext_s.position	= (azel2pixi(180,0));
		
		var guidetext_w 		= new PIXI.Text("W", {font:"20px Arial", fill:"white"});
		guidetext_w.anchor.x = guidetext_w.anchor.y = 0.5;
		guidetext_w.position = (azel2pixi(270,0));
		
		var guidetext_0 		= new PIXI.Text("0", {font:"14px Arial", fill:"white"});
		guidetext_0.anchor.x = guidetext_0.anchor.y = 0.5;
		guidetext_0.position = (azel2pixi(270,5));
		
		var guidetext_30 		 = new PIXI.Text("30", {font:"14px Arial", fill:"white"});
		guidetext_30.anchor.x = guidetext_30.anchor.y = 0.5;
		guidetext_30.position = (azel2pixi(270,35));
		
		var guidetext_60 		 = new PIXI.Text("60", {font:"14px Arial", fill:"white"});
		guidetext_60.anchor.x = guidetext_60.anchor.y = 0.5;
		guidetext_60.position = (azel2pixi(270,65));
		
		// Add everything to the stage
		stage.addChild(planetarium_guides);
		//stage.addChild(bunny);
		
		stage.addChild(guidetext_n);
		stage.addChild(guidetext_e);
		stage.addChild(guidetext_s);
		stage.addChild(guidetext_w);
		stage.addChild(guidetext_0);
		stage.addChild(guidetext_30);
		stage.addChild(guidetext_60);
		
		add_motor_marker();
		
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
		if((anim_time - update_wait_time) > 500) { // update every .5s, 2 Hz
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
		console.log(data);
		var sat_az = rad2deg(sat_item.look_angles[0]);
		var sat_el = rad2deg(sat_item.look_angles[1]);

		var mot_az = rad2deg(data.motor_azimuth);
		var mot_el = rad2deg(data.motor_elevation);
		console.log(sat_item.look_angles[0]);
		
		
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
		}
		if(sat_table[satnum]["is_tracking"]) {
			//console.log("Does it update the satellite marker?");
			update_satellite_marker(satnum, sat_az, sat_el);
			//update_motor_marker(mot_az, mot_el);
		};
	};
	
	WorkerManager.register_command_callback("path_update", path_update_callback);

	function path_update_callback(data) {
		//console.log("pixijs path update callback");
		var sat_item = data.sat_item;
		var satnum = sat_item.satnum;
		//console.log("pixi sat_table[satnum][is_tracking]="+sat_table[satnum]["is_tracking"]);
		
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
		};
		if(sat_table[satnum]["is_tracking"]) {
			if(sat_table[satnum]["path_ecf"]) {
				//console.log("calls update_path()");
				update_path(satnum, sat_item["lookangles_list"], sat_item['gmst_list']);
			} else {
				//console.log("calls add_path()");
				add_path(satnum, sat_item["lookangles_list"], sat_item['gmst_list']);
			};
		};
	};
	
	function hide_pixijs() {
		//console.log("hiding pixijs");
		stop_animation();
		for (var i = stage.children.length - 1; i >= 0; i--) {
			stage.removeChild(stage.children[i]);
		};
	};
	
	// --- SATELLITE FUNCTIONS ---------------------------------------------------
	
	/* add_satellite()
		Called by the UI and adds the satellite info into Pixi
	 */
	 //Added in name
	function add_satellite(satnum, satrec, name) {
		if(!sat_table[satnum]) {
			sat_table[satnum] = {};
			sat_table[satnum]["is_tracking"] = true;
            sat_table[satnum]["name"] = name;
			console.log(name);
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
		sat_marker[satnum].lineStyle(1, 0xF9BD77, 1);
		sat_marker[satnum].drawCircle(0, 0, horizon_radius/30);
		sat_marker[satnum].endFill()
		sat_marker[satnum].lineStyle(1, 0xF9BD77);		// azimuth lines
		sat_marker[satnum].moveTo(0, -horizon_radius/20);
		sat_marker[satnum].lineTo(0,  horizon_radius/20);
		sat_marker[satnum].moveTo(-horizon_radius/20, 0);
		sat_marker[satnum].lineTo( horizon_radius/20, 0);
		
		sat_text[satnum] = new PIXI.Text(
			sat_table[satnum]["name"],													// change this later
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
			remove_path(satnum);
			sat_table[satnum] = undefined;
		};
	};
	
	/* remove_satellite_marker()
	 */
	function remove_satellite_marker(satnum) {
		stage.removeChild(sat_marker[satnum]);
		stage.removeChild(sat_text[satnum]);
		sat_marker[satnum] = undefined;
		sat_text[satnum] = undefined;
	};
	
	/* update_satellite_marker()
		Called by Worker Manager to update satellite position
	 */
	function update_satellite_marker(satnum, az, el) {
		//console.log("update_satellite_marker()");
		if(el>=0) {
			sat_marker[satnum].visible = true;
			sat_text[satnum].visible = true;
			sat_marker[satnum].position = azel2pixi(az,el);
			sat_text[satnum].position = azel2pixi(az,el);
			//console.log("satellite visible, coords.x="+azel2pixi(az,el).x);
		} else {
			//console.log("satellite invisible");
			sat_marker[satnum].visible = false;
			sat_text[satnum].visible = false;
		}
	};
	
	// --- PATH FUNCTIONS --------------------------------------------------------
	
	function add_path(satnum, lookangles_list, gmst_list) {
		if(sat_path[satnum]==undefined) {
			var aos_set = false;
			var los_set = false;
			var aos = [-1,-1];
			var los = [-1,-1];
			
			sat_path[satnum] = new PIXI.Graphics();
			sat_path[satnum].beginFill(0xFFFFFF, 0);
			sat_path[satnum].lineStyle(1, 0xEB6D2D);
			
			// Step through list
			for(var i=0; i<lookangles_list.length; i++) {
				var pos = lookangles_list[i];
				pos[0] = rad2deg(pos[0]);
				pos[1] = rad2deg(pos[1]);
				//console.log("pos="+pos);

				if(lookangles_list[0][1] < 0) {
					if (!aos_set && pos[1]>-1 && pos[1]<0) {
						aos[0] = pos[0];
						aos[1] = pos[1];
						aos[2] = i;

						sat_path[satnum].moveTo(
							azel2pixi(pos[0],pos[1]).x,
							azel2pixi(pos[0],pos[1]).y );
					} else if (pos[1]>=0) {
						aos_set = true;
						//console.log("pos="+pos);
						sat_path[satnum].lineTo(
							(azel2pixi(pos[0],pos[1])).x,
							(azel2pixi(pos[0],pos[1])).y );
					} else if (aos_set && !los_set && pos[1]<0 ) {
						los[0] = pos[0];
						los[1] = pos[1];
						los[2] = i;
						
						
						los_set = true;
					}
				} else {
					if (pos[1]>=0) {
						aos_set = true;
						//console.log("pos="+pos);
						sat_path[satnum].lineTo(
							(azel2pixi(pos[0],pos[1])).x,
							(azel2pixi(pos[0],pos[1])).y );
					} else if (aos_set && !los_set && pos[1]<0 ) {
						los[0] = pos[0];
						los[1] = pos[1];
						los[2] = i;
						
						
						los_set = true;
					}
				}
			}
			
			// Add LOS markers
			sat_aos[satnum] = new PIXI.Text("AOS",
				{font:"12px Arial", fill:"white"}
				);
			sat_aos[satnum].position = azel2pixi(aos[0], aos[1]);
			sat_los[satnum] = new PIXI.Text("LOS",
				{font:"12px Arial", fill:"white"}
				);
			sat_los[satnum].position = azel2pixi(los[0], los[1]);
			
			stage.addChild(sat_aos[satnum]);
			stage.addChild(sat_los[satnum]);
			stage.addChild(sat_path[satnum]);
		}
	}
	
	function remove_path(satnum) {
		stage.removeChild(sat_path[satnum]);
		stage.removeChild(sat_aos[satnum]);
		stage.removeChild(sat_los[satnum]);
		sat_path[satnum] = undefined;
		sat_aos[satnum] = undefined;
		sat_los[satnum] = undefined;
	}
	
	function update_path(satnum, lookangles_list, gmst_list) {
		remove_path(satnum);
		add_path(satnum, lookangles_list, gmst_list);
	}
	
	// --- MOTOR FUNCTIONS ------------------------------------------------------
	
	function add_motor_marker() {
		motor_marker = new PIXI.Graphics();
		motor_marker.lineStyle(1, 0xFFFFFF, 1);
		motor_marker.drawCircle(0, 0, horizon_radius/15);
		motor_marker.endFill()
		
		stage.addChild(motor_marker);
	};
	
	function remove_motor_marker(satnum) {
		stage.removeChild(motor_marker);
	}
	
	function update_motor_marker(az, el) {
		//motor_marker.visible = true;
		console.log("az="+az+", el="+el);
		motor_marker.position = azel2pixi(az, el);
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
		} else if (el<0) {
			// implement later
			pixi.x = Math.abs((90-el)) * Math.sin(az * (3.14159/180));
		};
		
		pixi.y = -(Math.abs((90-el)) * Math.cos(az * (3.14159/180)));
		if (az>360) az = az - 360;
		
		// scale to stage
		pixi.x = pixi.x * (horizon_radius / 90)	// 90 degees
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
		update_motor_marker:	update_motor_marker,
		add_to_time_offset:		add_to_time_offset,
		reset_time_offset:		reset_time_offset,
		get_time:					get_time,
		set_observer_location:	set_observer_location,
		hide_pixijs: 				hide_pixijs		// hide errythang
	};
};
