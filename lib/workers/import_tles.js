importScripts('../sgp4/satellite.js');
importScripts('console4Worker-worker.js');

function import_satellites(read_file){
  if (read_file){
    var tle_file_broken = read_file.split('\n');
    var num_tle_lines = tle_file_broken.length;
    var tle_itor = 0;
    while (tle_itor < num_tle_lines) {
    var tle_name   = tle_file_broken[tle_itor].substring(2);
    var tle_line_1 = tle_file_broken[tle_itor+1];
    var tle_line_2 = tle_file_broken[tle_itor+2];
    if (tle_line_1 && tle_line_2){
      var satrec = satellite.twoline2satrec(tle_line_1, tle_line_2);
      self.postMessage (
        { cmd         : 'tles_update',
          sat_item    :
          { name          : tle_name,
            uplink_freq   : "--",
            downlink_freq : "--",
            uplink_mode   : "--",
            downlink_mode : "--",
            selected      : false,
            tle_line_1    : tle_line_1,
            tle_line_2    : tle_line_2,
            satrec        : satrec,
            satnum        : satrec.satnum
          },
        });
    }
    tle_itor += 3;
    }
  }
  self.postMessage ({cmd : 'done_import'});
}

self.addEventListener('message', function(e) {
  if (e.data.cmd == 'update_tles') {
    import_satellites(e.data.read_file);
  }
}, false);
