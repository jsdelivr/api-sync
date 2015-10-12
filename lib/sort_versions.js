'use strict';

var Semvish = require('semvish');


module.exports = function(arr) {
    if(!arr) {
        return;
    }

    return arr.filter(function(v) {
      return Semvish.valid(v, false);
    }).sort(Semvish.rcompare);
};
