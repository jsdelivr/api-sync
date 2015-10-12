'use strict';

var Semvish = require('semvish');


module.exports = function(arr) {
    if(!arr) {
        return;
    }

    return arr.slice().sort(Semvish.compare).reverse();
};
