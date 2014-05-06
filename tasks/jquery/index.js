'use strict';


module.exports = function(github) {
    return require('../task')('jquery', require('./scrape')(github));
};
