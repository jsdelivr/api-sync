'use strict';

var async = require('async');
var sugar = require('mongoose-sugar');

var sortVersions = require('../lib/sort_versions');


module.exports = function(target, scrape) {
    var Library = require('../schemas')[target + 'Library'];

    return function(cb) {
        console.log('Starting to update ' + target + ' data');

        scrape(function(err, files) {
            if(err) {
                console.error('Failed to update ' + target + ' data!', err);

                return cb(err);
            }

            async.each(files, function(library, cb) {
                sugar.getOrCreate(Library, {
                    name: library.name
                }, function(err, d) {
                    if(err) {
                        return cb(err);
                    }

                    library.zip = library.name + '.zip';
                    library.versions = sortVersions(library.versions);
                    library.lastversion = library.versions[0];

                    sugar.update(Library, d._id, library, cb);
                });
            }, function(err) {
                if(err) {
                    console.error(err);

                    return cb(err);
                }

                console.log('Updated ' + target + ' data');

                cb();
            });
        });
    };
};
