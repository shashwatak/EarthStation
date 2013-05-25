EarthStation (v0.1)
===================
This software is part of a larger project, to build a working
Ground Station for Satellite Communication as part of the Amateur Radio Service at UCSC.

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

###Mentors
Professor Steve Petersen (AC6P)
Professor John Vesecky (AXXX) //will ask Jason and put it in
Paul Naud

###ARS Ground Station Team
**Jason Ragland** (AG6RM)
  Team Lead
  Antenna Design
**Andrew Martino** (KJ6RFK)
  Power, Motor, and Mechanical Systems
**Sander Middour** (KK6BSI)
  Digital Motor Control
**Shashwat Kandadai** (KK6BSH)
  Tracking Software

###Further Acknowledgments
Steve Petersen
TS Kelso
http://www.aerotwist.com/
stackoverflow


Introduction
------------
The goals of this software are to:
- Point an antenna at an orbiting satellite
- Add Doppler correction to radio communications
- Provide the user with a display of what's going on

We considered many different approaches to building this app before settling on making a Google Chrome Packaged App. High on our list of priorities was cross OS support, and Chrome is available on all major OSs. The Packaged App approach allows us to access USB and COM ports, to manipulate external hardware. Further, a Packaged App is installed on the user's computer, which means it can run completely offline. Finally, the relatively new `performance.now()` function gives us microsecond precise timing.

Frameworks
-----------
*[Angular.js](http://angularjs.org/)
*[satellite.js](https://github.com/shashwatak/satellite-js)
*[three.js](http://threejs.org/) (with a little jquery)
*[d3.js](http://d3js.org/)

High Level Architecture
-----------------
The Tracking Software runs on a Computer, and connects to an external Motor Controller. The Computer sends the Motor Controller aiming directions. The Motor Controller then sends Power to the Motors to move the Antenna.

INSERT BLOCK DIAGRAM HERE


Makefile
--------
The common approach in AngularJS is to put all of the necessary logic in controllers.js, filters.js, services.js, and directives.js. These files can get pretty large, so we break them down into their component parts and put them all together when it's time to run.

The 'js-src' directory contains all the actual source code for the AngularJS app. When `make` is run, the individual files in 'js-src' and its subdirectories are concatenated together and written to their final locations in the 'js' folder.

Images
------
[Skybox](http://phl.upr.edu/library/notes/syntheticstars)
[Globe](http://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74443/world.topo.200409.3x5400x2700.png)

License
-------
MIT License, co woned by Shashwat Kandadai and UCSC 2013
The License applies to all code in here that isn't already licensed.
