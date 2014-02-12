/*
 * EarthStation v0.3
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/EarthStation
 * License: MIT
 */

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

  //Where the data is being read. Fix this(?)
  //Probably. 
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
		//console.log("this is your uplink" + uplink);
		//This function definitely works. 
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
    }else{
	console.log("tough luck kid");
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
    stop_radio_tracking : stop_radio_tracking,
  };
};
