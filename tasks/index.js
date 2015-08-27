'use strict';

var task = require('./task');

module.exports = function(output, github) {
    //var cdns = ['bootstrap', 'cdnjs', 'google', 'jquery', 'jsdelivr'];
    // var cdns = ['bootstrap', 'cdnjs', 'google'];
    var cdns = ['jsdelivr', 'cdnjs'];
    //var cdns = ['cdnjs'];
    //var cdns = [];

    return cdns.reduce(function(ret, cdn) {
        ret[cdn] = task(output, cdn, require('./' + cdn)(github));
    }, {});
};
