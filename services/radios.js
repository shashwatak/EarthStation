/*
 * EarthStation v0.3
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/EarthStation
 * License: MIT
 */
var radioConnectionId = -1; // wow

function Radios(WorkerManager) {
	var sat_table = {};
	var supported_radios = {
		//    'ICOM IC821H' : {
		//      functions : icom_821h,
		//      bitrate : 19200
		//    },
		'ICOM IC910H': {
			functions: icom_910h,
			bitrate: 19200
		}
	};

	var ICOM_PREAMBLE = 0xFE;
	var ICOM_EOM = 0xFD;
	var ICOM_NG_CODE = 0xFA;
	var ICOM_OK_CODE = 0xFB;
	var CONTROLLER_ADDRESS = 0xE0;
	var ICOM_ADDRESS = 0x60;
	var ICOM_FREQ_POLL = 0x03;
	// THIS DOENS'T MATCH THE MANUAL!
	// The IC 910H Manual is wrong!
	var ICOM_FREQ_SET = 0x05;
	// THIS DOENS'T MATCH THE MANUAL!
	// The IC 910H Manual is wrong!
	var ICOM_MAINSUB_CMD = 0x07;
	var ICOM_MAIN_SCMD = [0xD0];
	var ICOM_SUB_SCMD = [0xD1];

	var ICOM_BASE_MSG_SIZE = 6; // Smallest message size
	var freqList = [];
	var origFreq = 0;
	var origSubFreq = 0;
	var keeper; //this keeps satnum's data structure
	var freqtemp; //keeps frequency in offset
	var initAutoFlag = false; //check for first instance background tuning after 
	var autoFlag = false;  //check if autoset was ever turned on
    var bgStop = false; //checks if stop_radio_tracking2 was called
	
	
	function save_satnum(satnum) {
		keeper = satnum;
	};

	WorkerManager.register_command_callback("live_update", live_update_callback);

	function live_update_callback(data) {
		// When the WorkerManager service updates the satellite data,
		// it callbacks the controller to update the model here.
		var sat_item = data.sat_item;
		var satnum = sat_item.satnum;
		if(sat_table[satnum]) {
			sat_table[satnum]["doppler_factor"] = sat_item["doppler_factor"];
		};
	};

	//Where the data is being read. Fix this(?)
	//Probably. 
	//The motors module might need something like this(????)
	function radio_comms_async_loop(sat_item) {
		//console.log("*~*~* What does this radio comms async loop do??? *~*~*");
		// check connection ID
		//if (sat_item && sat_item["connectionId"] > 0){ //this checks if it's connected 
		if(sat_item && (sat_item["connectionId"] == radioConnectionId)) {
			//if (sat_item["connectionId"]==radioConnectionId) {	// what did i ever do to you
			//Since this is not polling anymore, we will change the way we detect background tuning.   
			if(sat_item["is_tracking"]) { //auto tuning
				autoFlag = true;
				sat_item["radio_main_frequency"] = Math.floor(sat_item["doppler_factor"] * sat_item["radio_main_frequency"]);
				sat_item["radio_sub_frequency"] = Math.floor(sat_item["doppler_factor"] * sat_item["radio_sub_frequency"]); 
				
                origFreq = sat_item["radio_sub_frequency"]; //to fix the bug in resetting frequency after auto-tuning
				origSubFreq = sat_item["radio_main_frequency"];
				console.log("Setting orig Freq: " + origFreq);
				console.log("Auto tune");
				

				if(sat_item["offsetFlag"]) {

					sat_item["offset"] += freqtemp - sat_item["radio_sub_frequency"];
					console.log("YOUR OFFSET IN AUTOMATICAL SETTING IS : " + sat_item["offset"]);
				}
				freqtemp = sat_item["radio_sub_frequency"];

				sat_item["functions"].set_main_frequency(sat_item["connectionId"], sat_item["radio_main_frequency"], function (set_main_result) {
					sat_item["functions"].set_sub_frequency(sat_item["connectionId"], sat_item["radio_sub_frequency"], function (set_sub_result) {
						sat_item["callback"]({
							radio_main_frequency: sat_item["radio_main_frequency"],
							radio_sub_frequency: sat_item["radio_sub_frequency"],
							offset: sat_item["offset"]
						});
					});
				});
				setTimeout(function () {
					radio_comms_async_loop(sat_item);
				}, 2000);
			} else { //background tuning
				console.log("background tuning activated");
				if(initAutoFlag === true && bgStop === true && (performance.now() - sat_item["background_tuning_wait_start"])> 4200){
				initAutoFlag = false;
				start_radio_tracking(keeper);
				}else if(initAutoFlag === false && autoFlag === true && bgStop === true){ //if it detects that autotune was set previously and we went into BG tuning for the first time
					initAutoFlag = true; //so we don't constantly check the time
					sat_item["background_tuning_wait_start"] = performance.now();
				}
				
				setTimeout(function () {
					radio_comms_async_loop(sat_item);
				}, 1000);
			};
		};

	};

	/*The following function will calculate the link offset of the USB.
	 * The reason is because the downlink should always remain constant,
	 * but because of doppler and that sometimes the equation isn't accurate,
	 * we account for this by manually tuning and adding in a link offset.
	 */

	function calc_link_offset() {

		if(sat_table[keeper]["offsetFlag"] === false) {
			console.log("OFFSET: ON, Offset is: " + sat_table[keeper]["offset"]);
			sat_table[keeper]["offsetFlag"] = true;
			freqtemp = sat_table[keeper]["radio_sub_frequency"];

		} else sat_table[keeper]["offsetFlag"] = false
	};


	function connect_radio(satnum, COMport, radio_type, callback, uplink, downlink) {
		save_satnum(satnum);

		function on_open(open_info) {
			console.log("doing it");
			if(open_info.connectionId > 0) {
				sat_table[satnum] = {
					connectionId: open_info.connectionId,
					COMport: COMport,
					functions: supported_radios[radio_type]["functions"],
					callback: callback
				};

				radioConnectionId = sat_table[satnum]["connectionId"];
				console.log("RADIO CONNECTED: radioConnectionId=" + radioConnectionId);

				console.log("this is your uplink " + uplink);
				console.log("this is your downlink " + downlink);
				//This function definitely works. 
				sat_table[satnum]["uplink_frequency"] = uplink;
				sat_table[satnum]["downlink_frequency"] = downlink;
				sat_table[satnum]["background_tuning_wait_start"] = 0;
				sat_table[satnum]["offsetFlag"] = false;
				sat_table[satnum]["offset"] = 0;

				// something here with the callback function? DUDE WHAT IS GOING ON.
				chrome.serial.flush(sat_table[satnum]["connectionId"], function (result) {
					if(result) {
						//console.log("Hello? Flush callback function?");
						save_satnum(satnum);
						console.log("MAIN FREQ PART");

						sat_table[satnum]["functions"].get_main_frequency( sat_table[satnum]["connectionId"],
							function (radio_main_frequency) {
								sat_table[satnum]["functions"].get_sub_frequency(sat_table[satnum]["connectionId"], function (radio_sub_frequency) {
									if(sat_table[satnum]["radio_main_frequency"] !== radio_main_frequency ||
										sat_table[satnum]["radio_sub_frequency"] !== radio_sub_frequency) {
										// That means that since the last time we set the frequency,
										// somebody else (the user) changed the dials.
										sat_table[satnum]["background_tuning_wait_start"] = performance.now();
										sat_table[satnum]["radio_main_offset"] += (radio_main_frequency - sat_table[satnum]["uplink_frequency"]);
										sat_table[satnum]["radio_sub_offset"] += (radio_sub_frequency - sat_table[satnum]["downlink_frequency"]);
									}

									console.log("This is the radio_main_freq response: " + radio_main_frequency);


								});

							}//end callback function. All of this is irrelevant to the motors part. Moving on....
							);

						console.log("HERE IS YOUR DATA: " + '\n' + sat_table[satnum]["radio_main_frequency"] + '\n' + sat_table[satnum]["radio_sub_frequency"]);
						setTimeout(function () {
							radio_comms_async_loop(sat_table[satnum]);
						}, 3000);

					} else {
						console.log("Couldn't Flush: " + COMport);
					};
				});
			} else {
				console.log("Couldn't Open: " + COMport);
			};
		};
		console.log("radios.connect_radios(" + COMport + ", " + radio_type + ", " + satnum + ")");
		if(COMport && supported_radios[radio_type] && supported_radios[radio_type]["bitrate"]) {
			chrome.serial.connect(COMport, {
				bitrate: supported_radios[radio_type]["bitrate"]
			}, on_open);
			radio_comms_async_loop(sat_table[satnum]);

		} else {
			console.log("tough luck kid");
		};
	};

	function close_radio(satnum) {
		flag = 0;
		origFreq = 0;
		origSubFreq = 0;
		// check for correct connection ID
		if(sat_table[satnum].connectionId == radioConnectionId) {
			//if (sat_table[satnum] && sat_table[satnum].connectionId > 0) {
			chrome.serial.disconnect(sat_table[satnum].connectionId, function (close_res) {
				console.log("close: " + sat_table[satnum].COMport + " " + close_res)
				if(close_res) {
					sat_table[satnum]["is_tracking"] = false;
					sat_table[satnum].connectionId = -1;
					sat_table[satnum].port = "";
				};
			});
		};
	};

	function start_radio_tracking(satnum, callback) {
		if(sat_table[satnum] && !sat_table[satnum]["is_tracking"]) {
			sat_table[satnum]["is_tracking"] = true;
		}
	};

	function stop_radio_tracking(satnum) {
		if(sat_table[satnum] && sat_table[satnum]["is_tracking"]) {
			sat_table[satnum]["is_tracking"] = false;
			
		};
		bgStop = false;
	};
	function stop_radio_tracking2(satnum) { //This call is from these functions
		if(sat_table[satnum] && sat_table[satnum]["is_tracking"]) {
			sat_table[satnum]["is_tracking"] = false;
			bgStop = true;
		};
	};

	function get_supported_radios() {
		var supported_radios_list = [];
		for(var radio_type in supported_radios) {
			if(supported_radios.hasOwnProperty(radio_type)) {
				supported_radios_list.push(radio_type);
			};
		};
		return supported_radios_list;
	};
	var flag = 0;
	var onReceiveCallback = function (info) {
		if(info.connectionId == radioConnectionId) {
			// add checker hereeeeeee????? WHY DOES THIS NOT WORK
			console.log("Radio packet detected: "+info.data); // prints as [object ArrayBuffer]
			var incoming_bytes = [];
			var serial_in_view = new Uint8Array(info.data);
			for(var i = 0; i < info.data.byteLength; i++) {
				console.log("RADIO: serial_in_view[" + i + "]: " + serial_in_view[i].toString(16));
				// debug dump
				incoming_bytes.push(serial_in_view[i]);
				// Persist all the read bytes, otherwise
				// next iteration will overwrite them, and we
				// will lose data.
			}
			if(serial_in_view[serial_in_view.length - 1] == 0xFD) { //EOM data
				console.log("EOM");
			}
			console.log("INCOMING BYTES IS " + incoming_bytes);
			parse_results = parse_icom_response(incoming_bytes);
			if(!parse_results) {
				// Didn't get the response we were looking for.
				// Start over, call this function again from scratch.
				console.log("that wasn't the packet we wanted, keep reading")
				// get_icom_response (info.connectionId, ICOM_BASE_MSG_SIZE, callback);
			} else {
				// Our blocking read has come to an end, if the
				// callback exists, call it. We are done here!
				if(parse_results === parseInt(parse_results)) {

					if(flag === 0) {
						console.log("is it going here? flag = 0");
						sat_table[keeper]["radio_main_frequency"] = parseInt(parse_results);
						origSubFreq = parseInt(parse_results); //main freq
						sat_table[keeper]["callback"]({
							radio_main_frequency: sat_table[keeper]["radio_main_frequency"]
						});

					} else if(flag == 1) {
						console.log("is it going in here? flag = 1");
						origFreq = parseInt(parse_results); //sub freq
						console.log(origFreq + "THIS IS YOUR ORIG FREQ");
						sat_table[keeper]["radio_sub_frequency"] = parseInt(parse_results);
						sat_table[keeper]["callback"]({ //data structure for callback for HTML
							radio_main_frequency: sat_table[keeper]["radio_main_frequency"],
							radio_sub_frequency: sat_table[keeper]["radio_sub_frequency"]
						});

					} else {

						//background tuning detected! 


						console.log("Detecting background tuning");
						stop_radio_tracking2(keeper);
						sat_table[keeper]["background_tuning_wait_start"] = performance.now();
						sat_table[keeper]["radio_sub_frequency"] = parseInt(parse_results);
						console.log(origSubFreq +" " +  origFreq + " " +  parseInt(parse_results) +"THIS IS YOUR THINGY ");
						if(origFreq - parseInt(parse_results) > 0) { //shifting down
							sat_table[keeper]["radio_main_frequency"] = origSubFreq + Math.abs((origFreq - parseInt(parse_results)));

						} else { //shifting up
							sat_table[keeper]["radio_main_frequency"] = origSubFreq - Math.abs((origFreq - parseInt(parse_results)));


						}

						if(sat_table[keeper]["offsetFlag"]) {


							sat_table[keeper]["offset"] += freqtemp - sat_table[keeper]["radio_sub_frequency"];
							console.log("YOUR OFFSET IS : " + sat_table[keeper]["offset"]);
						}
						freqtemp = sat_table[keeper]["radio_sub_frequency"];

						sat_table[keeper]["callback"]({
							radio_main_frequency: sat_table[keeper]["radio_main_frequency"],
							radio_sub_frequency: sat_table[keeper]["radio_sub_frequency"],
							offset: sat_table[keeper]["offset"]
						});

					}
					flag++;
				}
				console.log("This is your list " + freqList);
				console.log("Read Finished: " + parse_results);
				// if (callback) { callback(parse_results); }
			}
		}
	};


	chrome.serial.onReceive.addListener(onReceiveCallback);

	function parse_icom_response(incoming_bytes) {
		// Read the packet bytes and determine
		// what the radio actually said
		var response_itor = 0;
		if(incoming_bytes[response_itor++] !== ICOM_PREAMBLE ||
			incoming_bytes[response_itor++] !== ICOM_PREAMBLE) {
			// Incorrect preamble, ignore.
			console.log("Sketch Preamble");
			return false;
		}
		if(incoming_bytes[response_itor++] === ICOM_ADDRESS ||
			incoming_bytes[response_itor++] === CONTROLLER_ADDRESS) {
			// Not from ICOM or not to Controller, ignore.
			console.log("WRONG Address");
			return false;
		}
		if(incoming_bytes[response_itor] === ICOM_OK_CODE) {
			// Valid OK Packet
			console.log("OK!");
			return true;
		}
		if(incoming_bytes[response_itor] === ICOM_NG_CODE) {
			// Valid NG Packet
			console.log("Not OK! =( ");
			return true;
		}
		if(incoming_bytes[response_itor] === ICOM_FREQ_POLL) {
			console.log("FREQ POLLING OFF TOP");
			response_itor++;
			var BCD_array = [];

			while(response_itor < incoming_bytes.length) {
				// If there is a Data segment in the packet, it is from here
				// until the EOM byte

				if(incoming_bytes[response_itor] === ICOM_EOM) {
					// the EOM byte is reached, data segment is over,
					// if it existed at all
					break;
				}
				// save the data segment bytes
				console.log("pushing");
				BCD_array.push(incoming_bytes[response_itor++]);

			}

		} else {
			response_itor++;
			var BCD_array = [];

			while(response_itor < incoming_bytes.length) {
				// If there is a Data segment in the packet, it is from here
				// until the EOM byte

				if(incoming_bytes[response_itor] === ICOM_EOM) {
					// the EOM byte is reached, data segment is over,
					// if it existed at all
					break;
				}
				// save the data segment bytes
				console.log("pushing");
				BCD_array.push(incoming_bytes[response_itor++]);

			}
		}
		console.log("THIS YOUR BCD ARRAY : " + BCD_array);
		var decimal = BCD_array_to_decimal(BCD_array);
		// deserialize BDC data to a decimal
		console.log("bcd to decimal: " + decimal);
		return decimal;
	};

	function BCD_array_to_decimal(BCD_array) {
		var decimal_str = "";
		for(var bcd_itor = 0; bcd_itor < BCD_array.length; bcd_itor++) {
			//console.log ("BCD_array["+bcd_itor+"] as hex: 0x" + BCD_array[bcd_itor].toString(16));
			if(BCD_array[bcd_itor] >= 0x10) {
				// If the BCD is two digits, then prepend to string
				decimal_str = BCD_array[bcd_itor].toString(16) + decimal_str;
				// Coercing javascript into reading the hex literally as a decimal
			} else {
				// If the BCD is one digit, prepend an extra 0, then the digit
				decimal_str = "0" + BCD_array[bcd_itor].toString(16) + decimal_str;
				// Coercing javascript into reading the hex literally as a decimal
			}
		}

		var decimal = parseInt(decimal_str, 10);
		return decimal;
	};

	function decimal_to_BCD_array(decimal) {
		// BCD data encodes a decimal number as a hex value.
		// For example, decimal d45 is x45, d10 is x10, etc.
		// The purpose of this is, of the 256 possible values
		// of a byte, 100 of them can represent 0 to 99, and
		// the remaining can represent control values, like
		// EOM, Preamble, radio Functions, etc.
		//console.log ("decimal to bcd: ", decimal);
		var decimal_str = decimal.toString();
		var str_len = decimal_str.length;
		var NUM_DIGITS_IN_ICOM_BCD_DATA = 10;
		if(str_len < NUM_DIGITS_IN_ICOM_BCD_DATA) {
			while(str_len < NUM_DIGITS_IN_ICOM_BCD_DATA) {
				// prepend 0s until the decimal string is 10 chars
				decimal_str = "0" + decimal_str;
				str_len++;
			}
		}
		//console.log ("decimal_str: " + decimal_str);
		var BCD_array = [];
		for(var dec_str_itor = str_len - 2; dec_str_itor >= 0; dec_str_itor -= 2) {
			var BCD_str = "0x" + decimal_str.substring(dec_str_itor, dec_str_itor + 2);
			// Coercing javascript into reading the decimal literally as a hex
			BCD_array.push(parseInt(BCD_str, 16));
		}
		return BCD_array;
	};

	return {
		get_supported_radios: get_supported_radios,
		connect_radio: connect_radio,
		close_radio: close_radio,
		start_radio_tracking: start_radio_tracking,
		stop_radio_tracking: stop_radio_tracking,
		calc_link_offset: calc_link_offset,
	};
};