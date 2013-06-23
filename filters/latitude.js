function latitude_filter () {
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
};
