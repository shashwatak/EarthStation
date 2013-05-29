importScripts('../sgp4/satellite.js');

self.addEventListener('message', function(e) {
  if (e.data) {
    var satrec = e.data;
    var ecf_coords_list = propagate_current_orbit(satrec);
    self.postMessage({  cmd      : 'update',
                        sat_item :
                        { satnum     : satrec.satnum,
                          ecf_coords_list   : ecf_coords_list
                        }
                     });
  }
}, false);

function orbital_period_minutes (satrec){
  var mean_motion = satrec.no;
  var orbital_period = (1 / mean_motion) * 2 * Math.PI;
  return orbital_period;
}

function propagate_current_orbit (satrec) {
  var satellite_ecf_coords_list = [];
  var mean_motion = satrec.no;

  var orbital_period = orbital_period_minutes(satrec);
  var today = new Date();
  var year = today.getUTCFullYear();
  var month = today.getUTCMonth() + 1;
  var date_of_month = today.getUTCDate();
  var hour = today.getUTCHours();
  var minute = today.getUTCMinutes();
  var second = today.getUTCSeconds();
  var itor = 0;
  while (itor < orbital_period){
    var current_minute = minute + itor;
    var current_hour = hour;
    var current_date_of_month = date_of_month;

    if (current_minute >= 60) {
        current_minute -= 60;
        current_hour += 1;
    }
    else if (current_minute < 0) {
        current_minute += 60;
        current_hour -= 1;
    }

    if (current_hour >= 24) {
        current_hour -= 24;
        current_date_of_month += 1;
    }
    else if (current_hour < 0) {
        current_hour += 24;
        current_date_of_month -= 1;
    }
    var r_v = satellite.propagate(satrec, year, month, current_date_of_month, current_hour, current_minute, second);
    var position_eci = r_v[0];
    var gmst = satellite.gstime_from_date (year, month, current_date_of_month, current_hour, current_minute, second);
    var position_ecf = satellite.eci_to_ecf (position_eci, gmst);
    satellite_ecf_coords_list.push(position_ecf);
    itor++;
  }
  return satellite_ecf_coords_list;
};
