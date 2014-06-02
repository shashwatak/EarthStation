/*
 * EarthStation v0.3
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/EarthStation
 * License: MIT
 */


function Motors (WorkerManager) {

	/*--- VARIABLES ---------------------------------------------------------*/
	var sat_table = {};				// holds data for different satellites
	var keeper = -1;				// Keeper of the Satnum
	var motorConnectionId = -1;		// Keeper of the Connection ID
	
	//var satAzimuth = -1;
	//var satElevation = -1;
	
	var supported_motors = {		// List of supported motors
		// UBW with Yaesu G5500
		'Slug Motor' : {
			functions : slug_motor,	// connects to slug_motor.js yes
			bitrate : 57600
		}
	};
	
	// UBW packet data: [A][,][ADC val 1][,]...[,][CR][LF]
	var UBW_PREAM 	= 0x41;	// Not really a preamble, just 'A' in ASCII
	var UBW_COMMA	= 0x2C;	// Comma used as delimiter
	var ASCII_0		= 0x30;
	var ASCII_1		= 0x31;
	var ASCII_2		= 0x32;
	var ASCII_3		= 0x33;
	var ASCII_4		= 0x34;
	var ASCII_5		= 0x35;
	var ASCII_6		= 0x36;
	var ASCII_7		= 0x37;
	var ASCII_8		= 0x38;
	var ASCII_9		= 0x39;
	var EXCLM		= 0x21;	// ! denotes start of error message
	var CR			= 0x0D;	// Carriage return
	var LF			= 0x0A;	// Linefeed
	
	// This will allow us to use the functions in slug_motor.js
	// To be implemented later.
	WorkerManager.register_command_callback("live_update", live_update_callback);

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

	/*--- PRIVATE FUNCTIONS -------------------------------------------------*/
   
	/**
	 * save_satnum();
	 * Saves the satnum to the global variable: keeper
	 */
	function save_satnum(satnum){
		keeper = satnum;
	};

	/**
	 * live_update_callback()
	 * Does nothing at the moment. To be implemented with the WorkerManger service later
	 */
	function live_update_callback (data) {
		// When the WorkerManager service updates the satellite data,
		// it callbacks the controller to update the model here.
		var sat_item = data.sat_item;
		var satnum = sat_item.satnum;
		if (sat_table[satnum] && sat_table[satnum]["connectionId"] > 0) {
			if (sat_table[satnum]["is_tracking"]) {
				// Find satellite azimuth and elevation
				sat_table[satnum]["sat_azimuth"] = sat_item.look_angles[0];
				sat_table[satnum]["sat_elevation"] = sat_item.look_angles[1];

				// Calling az/el functions from slug_motors.js
				//sat_table[satnum]["functions"].move_az_to(  sat_table[satnum].connectionId, sat_item.look_angles[0]);
				//sat_table[satnum]["functions"].move_el_to(sat_table[satnum].connectionId, sat_item.look_angles[1]);
			};
			//sat_table[satnum]["functions"].get_status(sat_table[satnum].connectionId, sat_table[satnum]["callback"]);
		};
	};
	
	
	function motor_comms_async_loop(sat_item) {
		//console.log("motor_comms_async_loop");	// this is only called once?
		if (sat_table[keeper]["is_tracking"]) {
			var sat_azimuth = (rad2deg(sat_table[keeper]["sat_azimuth"])).toFixed(2);
			var sat_elevation = (rad2deg(sat_table[keeper]["sat_elevation"])).toFixed(2);
			
			// move motor
			move_motors(sat_table[keeper]["motor_azimuth"],
						sat_table[keeper]["motor_elevation"],
						sat_azimuth,
						sat_elevation);
		}
		setTimeout(function () {
			motor_comms_async_loop(sat_item);
			}, 500);
	}

	/**
	 * onReceiveCallback()
	 * Callback function, triggered when a packet is received through the
	 * motors COM port.
	 */
	var onReceiveCallback = function(info) {
		if ( info.connectionId==motorConnectionId ) {
			var incoming_bytes = [];
			var serial_in_view = new Uint8Array(info.data);
			
			//for(var i=0; i<info.data.bytelength; i++) {	// WOW I DIDN'T CAPITALIZE THE L
			//	console.log("MOTOR: serial_in_view["+i+"]: "+serial_in_view[i].toString(16));
			//	incoming_bytes.push(serial_in_view[i]);
			//}
			
			
			for(var i=0; i<info.data.byteLength; i++) {
				//console.log("MOTOR: data["+i+"]: "+serial_in_view[i].toString(16)
				//	+", dec: "+ascii2dec(serial_in_view[i]));
				incoming_bytes.push(serial_in_view[i]);
			}
			
			// Find motor azimuth and elevation
			
			var parse_results = parse_motor_response(incoming_bytes);
			var motor_angles = adc2azel(
				parse_motor_response(incoming_bytes)[1],
				parse_motor_response(incoming_bytes)[2]
				);
			
			//var parse_results = adc2azel(
			//	parse_motor_response(incoming_bytes)[1],
			//	parse_motor_response(incoming_bytes)[2]
			//	);
			if (sat_table[keeper]["is_tracking"]) {

				//sat_table[satnum]["sat_azimuth"] = sat_item.look_angles[0];
				//sat_table[satnum]["sat_elevation"] = sat_item.look_angles[1];
			
				if(parse_results[0]==1 && parse_results[1]>=0 && parse_results[2]>=0) {
					//update values
					sat_table[keeper]["motor_azimuth"]   = motor_angles[0].toFixed(2);
					sat_table[keeper]["motor_elevation"] = motor_angles[1].toFixed(2);
				}
				
				var sat_azimuth = rad2deg(sat_table[keeper]["sat_azimuth"]);
				var sat_elevation = rad2deg(sat_table[keeper]["sat_elevation"]);
				
				// move motor
				//console.log( "sat az=" + (sat_azimuth).toFixed(2) + ", sat el=" + (sat_elevation).toFixed(2) );
				//move_motors(motor_angles[0],
				//			motor_angles[1],
				//			sat_azimuth,
				//			sat_elevation);
				
			} else {
				// don't update values
				//sat_table[keeper]["motor_azimuth"] = -1;
				//sat_table[keeper]["motor_elevation"] = -1;
			}
			sat_table[keeper]["callback"]({ //data structure for callback for HTML
				motor_azimuth: 		sat_table[keeper]["motor_azimuth"],
				motor_elevation: 	sat_table[keeper]["motor_elevation"],
			});
		}
	};
 
	/**
	 * parse_motor_response()
	 * Parses the motor response. Returns an array of numnums
	 */
	var parse_motor_response = function(incoming_bytes) {
		var i = 0;	// counter for incoming_bytes[i]
		var j = -1;	// counter for adcval[j]
		var k = 0;	// counter for decimal place
		var adcval = [];
		adcval[0] = -1;
		adcval[1] = -1;
		adcval[2] = -1;
		
		console.log("Parsing incoming_bytes: "+incoming_bytes);

		if(incoming_bytes[0] !== UBW_PREAM) {
			//console.log("Sketch preamble: "+incoming_bytes[i]);
			return false;
		} else {
			//console.log("Carry on...");
			while(i < incoming_bytes.length) {
				if(incoming_bytes[i] === (CR || LF)) {
					// do nothing for now
					//console.log("End packet");
				} else if(incoming_bytes[i] === UBW_COMMA) {
					//console.log("Comma");
					k = 3;	// reset to the 1000ths place
					j++;
					adcval[j] = 0;
				} else {
					if(adcval[0]!=1 && j==0) {
						adcval[0] = 1;
					} else if(j!=0 && k>=0) {
						adcval[j] += (ascii2dec(incoming_bytes[i]) * exp(10, k--));
					}
				}
				i++;
			}
		
		}
		//console.log("[0]="+adcval[0]+", [1]="+adcval[1]+", [2]="+adcval[2]);
		return adcval;
	};
	
	/*
	 * adc2azel()
	 * Helper function, computes angle from the ADC values
	 * Returns azangle (0 to 360), elangle (0 to 180)
	 */
	var adc2azel = function(azadc, eladc) {
		var angles = [];
		angles[0] = -1;	// az
		angles[1] = -1;	// el
		
		
		angles[0] = azadc * (470/2480);
		if(angles[0]>360) {
			angles[0] = angles[0] - 360;
		}
		
		//if(azadc >= 1048) {
		//	angles[0] = (azadc-1048) * (90/262);
		//} else {
		//	angles[0] = azadc * (359/1048);
		//}
		
		angles[1] = eladc * (180/2770);		// experimentally determined
		
		
		//console.log("ADC: az="+azadc.toFixed(2)+", el="+eladc.toFixed(2));
		//console.log("ANG: az="+angles[0].toFixed(2)+", el="+angles[1].toFixed(2));
		
		//console.log("angles: "+angles);
		return angles;
	};
	
	/*
	 * exp()
	 * Helper function, computes exponents: num^pow. This works too!
	 */
	var exp = function(num, pow) {
		var i = num;
		var j = pow;
		var result = 1;
		
		while (j>0) {
			result *= i;
			j--;
		}
		//console.log("exp() result "+result);
		return result;
	};
	
	/*
	 * rad2deg()
	 * Helper function, converts radians to degrees
	 */
	var rad2deg = function(rad) {
		var deg = rad * (180 / Math.PI);
		return deg;
	}
	
	/*
	 * ascii2dec()
	 * Helper function, converts ASCII to decimal. This definitely works.
	 */
	 var ascii2dec = function(num) {
		switch(num) {
			case ASCII_0:
				return 0;
				break;
			case ASCII_1:
				return 1;
				break;
			case ASCII_2:
				return 2;
				break;
			case ASCII_3:
				return 3;
				break;
			case ASCII_4:
				return 4;
				break;
			case ASCII_5:
				return 5;
				break;
			case ASCII_6:
				return 6;
				break;
			case ASCII_7:
				return 7;
				break;
			case ASCII_8:
				return 8;
				break;
			case ASCII_9:
				return 9;
				break;
			default:
				//console.log("ascii2dec error");
				break;
		}
	};
	
	/*
	 * str2ab()
	 * Helper function, converts string to array buffer for UBW
	 */
	var str2ab=function(str) {
		var buf=new ArrayBuffer(str.length);
		var bufView=new Uint8Array(buf);
		for (var i=0; i<str.length; i++) {
			bufView[i]=str.charCodeAt(i);
		}
		//console.log("str2ab(): str=\""+str+"\", buf="+buf);
		return buf;
	}
	
	// Listener for data packets
	// Apparently, it needs to be placed here specifically?
	chrome.serial.onReceive.addListener(onReceiveCallback);
  
	/*--- PUBLIC FUNCTIONS --------------------------------------------------*/

	/**
	 * get_supported_motors()
	 * Get a list of supported motors.
	 */
	function get_supported_motors (){
		var supported_motors_list = [];
		for (var motor_type in supported_motors) {
			if(supported_motors.hasOwnProperty(motor_type)) {
				supported_motors_list.push(motor_type);
			};
		};
		return supported_motors_list;
	}; //end get_supported_motors()

	/**
	 * connect_motors()
	 * Connects to the COM port controlling the motor, saves connection info
	 */
	function connect_motors (satnum, COMport, motor_type, callback){
		function on_open (open_info) {
			if (open_info.connectionId > 0) {
				sat_table[satnum] = {
					connectionId	: open_info.connectionId,
					COMport			: COMport,
					functions		: supported_motors[motor_type]["functions"],
					callback		: callback
				};
				
				save_satnum(satnum);
				motorConnectionId = sat_table[satnum]["connectionId"];
				console.log("MOTOR CONNECTED: motorConnectionId="+motorConnectionId);
				chrome.serial.flush (sat_table[satnum]["connectionId"], function(result){
					if(result) {
						console.log("motors on_open()");
						setTimeout(function () {
							motor_comms_async_loop(sat_table[satnum]);
							}, 1000);
					}
				});
			} else {
				console.log ("Couldn't Open: "+COMport);
			};
		};
		console.log("Motors.connect_motors("+COMport+", "+motor_type+", "+satnum+")");
		if (COMport && supported_motors[motor_type] && supported_motors[motor_type]["bitrate"]){
			chrome.serial.connect(COMport, {
				bitrate : supported_motors[motor_type]["bitrate"]
				}, on_open);
		} else {
			console.log("tough luck kid");
		};
	}; //end connect_motors()

	/**
	 * close_motors()
	 * Disconnects the motors.
	 */
	function close_motors (satnum) {
		if (sat_table[satnum].connectionId == motorConnectionId) {
			chrome.serial.disconnect(sat_table[satnum].connectionId,
				function (close_res) { // callback
					console.log("close: "+sat_table[satnum].COMport+" "+close_res)
					if (close_res) {
						sat_table[satnum].connectionId = -1;
						sat_table[satnum].port = "";
					};
				});
		};
	}; //end close_motors()

	/*
	 * start_motors()
	 */
	function start_motors(satnum) {
		// Initializes motors and starts tracking
		//console.log("start_motors(), motorConnectionId="+sat_table[satnum].connectionId);
		chrome.serial.send(sat_table[satnum].connectionId,
			str2ab("c,255,0,0,3\n\rt,500,1\n\ro,0,255,0\n\raz,0\n\rel,0\n\r"),
			function(info) {console.log("info.bytesSent="+info.bytesSent);} );
		if (sat_table[satnum] && !sat_table[satnum]["is_tracking"]) {
			sat_table[satnum]["is_tracking"] = true;
		}
	};//end start_motors(satnum)
	
	/*
	 * stop_motors()
	 */
	function stop_motors(satnum) {
		// stops tracking
		//console.log("start_motors(), motorConnectionId="+motorConnectionId);
		chrome.serial.send(motorConnectionId,
			str2ab("az,0\n\rel,0\n\r"),
			function(info) {console.log("info.bytesSent="+info.bytesSent);} );
		if (sat_table[satnum] && sat_table[satnum]["is_tracking"]) {
			sat_table[satnum]["is_tracking"] = false;
		}
	};//end start_motors(satnum)
	
	/*
	 * move_motors_up()
	 */
	function move_motors_up(satnum) {
		//console.log("move_motors_up(), motorConnectionId="+motorConnectionId);
		chrome.serial.send(motorConnectionId,
			str2ab("el,1\n\r"),
			function(){});
	};//end move_motors_up()
	
	/*
	 * move_motors_down()
	 */
	function move_motors_down(satnum) {
		//console.log("move_motors_down(), motorConnectionId="+motorConnectionId);
		chrome.serial.send(motorConnectionId,
			str2ab("el,2\n\r"),
			function(){});
	};
	
	function stop_el(satnum) {
		//console.log("stop_el(), motorConnectionId="+motorConnectionId);
		chrome.serial.send(motorConnectionId,
			str2ab("el,0\n\r"),
			function(){});
	}
	
	/*
	 * move_motors_left()
	 */
	function move_motors_left(satnum) {
		//console.log("move_motors_left(), motorConnectionId="+motorConnectionId);
		chrome.serial.send(motorConnectionId,
			str2ab("az,1\n\r"),
			function(){});
	};//end move_motors_left()
	
	/*
	 * move_motors_right()
	 */
	function move_motors_right(satnum) {
		//console.log("move_motors_right(), motorConnectionId="+motorConnectionId);
		chrome.serial.send(motorConnectionId,
			str2ab("az,2\n\r"),
			function(){});
	};//end move_motors_right()
	
	function stop_az(satnum) {
		//console.log("stop_az(), motorConnectionId="+motorConnectionId);
		chrome.serial.send(motorConnectionId,
			str2ab("az,0\n\r"),
			function(){});
	}
	
	/*
	 * move_motors()
	 */
	function move_motors(az, el, nextAz, nextEl) {
		console.log("moving motors: mot=("+az+", "+el+"), sat=("+nextAz+", "+nextEl+")");
		if( (nextAz-az) > 2) {
			move_motors_right(keeper);
		} else if( (nextAz-az) < -2 ) {
			move_motors_left(keeper)
		} else {
			stop_az(keeper);
		}
		
		if( (nextEl-el) > 2) {
			move_motors_up(keeper);
		} else if( (nextEl-el) < -2 ) {
			move_motors_down(keeper)
		} else {
			stop_el(keeper);
		}
	};//end move_motors()
	
	// returns functions to UI
	return {
		get_supported_motors	: get_supported_motors,
		connect_motors			: connect_motors,
		close_motors			: close_motors,
		start_motors			: start_motors,
		stop_motors				: stop_motors,
		move_motors_up			: move_motors_up,		// for demo, we will allow buttons
		move_motors_down		: move_motors_down,		// to manually control the motor (LEDs)
		move_motors_left		: move_motors_left,
		move_motors_right		: move_motors_right,
		motorConnectionId		: motorConnectionId
	};
};
