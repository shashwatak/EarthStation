importScripts('../sgp4/satellite.js');
importScripts('../utils/increment-time.js');
importScripts('console4Worker-worker.js');
var sat_table = {};

self.addEventListener('message', function(e) {
  if (e.data.cmd === 'propagate_orbit') {
    propagate_orbit_fraction(e.data.satrec, e.data.time, e.data.orbit_fraction);
  }
}, false);

var Re = 6378.137; //Earth Radium in KM

function propagate_orbit_fraction (satrec, time, orbit_fraction) {
  var ecf_coords_list = [];
  var mean_motion = satrec.no;

  var orbital_period = orbital_period_minutes(satrec);
  var resolution_of_path = 18;
  var time_step = orbital_period/resolution_of_path;
  var total_time_steps = resolution_of_path*orbit_fraction;
  var time_step_itor = 0;
  while (time_step_itor < total_time_steps){
    var time_offset = 60000*time_step*time_step_itor++;
    var current_time = increment_time.by_milliseconds(time, time_offset);
    var r_v = satellite.propagate(satrec, current_time.year, current_time.month, current_time.date_of_month, current_time.hour, current_time.minute, current_time.second);
    var position_eci = r_v[0];
    var gmst = satellite.gstime_from_date (current_time.year, current_time.month, current_time.date_of_month, current_time.hour, current_time.minute, current_time.second);
    var position_ecf = satellite.eci_to_ecf (position_eci, gmst);
    ecf_coords_list.push(position_ecf); //pushes list of coords for satellite 
	//satellite footprint function
	
  }
  //put propataion of satellite's motion in here
  self.postMessage({
    cmd      : 'path_update',
    sat_item : {
      satnum     : satrec.satnum,
      ecf_coords_list   : ecf_coords_list
    }
 });
};

function orbital_period_minutes (satrec){
  var mean_motion = satrec.no;
  var orbital_period = (1 / mean_motion) * 2 * Math.PI;
  return orbital_period;
}
