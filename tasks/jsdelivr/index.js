'use strict';

var async = require('async');
var sugar = require('mongoose-sugar');

var scrape = require('./scrape');
var sortVersions = require('../../lib/sort_versions');
var Library = require('../../schemas').jsdelivrLibrary;


module.exports = function(cb) {
    console.log('Starting to update jsdelivr data');

    scrape(function(err, files) {
        if(err) {
            console.error('Failed to update jsdelivr data!', err);

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

                sugar.update(Library, d._id, library, cb);
            });
        }, function(err) {
            if(err) {
                console.error(err);

                return cb(err);
            }

            console.log('Updated jsdelivr data');

            cb();
        });
    });
};

