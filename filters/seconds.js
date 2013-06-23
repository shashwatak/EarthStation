function seconds_filter() {
  return function (input) {
    if (typeof input !== 'number') { return input; }
    var seconds = input.toPrecision(4);
    seconds += "";
    return seconds;
  };
};
