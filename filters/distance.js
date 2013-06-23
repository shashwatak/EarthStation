function distance_filter() {
    return function (input) {
        if (typeof input !== 'number') { return input; }
        var alt = input.toPrecision(4);
        alt += " km";
        return alt;
    };
};
