/*
 * EarthStation v0.3
 * (c) 2013 Shashwat Kandadai and UCSC
 * https://github.com/shashwatak/EarthStation
 * License: MIT
 */

increment_time = (function(){
  return {
    by_milliseconds : function (time, milliseconds) {
      var current_second = time.second + milliseconds/1000;
      var current_minute = time.minute;
      var current_hour = time.hour;
      var current_date_of_month = time.date_of_month;

      if (current_second >= 60) {
          current_minute += Math.floor(current_second/60);
          current_second %= 60;
      }
      else if (current_second < 0) {
          current_minute -= Math.floor(current_second/60);
          current_second %= 60;
      }

      if (current_minute >= 60) {
          current_hour += Math.floor(current_minute/60);
          current_minute %= 60;
      }
      else if (current_minute < 0) {
          current_hour -= Math.floor(current_minute/60);
          current_minute %= 60;
      }

      if (current_hour >= 24) {
          current_date_of_month += Math.floor(current_hour/24);
          current_hour %= 24;
      }
      else if (current_hour < 0) {
          current_date_of_month -= Math.floor(current_hour/24);
          current_hour %= 24;

      }
      // It's OK if current_day_of_month overflows, because that actually
      // will still deliver the correct jday.
      return {
        second : current_second,
        minute : current_minute,
        hour : current_hour,
        date_of_month : current_date_of_month,
        month : time.month,
        year : time.year
      }
    }
  };
})();
