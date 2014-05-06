'use strict';

module.exports = function(github) {
    var cdns = ['bootstrap', 'cdnjs', 'google', 'jquery', 'jsdelivr'];
    var ret = {};

    cdns.forEach(function(cdn) {
        ret[cdn] = require('./task')(cdn, require('./' + cdn)(github));
    });

    return ret;
};
