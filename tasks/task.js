'use strict';

var fs = require('fs')
  , path = require('path')
  , mkdirp = require('mkdirp')
  , _ = require('lodash')
  , async = require('async')

  , log = require('../lib/log')
  , mail = require('../lib/mail')
  , sortVersions = require('../lib/sort_versions');

module.exports = function (output, target, scrape) {
  return function (cb) {
    log.info('Starting to update ' + target + ' data');

    scrape(function (err, libraries) {
      if (err) {
        var s = 'Failed to update ' + target + ' data!';
        log.err(s, err);
        mail.error(s);
        return cb(err);
      }

      libraries = libraries.map(function (library) {
        library.versions = sortVersions(library.versions);

        // skip if library is missing versions for some reason
        if (!library.versions) {
          log.warn('Failed to find versions for', library);
          return;
        }

        library.lastversion = library.versions[0];

        return library;
      }).filter(id);

      var syncedCount = 0
        , errorCount = 0;
      async.eachLimit(libraries, 50, function (library, done) {

        var p = path.resolve(__dirname, '../', output, target, library.name, 'library.json')
          , s = JSON.stringify(library);

        mkdirp(path.dirname(p), function (direrr) {
          fs.writeFile(p, s, function (err) {
            if (direrr || err) {
              errorCount++;
              log.err("Error writing file for library " + library.name, direrr || err);
            }
            else {
              syncedCount++;
              log.info("Successfully synced CDN:library " + target + ":" + library.name);
            }
            done();
          });
        });
      }, function (err) {
        if (err) {
          log.err("Error syncing CDN " + target, err);
        }
        else {
          log.info("Synced CDN " + target + ", successfully updated " + syncedCount + " libraries and failed to update " + errorCount + " libraries.");
        }
        cb(err);
      });
    });
  };
};

function id(a) {
  return a;
}