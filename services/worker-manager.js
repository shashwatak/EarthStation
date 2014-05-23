/*
 * EarthStation v0.3
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/EarthStation
 * License: MIT
 */

function WorkerManager (){
  // AngularJS Service, provides those that depend on it with
  // the ability to use the Web Workers.
  var track_sat_worker = new Worker('../lib/workers/track_sat.js');
  track_sat_worker.addEventListener('message', worker_update);
    // This worker is responsible for live tracking satellites.

  var propagate_path_worker = new Worker('lib/workers/propagate_path.js');
  propagate_path_worker.addEventListener('message', worker_update);
    // This worker is responsible for propagating a satellite path over a time span

  var import_tles = new Worker('lib/workers/import_tles.js');
  import_tles.addEventListener('message', worker_update);
    //

  // The users of this service register callbacks with an id 'cmd'
  // they are kept in here. When a message is received, this service
  // fires all registered callbacks keyed with e.data.cmd.
  var callbacks_table = {};
  function worker_update (e){2
    if( console4Worker.filterEvent(e) ) { console.log(e.data.data.data[0]);   }
      //  this catches the console.log statements from the Worker threads,
      //  which don't have access to console.log.
    else {
      if (callbacks_table[e.data.cmd]){
        var callbacks = callbacks_table[e.data.cmd];
        var num_callbacks = callbacks.length;
        var callback_itor = 0;
        while (callback_itor < num_callbacks){
          // Fire all callbacks for this cmd.
          callbacks[callback_itor++](e.data);
        };
      };
    };
  };

  function register_command_callback (cmd, callback) {
    if (!callbacks_table[cmd]){
      // First time, make new list.
      callbacks_table[cmd] = [callback];
    }
    else {
      // Add a callback for a given command
      callbacks_table[cmd].push(callback);
    };
  };

  function add_satellite (satrec) {
    track_sat_worker.postMessage({cmd : 'add_satellite', satrec : satrec});
  };

  function update_sats (time) {
    track_sat_worker.postMessage({cmd : 'update_sats', time : time});
  };

  function remove_satellite (satnum) {
    track_sat_worker.postMessage({cmd : 'remove_satellite', satnum : satnum});
  };

  function set_observer_location (observer_longitude, observer_latitude, observer_altitude) {
    var deg2rad = Math.PI / 180;
    var observer_coords_gd = [observer_longitude*deg2rad,
                              observer_latitude*deg2rad,
                              observer_altitude];
    track_sat_worker.postMessage({cmd : 'observer_location', observer_coords_gd : observer_coords_gd});
  };

  function propagate_orbit (satrec, time, orbit_fraction) {
    propagate_path_worker.postMessage({
      cmd : 'propagate_orbit',
      time : time,
      satrec : satrec,
      orbit_fraction : orbit_fraction
    });
  };

  function update_tles (read_file){
    import_tles.postMessage({cmd : 'update_tles', read_file : read_file})
  };

  return {
    register_command_callback : register_command_callback,
    add_satellite : add_satellite,
    propagate_orbit : propagate_orbit,
    update_sats : update_sats,
    update_tles : update_tles,
    remove_satellite : remove_satellite,
    set_observer_location : set_observer_location
  };
};
