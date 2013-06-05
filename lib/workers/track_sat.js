importScripts('../sgp4/satellite.js');
importScripts('console4Worker-worker.js');

var deg2rad = Math.PI / 180;
var observer_coords_geodetic = [(-122.0308)*deg2rad, (36.9613422)*deg2rad, 1];

var sat_table = {};

function track_sats (time) {
  for (var satnum in sat_table){
    if (sat_table.hasOwnProperty(satnum)) {
      var satrec = sat_table[satnum];
      var gmst = satellite.gstime_from_date (time.year, time.month, time.date_of_month, time.hour, time.minute, time.second);
      var r_v = satellite.propagate(satrec, time.year, time.month, time.date_of_month, time.hour, time.minute, time.second);
      var position_eci = r_v[0];
      var position_ecf = satellite.eci_to_ecf (position_eci, gmst);
      var look_angles = satellite.ecf_to_look_angles (observer_coords_geodetic, position_ecf);
      var position_gd = satellite.eci_to_geodetic (position_eci, gmst);


      var sat_item = {
        satnum        : satrec.satnum,
        satrec        : satrec,
        look_angles   : look_angles,
        position_ecf  : position_ecf,
        position_gd   : position_gd,
        position_eci  : position_eci,
        gmst          : gmst
      };
      self.postMessage ({
        cmd         : 'live_update',
        sat_item    : sat_item
      });
    }
  }
}

self.addEventListener('message', function(e) {
  if (e.data.cmd === 'add_satellite') {
    var satrec = e.data.satrec;
    sat_table[satrec.satnum] = satrec;
  }
  else if (e.data.cmd === 'remove_satellite') {
    var satnum = e.data.satnum;
    sat_table[satnum] = undefined;
    self.postMessage ({
      cmd         : 'sat_removed',
      satnum      : satnum
    });
  }
  else if (e.data.cmd === 'update_sats') {
    track_sats (e.data.time);
  }
}, false);
