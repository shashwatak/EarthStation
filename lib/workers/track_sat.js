importScripts('../sgp4/satellite.js');
importScripts('console4Worker-worker.js');

var observer_coords_gd = [0,0,0];
var observer_coords_ecf = [0,0,0];

var sat_table = {};

// Find where this is called
// And pass in the observer coordinates: track_sats (time, coord)
function track_sats (time) {
  for (var satnum in sat_table){
    if (sat_table.hasOwnProperty(satnum) && sat_table[satnum]) {
      var satrec = sat_table[satnum];
      var gmst = satellite.gstime_from_date (time.year, time.month, time.date_of_month, time.hour, time.minute, time.second);
      var r_v = satellite.propagate(satrec, time.year, time.month, time.date_of_month, time.hour, time.minute, time.second);
      var position_eci = r_v[0];
      var velocity_eci = r_v[1];
      var position_ecf = satellite.eci_to_ecf (position_eci, gmst);
      var velocity_ecf = satellite.eci_to_ecf (velocity_eci, gmst);
      var doppler_factor = satellite.doppler_factor (observer_coords_ecf, position_ecf, velocity_ecf);
      var look_angles = satellite.ecf_to_look_angles (observer_coords_gd, position_ecf);
      var position_gd = satellite.eci_to_geodetic (position_eci, gmst);
	  var name = sat_table[satnum].name;		// nope
      var sat_item = {
		name				: name,
        satnum          	: satrec.satnum,
        satrec          	: satrec,
        observer_coords_gd : observer_coords_gd,
        look_angles     	: look_angles,
        position_ecf    	: position_ecf,
        position_gd     	: position_gd,
        position_eci    	: position_eci,
        doppler_factor  	: doppler_factor,
        gmst            	: gmst,
        time            	: time

      };
      if (sat_table[satnum]){
        self.postMessage ({
          cmd         : 'live_update',
          sat_item    : sat_item
        });
      }
    };
  };
};

self.addEventListener('message', function(e) {
  if (e.data.cmd === 'add_satellite') {
    var satrec = e.data.satrec;
    var satnum = satrec.satnum;
    sat_table[satnum] = satrec;
  }
  else if (e.data.cmd === 'remove_satellite') {
    var satnum = e.data.satnum;
    sat_table[satnum] = undefined;
  }
  else if (e.data.cmd === 'observer_location') {
    observer_coords_gd = e.data.observer_coords_gd;
    observer_coords_ecf = satellite.geodetic_to_ecf (observer_coords_gd);
	 //console.log("location set in track_sat(): observer_coords_gd="+observer_coords_gd);
  }
  else if (e.data.cmd === 'update_sats') {
    track_sats (e.data.time);
  };
}, false);

function set_observer_location(longitude, latitude, altitude) {
	var observer_coords_gd = [
		longitude*Math.PI/180,
		latitude*Math.PI/180,
		altitude];
	return observer_coords_gd;
};