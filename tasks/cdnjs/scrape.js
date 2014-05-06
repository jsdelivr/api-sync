'use strict';

var request = require('request');
var prop = require('annofp').prop;


module.exports = function(cb) {
    request.get({
        url: 'http://api.cdnjs.com/libraries?fields=version,description,homepage,description,keywords,assets,filename,author',
        json: true
    }, function(err, res, data) {
        if(err || !data || !data.results) {
            console.error('Failed to update cdnjs data!', err, data);

            return cb(err);
        }

        console.log('Fetched cdnjs data');

        cb(null, data.results.map(function(library) {
            return {
                mainfile: library.filename,
                description: library.description,
                homepage: library.homepage,
                author: library.author,
                assets: library.assets,
                versions: library.assets && library.assets.map(prop('version'))
            };
        }));
    });
};
