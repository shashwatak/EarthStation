EarthStation (v0.2)
===================
This software is part of a larger project, to build a working
Ground Station for Satellite Communication as part of the Amateur Radio Service at UCSC.

Introduction
------------
The goals of this software are to make satellite radio contacts:
- Point an antenna at an orbiting satellite
- Add Doppler correction to radio communications
- Provide the user with a display of what's going on

We considered many different approaches to building this app before settling on making a Google Chrome Packaged App. High on our list of priorities was cross OS support, and Chrome is available on all major OSs. The Packaged App approach allows us to access USB and COM ports, to manipulate external hardware. Further, a Packaged App is installed on the user's computer, which means it can run completely offline. Finally, the relatively new `performance.now()` function gives us microsecond precise timing.

###ARS Ground Station Team

**Jason Ragland** (AG6RM)
Team Lead Antenna Design

**Andrew Martino** (KJ6RFK)
Power, Motor, and Mechanical Systems

**Sander Middour** (KK6BSI)
Digital Motor Control

**Shashwat Kandadai** (KK6BSH)
Tracking Software

###Mentors
**Professor Steve Petersen** (AC6P)

**Professor John Vesecky** (AE6TL)

**Paul Naud**

###Further Acknowledgments
Steve Petersen

TS Kelso

http://www.aerotwist.com/

stackoverflow.com

Major TODOs
===========
####Architecture
-   Utilize localStorage to preserve environment between sessions.

####Logic
-   AOS, TCA, LOS calculations.

####UI
-   Sorted, filterable, collapsible, hide-able, list of sats.
-   Tooltips with opentip.
-   ThreeJS mousehover detection.
-   Geodetic-Normalized and Actual sat paths display.
-   Stargazer mode (upwards view of Az/El).
    -   Displays motors heading.
-   Get all of AC6Ps satellite contact information out of his database.

####Pull up from Sandbox
-   Radio control

How To Run
----------
###Build The Project
1. Clone this Git repo.
2. Run `make` in the 'EarthStation' directory.

###Run The App
Eventually, the app will be available on the Google Chrome Web Store. For now:

1. Install the Google Chrome web browser.
2. In Google Chrome, navigate to "chrome://extensions".
3. Set your Chrome to "Develeoper Mode", by checking the box.
4. Select "Load Unpacked Extension", and choose the 'EarthStation' directory.

Once you have the app running, go to the sidebar on the right and select "Import 3LE File", I've provided one in this repo called "test_sat_tles.txt".

Frameworks
-----------

* [Angular.js](http://angularjs.org/)
* [satellite.js](https://github.com/shashwatak/satellite-js)
* [three.js](http://threejs.org/) (with a little jquery)
* [d3.js](http://d3js.org/)

Hardware Architecture
-----------------
The Tracking Software runs on a Computer, and connects to an external Motor Controller. The Computer sends the Motor Controller aiming directions. The Motor Controller then sends Power to the Motors to move the Antenna. The Computer also connects to the Radio and corrects the transmission frequencies for the Doppler effect.

![Hardware Block Diagram](http://i.imgur.com/YdwXmBB.gif Hardware Block Diagram)

Software Architecture
----------------------
Ideally, we make use of WebWorkers to offload the mathematically intense logic to separate threads.

![Proposed Data Flow](http://i.imgur.com/gxiF07h.gif Proposed Data Flow)

![Chrome Data Flow](http://i.imgur.com/XuIy5L9.gif Chrome Data Flow)

Serial Hardware Interfacing
---------------------
With the goal of keeping the motor control logic as modular as possible, one can add motor control logic to this project with relative ease.

The hardware logic should be a self executing function that returns the following functions in a uniquely named global value:
```javascript
your_global = (function(){
  /* Motor control logic */

  function stop_motors (connectionId, callback) {
    /*
      Serial reading and writing needed to stop the motors goes here
    */
    callback(motor_data); // OPTIONAL CALLBACK
  }
  function move_az_to (connectionId, azimuth, callback) {
    /*
      Serial reading and writing needed to move az motors to desired azimuth.
    */
    callback(motor_data); // OPTIONAL CALLBACK
  }
  function move_el_to (connectionId, elevation, callback) {
    /*
      Serial reading and writing needed to move el motors to desired elevation
    */
    callback(motor_data); // OPTIONAL CALLBACK
  }
  function get_motor_status (connectionId, callback) {
    /*
      Serial reading and writing needed to poll the motors for their current headings, without changing their course
    */
    callback(motor_data); // REQUIRED CALLBACK
  }

return {
  stop_motors : stop_motors,
  move_az_to  : move_az_to,
  move_el_to  : move_el_to,
  get_status  : get_motor_status
};
})();
```

You must execute the callback at the end of get_motor_status(), its parameter, motor_data, should be a single object of the form:
```javascript
callback ({ // callback should be passed an object like this
azimuth : motor_az,
elevation : motor_el,
status : motor_status
});
```

This will return the expected data to the rest of the application.

Be sure to update the following part of the Motors Angular service, in services.js:
```javascript
var supported_motors = {
'Slug Motor' : {
  functions : slug_motor, // This is the global variable that the motor control logic should return
  bitrate : 57600 // specify the optimal bitrate
},
'Your Custom Motors' : {
  functions : your_global,
  bitrate : 115200
}
};
```
as well as index.html, to include the new motor logic:
```html
<!--Loading hardware control libraries !-->
<script src="lib/motors/slug_motor.js"></script>
<script src="lib/motors/your_motor.js"></script>
```

~~Makefile~~
-------------
The Makefile has been removed. Instead, we will just organize our controllers so they are small, offloading work to services and directives. This has a number of benefits over using a Makefile. The Debugger now provides us with accurate line numbers.

Images
------
[Globe Texture](http://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74443/world.topo.200409.3x5400x2700.png)

License
-------
MIT License, co-owned by Shashwat Kandadai and UCSC, 2013.
The License applies to all code in here that isn't already licensed.
