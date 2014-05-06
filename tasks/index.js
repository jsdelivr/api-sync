'use strict';

module.exports = function(github) {
    return {
        bootstrap: require('./bootstrap')(github),
        cdnjs: require('./cdnjs'),
        google: require('./google'),
        jquery: require('./jquery')(github),
        jsdelivr: require('./jsdelivr')(github)
    };
}
