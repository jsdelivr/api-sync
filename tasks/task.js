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

      var p = path.resolve(__dirname, '../', output, target + '.json');

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

      async.each(libraries, function (library, done) {

        var p = path.resolve(__dirname, '../', output, target, library.name, library.name + '.json')
          , s = JSON.stringify(library);

        mkdirp(path.dirname(p), function (direrr) {
          fs.writeFile(p, s, function (err) {
            if (direrr || err) {
              log.err("Error writing file for library " + library.name, direrr || err);
              log.err(library);
            }
            done();
          });
        });
      }, function (err) {
        if (err) {
          log.err("Error syncing CDN " + target, err);
        }
        else {
          log.info("Successfully synced CDN " + target);
        }
        cb(err);
      });
    });
  };
};

function id(a) {
  return a;
}