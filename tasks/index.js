'use strict';

module.exports = function(output, github) {
    //var cdns = ['bootstrap', 'cdnjs', 'google', 'jquery', 'jsdelivr'];
    var cdns = ['bootstrap', 'cdnjs', 'google'];
    //var cdns = ['jsdelivr'];
    //var cdns = ['cdnjs'];
    //var cdns = [];
    var ret = {};

    cdns.forEach(function(cdn) {
        ret[cdn] = require('./task')(output, cdn, require('./' + cdn)(github));
    });

    return ret;
};
