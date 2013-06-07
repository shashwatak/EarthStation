slug_motor = (function slug_motor () {
  SLUG_PREAMBLE = 0xFE;
  SLUG_OK_CODE  = 0xFA;
  SLUG_NG_CODE  = 0xFB;
  SLUG_GET_AZEL = 0xA0;
  SLUG_SET_PWM  = 0xFC;
  SLUG_EOM      = 0xFD;
  SLUG_EXPECTED_SIZE = 13;

  function move_az_to (connectionId, azimuth, callback){
    var az_pwm  = adjust_az_pwm (azimuth, motor_az);
    update_az_motors (connectionId, az_pwm, callback);
  };

  function move_el_to (connectionId, elevation, callback){
    var el_pwm  = adjust_el_pwm (elevation, motor_el);
    update_el_motors (connectionId, el_pwm, callback);
  };

  function adjust_az_pwm (track_rad, motor_rad){
    var diff = track_rad - motor_rad;
    if (track_rad < 0) { track_rad = 0; };
    if (diff > Math.PI) {
      // If arc_angle is more than 180,
      // don't go the long way around, flip it.
      diff = ( Math.PI * 2 ) - diff;
    };
    var diff_mag = Math.abs(diff);
    var diff_sign = 1;
    if (diff < 0) { diff_sign = -1; }
    var new_pwm = 0;
    if (diff_mag > Math.PI/10) {
      new_pwm = diff_sign*50;
    }
    else if (diff_mag > Math.PI/20) {
      new_pwm = diff_sign*40;
    }
    else if (diff_mag > Math.PI/60) {
      new_pwm = diff_sign*30;
    }
    else if (diff_mag > Math.PI/180) {
      new_pwm = diff_sign*20;
    };
    return new_pwm;
  };

  function adjust_el_pwm (track_rad, motor_rad){
    if (track_rad < 0) { track_rad = 0; };
    var diff = track_rad - motor_rad;
    var diff_mag = Math.abs(diff);
    var diff_sign = 1;
    if (diff > 0) { diff_sign = -1; };
    var new_pwm = 0;
    if (diff_mag > Math.PI/10) {
      new_pwm = diff_sign*50;
    }
    else if (diff_mag > Math.PI/20) {
      new_pwm = diff_sign*40;
    }
    else if (diff_mag > Math.PI/60) {
      new_pwm = diff_sign*30;
    }
    else if (diff_mag > Math.PI/180) {
      new_pwm = diff_sign*20;
    }
    return new_pwm;
  }

  function update_az_motors (connectionId, az_pwm, callback){
    var pwm_str = Math.abs(az_pwm).toString(10);
    while (pwm_str.length < 3){
       pwm_str = '0' + pwm_str;
    }
    var dir = 'r';
    if (az_pwm < 0) { dir = 'l'; }
    pwm_str = dir + pwm_str;
    send_pwn_command (connectionId, pwm_str, callback);
  }

  function update_el_motors (connectionId, el_pwm, callback){
    var pwm_str = Math.abs(el_pwm).toString(10);
    while (pwm_str.length < 3){
       pwm_str = '0' + pwm_str;
    }
    var dir = 'u';
    if (el_pwm < 0) { dir = 'd'; }
    pwm_str = dir + pwm_str;
    console.log("pwm: " + pwm_str);
    send_pwn_command (connectionId, pwm_str, callback);
  }

  function stop_motors (connectionId, callback){
    update_az_motors (connectionId, 0);
    update_el_motors (connectionId, 0, callback);
  }

  function get_motor_status(connectionId, callback) {
    var outgoing_packet_size = 3;
    var serial_out_data = new ArrayBuffer(outgoing_packet_size);
    var serial_out_view = new Uint8Array(serial_out_data); // access Array Buffer as 8bit bytes
    var serial_out_itor = 0;
    serial_out_view[serial_out_itor++] = SLUG_PREAMBLE; // 1 byte preamble
    serial_out_view[serial_out_itor++] = SLUG_GET_AZEL; // Get AzEl from motor
    serial_out_view[serial_out_itor++] = SLUG_EOM;
    send_output_data (connectionId, serial_out_data, callback);
  }

  function send_pwn_command (connectionId, pwm_str, callback) {
    var pwm_bytes = str2ab (pwm_str);
    var pwm_view = new Uint8Array(pwm_bytes);
    var outgoing_packet_size = 7;
    var serial_out_data = new ArrayBuffer(outgoing_packet_size);
    var serial_out_view = new Uint8Array(serial_out_data); // access Array Buffer as 8bit bytes
    var serial_out_itor = 0;
    serial_out_view[serial_out_itor++] = SLUG_PREAMBLE; // 1 byte preamble
    serial_out_view[serial_out_itor++] = SLUG_SET_PWM;
    var pwm_itor = 0;
    while (pwm_itor < pwm_view.length) {
      serial_out_view[serial_out_itor++] = pwm_view[pwm_itor++];
    }
    serial_out_view[serial_out_itor++] = SLUG_EOM;
    send_output_data (connectionId, serial_out_data, callback);
  }

  function get_motor_response (connectionId, num_bytes_expected, callback) {
    // This function is an implementation of a blocking serial read.
    // the chrome.serial read is non-blocking and asynchronous.
    // By making the callback recursive (common practice),
    // the serial read will "block" until the expected number
    // of bytes are read.
    // Otherwise, serial reader only returns as many bytes are
    // in the receive buffer, and won't wait for the bytes to
    // arrive first.
    var bytes_read = 0;
    var bytes_remaining = (num_bytes_expected - bytes_read);
    var incoming_bytes = []; // Store all the incoming bytes
    var blocking_serial_read_callback = function (read_info) {
      // I'm defining the callback locally, so that
      // locals bytes_read, num_bytes_expected, incoming_bytes
      // are accessible. If bytes_read is less than num_bytes_expected
      // then read again, until num_bytes_expected == bytes_read
      // Store all incoming_bytes for parsing.
      if (read_info.bytesRead === 0) {
        // Nothing was read, happens sometimes.
        // Just try again.
        chrome.serial.read (connectionId, bytes_remaining, blocking_serial_read_callback);
      }
      else {
        // Some number of bytes were read.
        bytes_read += read_info.bytesRead;
          // keep track of number of bytes read
        bytes_remaining = (num_bytes_expected - bytes_read);
          // also keep track of how many are left to go
        var serial_in_view = new Uint8Array(read_info.data);
        for (var i = 0; i < read_info.data.byteLength; i++) {
          incoming_bytes.push(serial_in_view[i]);
            // Persist all the read bytes, otherwise
            // next iteration will overwrite them, and we
            // will lose data.
        }
        if (bytes_remaining > 0) {
          // There are still bytes left to read
          chrome.serial.read (connectionId, bytes_remaining, blocking_serial_read_callback);
        }
        else if (serial_in_view[serial_in_view.length-1] !== SLUG_EOM) {
          // All the expected bytes have been read, but
          // apparently there is more than we expected, since the
          // data isn't properly EOM ended
          num_bytes_expected++; // increment expected value
          bytes_remaining = (num_bytes_expected - bytes_read);
            // update bytes remaining
          chrome.serial.read(connectionId, bytes_remaining, blocking_serial_read_callback);
            // Read the remaining bytes
        }
        else {
          // We have read all the expected bytes, and the EOM
          // so we stop reading and move onto the parsing phase.
          if (callback) { callback(incoming_bytes); }
        }
      }
    };
    // Begin the reading process.
    chrome.serial.read (connectionId, num_bytes_expected, blocking_serial_read_callback);
  };

  function send_output_data (connectionId, send_bytes, callback) {
    var motor_write_callback = function (write_info) {
      var bytes_written = write_info.bytesWritten;
      // xFE xFA 'a' '1' '0' '2' '3' 'e' '1' '0' '2' '3' xFD
      get_motor_response (connectionId, SLUG_EXPECTED_SIZE, function (read_data) {
        if (callback){
          parse_motor_response (read_data, callback);
        };
      });
    };
    chrome.serial.write(connectionId, send_bytes, motor_write_callback);
  };

  function parse_motor_response (incoming_bytes, callback) {
    // Read the packet bytes and determine
    // what the motor actually said.

    var motor_status = false;
    var motor_az = 0;
    var motor_el = 0;
    var response_itor = 0;
    var incoming_length = incoming_bytes.length;

    while (response_itor < incoming_length){
      // Locate the Preamble.
      if (incoming_bytes[response_itor++] === SLUG_PREAMBLE){
        // Correct preamble, break and start parsing
        break;
      };
    };
    if (response_itor < incoming_length){
      // OK, the preamble was found, and we didn't go out of bounds
      if (incoming_bytes[response_itor] === SLUG_OK_CODE) {
        // Valid OK Packet
        motor_status = true;
      }
      else if (incoming_bytes[response_itor] === SLUG_NG_CODE){
        // Valid NG Packet
        motor_status = false;
      };
      response_itor++;
      // caught up to correct preamble, or walked off the array.
      while (response_itor < incoming_length){
        // Haven't walked off the edge, so start parsing.
        function parse_angle_from_volts (){
          var voltage = [];
          while (incoming_bytes[response_itor] >= '0'.charCodeAt(0) &&
                 incoming_bytes[response_itor] <= '9'.charCodeAt(0)) {
            if (incoming_bytes[response_itor] !== 0){
              voltage.push(String.fromCharCode(incoming_bytes[response_itor++]));
            };
            var angle_string = voltage.join("");
            var angle = parseInt(angle_string, 10) * 2 * Math.PI / 1024;
          };
          return angle;
        };
        if (incoming_bytes[response_itor] === 'a'.charCodeAt(0)) {
          response_itor++;
          motor_az = parse_angle_from_volts();
        }
        else if (incoming_bytes[response_itor] === 'e'.charCodeAt(0)) {
          response_itor++;
          motor_el = parse_angle_from_volts();
        }
        response_itor++;
      };
    };
    var motor_data = {
      azimuth : motor_az,
      elevation : motor_el,
      status : motor_status
    };
    if (callback) { callback (motor_data); };
  };

  var str2ab = function(str) {
    var buf=new ArrayBuffer(str.length);
    var bufView=new Uint8Array(buf);
    for (var i=0; i<str.length; i++) {
      bufView[i]=str.charCodeAt(i);
    }
    return buf;
  };

  var ab2str=function(buf) {
    var bufView=new Uint8Array(buf);
    var unis=[];
    for (var i=0; i<bufView.length; i++) {
      unis.push(bufView[i]);
    }
    return String.fromCharCode.apply(null, unis);
  };

  return {
    stop_motors : stop_motors,
    move_az_to  : move_az_to,
    move_el_to  : move_el_to,
    get_status  : get_motor_status
  };

})();
