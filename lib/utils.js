'use strict';

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
