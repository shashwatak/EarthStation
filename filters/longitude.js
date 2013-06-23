function longitude_filter() {
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
};
