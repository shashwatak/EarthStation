EarthStation (v0.4)
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


###ARS Ground Station Team Rev. 2

**Kayla Hidalgo** *KK6JGU*

Team Lead, Antenna Design

**Julie Do** *KK6JHF*

Microcontroller Design

**William Ye** *KK6JGV*

Software Design

###ARS Ground Station Team 

**Jason Ragland** *AG6RM*

Team Lead, Antenna Design

**Andrew Martino** *KJ6RFK*

Power, Motor, and Mechanical Systems

**Sander Middour** *KK6BSI*

Digital Motor Control

**Shashwat Kandadai** *KK6BSH*

Tracking Software

###Mentors
**Professor Steve Petersen** *AC6P*

**Professor John Vesecky** *AE6TL*

**Paul Naud**

###Acknowledgments
[Professor Steve Petersen (AC6P)](http://www.soe.ucsc.edu/people/petersen)

[TS Kelso](http://celestrak.com/webmaster.asp)

[Paul Lewis](http://www.aerotwist.com/)

[Jerome Etienne](http://learningthreejs.com/)

[Stemkoski](http://stemkoski.github.io/Three.js/)

[Stack Overflow](stackoverflow.com)

Major TODOs
===========
####Logic
-   AOS, TCA, LOS calculations, via the Propagation Worker

####UI
-   Sorted, filterable, collapsible, hide-able, list of sats.
-   Tooltips with opentip.
-   ThreeJS mousehover detection.
-   Geodetic-Normalized and ECI sat paths display.
-   Stargazer mode (upwards view of Az/El).
    -   Displays motors heading.

How To Run
----------
###Build The Project
1. Clone this Git repo.

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

![Hardware Block Diagram](http://i.imgur.com/fclQhJy.jpg Hardware Block Diagram)

Software Architecture
----------------------
Ideally, we make use of WebWorkers to offload the mathematically intense logic to separate threads.

![Chrome Data Flow](http://i.imgur.com/yd313ze.jpg Chrome Data Flow)

The Main Thread (which includes Worker Manager) ONLY deals with initial setting up of the JS environment, and responding to various callbacks. This ensures that it's number one priority remains Graphics Refresh, via the requestAnimationFrame() call. Otherwise, the Main Thread will delay Graphics updates for other logic, the graphics will appear choppy, and the UI will seem non-responsive.

The three.js rendering environment is in WebGL. The Main Thread relays any UI commands that require a change in the WebGL objects (such as zooming, rotating, tracking a satellite).

The Tracking worker is told which satellites to track, and regularly reports those satellites live position. It runs one SGP4 calculation per satellite being tracked, every update cycle, and returns all the live values for each satellite.

The Propagation worker is given a satellite and told to provide several position coordinates in an array, depicting the satellite's path of travel. This thread does many SGP4 calculations for a single satellite over a given span of time. Can also provide this thread with a orbital_resolution value, that increases or decreases the granularity of SGP4 calls.

The localStorage cache is accessed at the start and finish of the app's life-cycle, preserving state across multiple sessions.

AngularJS Architecture
-----------------------
AngularJS divides a project into four sections, Controllers, Services, Filters, and Directives. The Controllers and Services are the most important aspects of this particular project.

![AngularJS Architecture](http://i.imgur.com/AGGz7A5.png AngularJS Organization)

###Controllers
The Controllers should all be very small, and should be limited to setting up the Model, instantiating the Services, defining callbacks for UI events, and not much else.

This app is a single view, currently run by `UICtrl`, which is quite simple. `UICtrl` takes in user mouse/keyboard actions and relays them to Services like `ThreeJS` and `WorkerManager`.

###Services
Services are singletons, often used to encapsulate Web APIs, but here they are used to wrap up complex local logic.

`ThreeJS` is used to abstract the WebGL world from the AngularJS/HTML/CSS world. `UICtrl` detects user actions, such as scrolling, and informs `ThreeJS` to appropriately update the 3D objects.

`WorkerManager` corresponds exactly to the Worker Manager in the Software Architecture. This Service instantiates Web Workers (threads), sets up their callbacks, and provides the Web Workers with their parameters. Both `UICtrl` and `ThreeJS` rely on `WorkerManager` to provide up-to-date satellite tracking information, for display in HTML and WebGL.

The `Radio` and `Motor` Services encapsulate the hardware control logic. It does not rely on WebWorkers, because the chrome.serial API is only available from the Main Thread. They both rely on `WorkerManager` to provide them with up-to-date tracking information.

###Filters
Filters provide a modular way to format and present data dynamically in the HTML. We've set up filters to neatly print out coordinates and large numbers.

###Directives
Directives add functionality to the DOM, allowing us to create new events and capture DOM changes and User actions.

Serial Hardware Interfacing
---------------------
With the goal of keeping the motor control logic as modular as possible, one can add motor control logic to this project with relative ease.

The hardware logic should be a self executing function that returns a set of functions with preset names, as follows.

###Motors

```javascript
  your_motor_global = (function(){
    function stop_motors (connectionId, callback) {
      // Do your chrome.serial reads and writes here.
      callback(motor_data); // OPTIONAL CALLBACK
    }
    function move_az_to (connectionId, azimuth, callback) {
      // Do your chrome.serial reads and writes here.
      callback(motor_data); // OPTIONAL CALLBACK
    }
    function move_el_to (connectionId, elevation, callback) {
      // Do your chrome.serial reads and writes here.
      callback(motor_data); // OPTIONAL CALLBACK
    }
    function get_motor_status (connectionId, callback) {
      // Do your chrome.serial reads and writes here.
      callback(motor_data); // REQUIRED CALLBACK
    }

    /* The motor_data callback parameter is of the format:
    motor_data = {
      azimuth : motor_az,
      elevation : motor_el,
      status : motor_status
    }*/

    return {
      // return these functions, and the app will operate your motors.
      stop_motors : stop_motors,
      move_az_to  : move_az_to,
      move_el_to  : move_el_to,
      get_status  : get_motor_status
    };
  })();
```

###Radios

```javascript
  your_radio_global = (function() {
    function get_main_frequency (connectionId, callback) {
      // Do your chrome.serial reads and writes here.
      callback(radio_main_frequency); // REQUIRED CALLBACK
    };

    function get_sub_frequency (connectionId, callback) {
      // Do your chrome.serial reads and writes here.
      callback(radio_sub_frequency); // REQUIRED CALLBACK
    };

    function set_main_frequency (connectionId, frequency, callback) {
      // Do your chrome.serial reads and writes here.
      callback(); // OPTIONAL CALLBACK
    };

    function set_sub_frequency (connectionId, frequency, callback) {
      // Do your chrome.serial reads and writes here.
      callback(); // OPTIONAL CALLBACK
    };

    return {
      get_main_frequency : get_main_frequency,
      get_sub_frequency : get_sub_frequency,
      set_main_frequency : set_main_frequency,
      set_sub_frequency : set_sub_frequency,
    };

  })();
```

This will return the expected data to the rest of the application.

Be sure to update the following part of the Motors or Radios Angular service, in services.js:

```javascript
  // Supported Motors
  var supported_motors = {
    'Slug Motor' : {
      functions : slug_motor, // This is the global variable that the motor control logic should return
      bitrate : 57600 // specify the optimal bitrate
    },
    'Your Custom Motors' : {
      functions : your_motor_global,
      bitrate : 115200
    }
  };

  // Supported Radios
  var supported_radios = {
    'ICOM IC821H' : {
      functions : icom_821h,
      bitrate : 19200
    },
    'Your Custom Radio' : {
      functions : your_radio_global
      bitrate : 9600
    }
  };
```

as well as index.html, to include the new motor logic:

```html
  <!--Loading hardware control libraries !-->
  <script src="lib/motors/slug_motor.js"></script>
  <script src="lib/motors/your_motor.js"></script>
  <script src="lib/radios/icom_821h.js"></script>
  <script src="lib/radios/your_radio.js"></script>
```

Images
------
[Globe Texture](http://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74443/world.topo.200409.3x5400x2700.png)

License
-------
MIT License, co-owned by Shashwat Kandadai and UCSC, 2013.
The License applies to all code in here that isn't already licensed.
