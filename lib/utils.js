'use strict';

exports.is = function is(prop, val) {
    return function(v) {
        return v[prop] === val;
    };
};

exports.contains = function contains(str) {
    return function(v) {
        return v.indexOf(str) >= 0;
    };
};

exports.startsWith = function startsWith(str) {
    return function(v) {
        return v.indexOf(str) === 0;
    };
};
