EarthStation.filter('latitude', function() {
    return function (input){
        if (typeof input !== 'number') { return input; }
        var degrees = (input/Math.PI*180) % (360);
        degrees = degrees.toPrecision(4);
        if (degrees > 90 || degrees < -90){
            return "Error";
        }

        if (degrees > 0){
            degrees = degrees+" N";
        }
        else{
            degrees = degrees+" S";
        }
        return degrees;
    };
});
EarthStation.filter('longitude', function() {
    return function (input){
        if (typeof input !== 'number') { return input; }
        var degrees = (input/Math.PI*180) % (360);
        if (degrees > 180){
            degrees = 360 - degrees;
        }
        else if (degrees < -180){
            degrees = 360 + degrees;
        }
        degrees = degrees.toPrecision(4);
        if (degrees > 0) {
            degrees += " E"
        }
        else if (degrees <= 0){
            degrees *= -1;
            degrees += " W"
        }
        return degrees;
    };
});

EarthStation.filter('azimuth', function() {
    return function (input) {
        if (typeof input !== 'number') { return input; }
        var degrees = (input/Math.PI*180) % (360);
        degrees = degrees.toPrecision(4);
        var headings = [' N', ' NNE', ' NE', ' ENE',
                        ' E', ' ESE', ' SE', ' SSE',
                        ' S', ' SSW', ' SW', ' WSE',
                        ' W', ' WNW', ' NW', ' NNW'];

        var num_headings = headings.length;
        var heading_arc_angle = 360/num_headings;
        var heading_arc_start = -heading_arc_angle/2;

        var heading_itor = 0;
        while (heading_itor < num_headings){
            if (degrees > heading_arc_start &&
                degrees < (heading_arc_start + heading_arc_angle)){
                degrees += headings[heading_itor];
                break;
            }
            heading_arc_start += heading_arc_angle;
            heading_itor++
        }
        return degrees;
    };
});
EarthStation.filter('elevation', function() {
    return function (input) {
        if (typeof input !== 'number') { return input; }
        var degrees = (input/Math.PI*180) % (360);
        if (degrees > 180 && degrees < 360){
            degrees = 360 - degrees;
            degrees *= -1;
            degrees = degrees.toPrecision(4);
            degrees+=" D";
        }
        else {
            degrees = degrees.toPrecision(4);
            degrees+=" U";
        }
        return degrees;
    };
});

EarthStation.filter('distance', function() {
    return function (input) {
        if (typeof input !== 'number') { return input; }
        var alt = input.toPrecision(4);
        alt += " km";
        return alt;
    };
});

EarthStation.filter('seconds', function() {
    return function (input) {
        if (typeof input !== 'number') { return input; }
        var seconds = input.toPrecision(4);
        seconds += "";
        return seconds;
    };
});



