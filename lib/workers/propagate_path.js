importScripts('../sgp4/satellite.js');
importScripts('../utils/increment-time.js');
importScripts('console4Worker-worker.js');
var sat_table = {};

var observer_coords_gd = [0,0,0];
var observer_coords_ecf = [0,0,0];

self.addEventListener('message', function(e) {
  if (e.data.cmd === 'propagate_orbit') {
	  // event listener is here
    propagate_orbit_fraction(e.data.satrec, e.data.time, e.data.orbit_fraction);
  }
  else if (e.data.cmd === 'observer_location') {
    observer_coords_gd = e.data.observer_coords_gd;
    observer_coords_ecf = satellite.geodetic_to_ecf (observer_coords_gd);
	 //console.log("location set in propagate_path(): observer_coords_gd="+observer_coords_gd);
  }
}, false);

var Re = 6378.137; //Earth Radius in KM

// Called in an event listener, which is called in the Worker Manager
function propagate_orbit_fraction (satrec, time, orbit_fraction) {
  var ecf_coords_list = [];
  var lookangles_list = [];
  var gmst_list = [];

  var mean_motion = satrec.no;
  
  var orbital_period = orbital_period_minutes(satrec);
  var resolution_of_path = 480;
  var time_step = orbital_period/resolution_of_path;
  var total_time_steps = resolution_of_path*orbit_fraction;
  var time_step_itor = 0;
  
  while (time_step_itor < total_time_steps){
    var time_offset = 60000*time_step*time_step_itor++;
    var current_time = increment_time.by_milliseconds(time, time_offset);
    var r_v = satellite.propagate(satrec, current_time.year, current_time.month, current_time.date_of_month, current_time.hour, current_time.minute, current_time.second);
    var position_eci = r_v[0];
    var gmst = satellite.gstime_from_date (current_time.year, current_time.month, current_time.date_of_month, current_time.hour, current_time.minute, current_time.second);
    
	 gmst_list.push(gmst);
	 
	 var position_ecf = satellite.eci_to_ecf (position_eci, gmst);
    ecf_coords_list.push(position_ecf); //pushes list of coords for satellite 
	 
	 var position_la	= satellite.ecf_to_look_angles(observer_coords_gd, position_ecf);
	 lookangles_list.push(position_la);
	 
	 //console.log("position_ecf="+position_ecf);
	 //console.log("position_la="+position_la);
	 
	 //satellite footprint function
	
  }

  self.postMessage({
    cmd      : 'path_update',
    sat_item : {
      satnum     			: satrec.satnum,
      ecf_coords_list   : ecf_coords_list,
		lookangles_list	: lookangles_list,
		gmst_list			: gmst_list
    }
 });
};

function orbital_period_minutes (satrec){
  var mean_motion = satrec.no;
  var orbital_period = (1 / mean_motion) * 2 * Math.PI;
  return orbital_period;
};