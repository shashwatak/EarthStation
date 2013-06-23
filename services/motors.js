/*
 * EarthStation v0.3
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/EarthStation
 * License: MIT
 */

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
