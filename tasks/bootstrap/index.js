'use strict';


module.exports = function(github) {
    return require('../task')('bootstrap', require('./scrape')(github));
};
