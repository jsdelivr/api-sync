'use strict';


module.exports = function(github) {
    return require('../task')('jsdelivr', require('./scrape')(github));
};
