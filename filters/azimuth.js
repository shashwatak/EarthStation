/*
 * EarthStation v0.3
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/EarthStation
 * License: MIT
 */

function azimuth_filter() {
  return function (input) {
    if (typeof input !== 'number') { return input; }
    var degrees = (input/Math.PI*180) % (360);
    degrees = degrees.toPrecision(4);
    var headings = [' N', ' NNE', ' NE', ' ENE',
                    ' E', ' ESE', ' SE', ' SSE',
                    ' S', ' SSW', ' SW', ' WSE',
                    ' W', ' WNW', ' NW', ' NNW',
                    ' N'];

    var num_headings = headings.length;
    var heading_arc_angle = 360/num_headings;
    var heading_arc_start = -heading_arc_angle/2;

    var heading_itor = 0;
    while (heading_itor < num_headings){
      if (degrees > heading_arc_start &&
        degrees < (heading_arc_start + heading_arc_angle)) {
        degrees += headings[heading_itor];
        break;
      };
      heading_arc_start += heading_arc_angle;
      heading_itor++
    };
    return degrees;
  };
};
