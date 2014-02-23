/*
 * EarthStation v0.3
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/EarthStation
 * License: MIT
 */
 
 /*
  *2/22/2014 - Chrome.serial API was updated and the functions changed. 
  *Make sure to review and learn the new functions from the API
  * portion of the chrome interface. 
  *
  */

icom_910h = (function() {
  // ICOM IC910H Function Codes
  var ICOM_PREAMBLE       = 0xFE;
  var ICOM_EOM            = 0xFD;
  var ICOM_NG_CODE        = 0xFA;
  var ICOM_OK_CODE        = 0xFB;
  var CONTROLLER_ADDRESS  = 0xE0;
  var ICOM_ADDRESS        = 0x60;
  var ICOM_FREQ_POLL      = 0x03;
    // THIS DOENS'T MATCH THE MANUAL!
    // The IC 910H Manual is wrong!
  var ICOM_FREQ_SET       = 0x05;
    // THIS DOENS'T MATCH THE MANUAL!
    // The IC 910H Manual is wrong!
  var ICOM_MAINSUB_CMD    = 0x07;
  var ICOM_MAIN_SCMD      = [0xD0];
  var ICOM_SUB_SCMD       = [0xD1];

  var ICOM_BASE_MSG_SIZE  = 6; // Smallest message size

  function set_icom_frequency (connectionId, frequency, callback){
    var BCD_array = decimal_to_BCD_array(frequency);
      // Convert decimal to BCD number
    var serial_out_data = build_icom_packet (ICOM_FREQ_SET, BCD_array);
      // Serialize bytes from command hex and data array
	  console.log("SETTING ICOM FREQ This is the data: " + serial_out_data);
	  console.log("This is the callback: " + callback);
    send_icom_command (connectionId, serial_out_data, callback);
	if(callback) {console.log("SET WORKED");};
	
	
      // Encapsulated SerialWrite
  };

  function get_icom_frequency (connectionId, callback) {
    // This function gets the current operating frequency
    // Use the callback to use the data
    var serial_out_data = build_icom_packet (ICOM_FREQ_POLL, []);
      // Serialize bytes from command hex and data array
    send_icom_command (connectionId, serial_out_data, callback);
	//if(callback) {console.log("SET WORKED");};
      // Encapsulated SerialWrite
  };

  function set_icom_sub_band (connectionId, callback) {
    // This function sets the ICOM to Sub Band operation mode
    var serial_out_data = build_icom_packet(ICOM_MAINSUB_CMD, ICOM_SUB_SCMD);
      // Serialize bytes from command hex and data array
    send_icom_command (connectionId, serial_out_data, callback);
	//if(callback) {console.log("SET WORKED");};
      // Encapsulated SerialWrite
  };

  function set_icom_main_band (connectionId, callback) {
    // This function sets the ICOM to Main Band operation mode
    var serial_out_data = build_icom_packet(ICOM_MAINSUB_CMD, ICOM_MAIN_SCMD);
      // Serialize bytes from command hex and data array
    send_icom_command (connectionId, serial_out_data, callback);
	//if(callback) {console.log("SET WORKED");};
      // Encapsulated SerialWrite
  };

  function build_icom_packet (hex_command, hex_data) {
    // This function serializes the bytes that we will
    // send to the radio, based on the hex_command and
    // hex_data parameters
    var outgoing_packet_size = ICOM_BASE_MSG_SIZE;
    outgoing_packet_size += hex_data.length;
      // The base size, plus the excess data bytes
    var serial_out_data = new ArrayBuffer(outgoing_packet_size);
    var serial_out_view = new Uint8Array(serial_out_data); // access Array Buffer as 8bit bytes
    var serial_out_itor = 0;
    serial_out_view[serial_out_itor++] = ICOM_PREAMBLE; // 2 byte preamble
    serial_out_view[serial_out_itor++] = ICOM_PREAMBLE; // 2 byte preamble
    serial_out_view[serial_out_itor++] = ICOM_ADDRESS   // Xceiver Addr
    serial_out_view[serial_out_itor++] = CONTROLLER_ADDRESS;  // Ctrlr Addr
	console.log("HEX COMMAND IS " + hex_command);
    serial_out_view[serial_out_itor++] = hex_command;   // the command byte
    var hex_data_itor = 0;
    while (hex_data_itor < hex_data.length) {
      // If there is a subcommand or any data fields bytes,
      // they are packed in here
      serial_out_view[serial_out_itor++] = hex_data[hex_data_itor++];
    }
    serial_out_view[serial_out_itor] = ICOM_EOM;      // EOM

    for (var i = 0; i < serial_out_view.length; i++) {
      // print to the console for debugging
      console.log ("serial_out_view[" + i + "]: " + serial_out_view[i].toString(16));
    }
    return serial_out_data;
  };

  function send_icom_command (connectionId, serial_out_data, callback) {
    // Encapsulating the chrome serial write
    if (connectionId > 0){
      // This function is a non-blocking serial write.
      // It is much simpler than the serial read, because
      // all we have to do is send the properly formatted data.
      var icom_write_callback = function (write_info) {
        var bytes_written = write_info.bytesWritten;
        //console.log ("bytes written: " + bytes_written);
        get_icom_response (connectionId, ICOM_BASE_MSG_SIZE, callback);
          // Get the ACK/NACK or the response to our sent command
      };
      chrome.serial.send(connectionId, serial_out_data, icom_write_callback);
	  console.log("SENT COMMAND" + serial_out_data);
    }
    else {
      console.log("Can't send anything, radio is closed");
    }
  }

  function get_icom_response (connectionId, num_bytes_expected, callback) {
    // This function is an implementation of a blocking serial read.
    // the chrome.serial read is non-blocking and asynchronous.
    // By making the callback recursive (common practice),
    // the serial read will "block" until the expected number
    // of bytes are read.
    // Otherwise, serial reader only returns as many bytes are
    //  in the receive buffer, and won't wait for the bytes to
    // arrive first.
    // NOTE: it won't stop running until the expected number of bytes is read.
    // NOTE: Does not block main thread (it is asynchronous), just
    // won't stop until expected number of bytes is read
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
        //chrome.serial.read (connectionId, bytes_remaining, blocking_serial_read_callback);
		chrome.serial.onReceive.addListener(blocking_serial_read_callback);
      }
      else {
        // Some number of bytes were read.
        bytes_read += read_info.bytesRead;
          // keep track of number of bytes read
        bytes_remaining = (num_bytes_expected - bytes_read);
          // also keep track of how many are left to go
        //console.log("expecting: " + bytes_remaining);
        //console.log("bytes read this time: " + read_info.bytesRead);
        //console.log("total bytes read: " + bytes_read);
        var serial_in_view = new Uint8Array(read_info.data);
        for (var i = 0; i < read_info.data.byteLength; i++) {
          console.log ("serial_in_view[" + i + "]: " + serial_in_view[i].toString(16));
            // debug dump
          incoming_bytes.push(serial_in_view[i]);
            // Persist all the read bytes, otherwise
            // next iteration will overwrite them, and we
            // will lose data.
        }
        if (bytes_remaining > 0) {
          // There are still bytes left to read
          //chrome.serial.read (connectionId, bytes_remaining, blocking_serial_read_callback);
		  chrome.serial.onReceive.addListener(blocking_serial_read_callback);
        }
        else if (serial_in_view[serial_in_view.length-1] !== ICOM_EOM) {
          // All the expected bytes have been read, but
          // apparently there is more than we expected, since the
          // data isn't properly EOM ended
          console.log("No EOM, expect one more byte");
          num_bytes_expected++; // increment expected value
          bytes_remaining = (num_bytes_expected - bytes_read);
            // update bytes remaining
         // chrome.serial.read(connectionId, bytes_remaining, blocking_serial_read_callback);
		 chrome.serial.onReceive.addListener(blocking_serial_read_callback);
            // Read the remaining bytes
        }
        else {
          // We have read all the expected bytes, and the EOM
          // so we stop reading and move onto the parsing phase.
          //console.log("Yes EOM, expect NO more bytes");
          var parse_results = parse_icom_response (incoming_bytes);
          if (!parse_results) {
            // Didn't get the response we were looking for.
            // Start over, call this function again from scratch.
            console.log("that wasn't the packet we wanted, keep reading")
            get_icom_response (connectionId, ICOM_BASE_MSG_SIZE, callback);
          }
          else {
            // Our blocking read has come to an end, if the
            // callback exists, call it. We are done here!
            console.log ("Read Finished: " + parse_results);
            if (callback) { callback(parse_results); }
          }
        }
      }
    };
    // Begin the reading process.
	//reads after every call to get_icom_response
    //chrome.serial.read (connectionId, num_bytes_expected, blocking_serial_read_callback);
	chrome.serial.onReceive.addListener (blocking_serial_read_callback);
  };

  function parse_icom_response (incoming_bytes) {
    // Read the packet bytes and determine
    // what the radio actually said
    var response_itor = 0;
    if (incoming_bytes[response_itor++] !== ICOM_PREAMBLE ||
        incoming_bytes[response_itor++] !== ICOM_PREAMBLE)
    {
      // Incorrect preamble, ignore.
      console.log ("Sketch Preamble");
      return false;
    }
    if (incoming_bytes[response_itor++] !== CONTROLLER_ADDRESS ||
        incoming_bytes[response_itor++] !== ICOM_ADDRESS)
    {
      // Not from ICOM or not to Controller, ignore.
      console.log ("Sketch Address");
      return false;
    }
    if (incoming_bytes[response_itor] === ICOM_OK_CODE) {
      // Valid OK Packet
      console.log("OK!");
      return true;
    }
    if (incoming_bytes[response_itor] === ICOM_NG_CODE){
      // Valid NG Packet
      console.log("Not OK! =( ");
      return true;
    }
    if (incoming_bytes[response_itor] === ICOM_FREQ_POLL){
      response_itor++;
      var BCD_array = [];
      while(response_itor < incoming_bytes.length) {
        // If there is a Data segment in the packet, it is from here
        // until the EOM byte
        if (incoming_bytes[response_itor] === ICOM_EOM) {
          // the EOM byte is reached, data segment is over,
          // if it existed at all
          break;
        }
        // save the data segment bytes
        BCD_array.push(incoming_bytes[response_itor++]);
      }
    }
    var decimal = BCD_array_to_decimal (BCD_array);
      // deserialize BDC data to a decimal
    console.log ("bcd to decimal: " + decimal);
    return decimal;
  };

  function BCD_array_to_decimal (BCD_array) {
    var decimal_str = "";
    for (var bcd_itor = 0; bcd_itor < BCD_array.length; bcd_itor++) {
      //console.log ("BCD_array["+bcd_itor+"] as hex: 0x" + BCD_array[bcd_itor].toString(16));
      if (BCD_array[bcd_itor] >= 0x10) {
        // If the BCD is two digits, then prepend to string
        decimal_str = BCD_array[bcd_itor].toString(16) + decimal_str;
          // Coercing javascript into reading the hex literally as a decimal
      }
      else {
        // If the BCD is one digit, prepend an extra 0, then the digit
        decimal_str = "0" + BCD_array[bcd_itor].toString(16) + decimal_str;
          // Coercing javascript into reading the hex literally as a decimal
      }
    }

    var decimal = parseInt(decimal_str, 10);
    return decimal;
  };

  function decimal_to_BCD_array (decimal) {
    // BCD data encodes a decimal number as a hex value.
    // For example, decimal d45 is x45, d10 is x10, etc.
    // The purpose of this is, of the 256 possible values
    // of a byte, 100 of them can represent 0 to 99, and
    // the remaining can represent control values, like
    // EOM, Preamble, radio Functions, etc.
    //console.log ("decimal to bcd: ", decimal);
    var decimal_str = decimal.toString();
    var str_len = decimal_str.length;
    var NUM_DIGITS_IN_ICOM_BCD_DATA = 10;
    if (str_len < NUM_DIGITS_IN_ICOM_BCD_DATA) {
      while (str_len < NUM_DIGITS_IN_ICOM_BCD_DATA) {
        // prepend 0s until the decimal string is 10 chars
        decimal_str = "0" + decimal_str;
        str_len++;
      }
    }
    //console.log ("decimal_str: " + decimal_str);
    var BCD_array = [];
    for (var dec_str_itor = str_len - 2;
          dec_str_itor >= 0;
          dec_str_itor -= 2)
    {
      var BCD_str = "0x"+decimal_str.substring(dec_str_itor, dec_str_itor + 2);
        // Coercing javascript into reading the decimal literally as a hex
      BCD_array.push(parseInt(BCD_str, 16));
    }
    return BCD_array;
  };

  function get_main_frequency (connectionId, callback) {
    set_icom_main_band(connectionId, function (result){
      if (result){
        get_icom_frequency (connectionId, callback);
      };
    });
  };

  function get_sub_frequency (connectionId, callback) {
    set_icom_sub_band(connectionId, function (result){
      if (result){
        get_icom_frequency (connectionId, callback);
      };
    });
  };

  function set_main_frequency (connectionId, frequency, callback) {
    console.log("SETTING FREQUENCY, ON TOP");
    set_icom_main_band (connectionId, function (result){
      if (result !== false){
        set_icom_frequency (connectionId, frequency, callback);
      };
    });
  };

  function set_sub_frequency (connectionId, frequency, callback) {
    set_icom_sub_band (connectionId, function (result){
      if (result !== false){
        set_icom_frequency (connectionId, frequency, callback);
      };
    });
  };

  return {
    get_main_frequency : get_main_frequency,
    get_sub_frequency : get_sub_frequency,
    set_main_frequency : set_main_frequency,
    set_sub_frequency : set_sub_frequency,
  };

})();
