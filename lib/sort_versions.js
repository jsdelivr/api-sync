'use strict';

var Semvish = require('semvish');


module.exports = function(arr) {
    if(!arr) {
        return;
    }

    return arr.filter(Semvish.valid).sort(Semvish.rcompare);
};
