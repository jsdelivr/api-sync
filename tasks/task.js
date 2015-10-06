'use strict';

var fs = require('fs')
  , path = require('path')
  , mkdirp = require('mkdirp')
  , _ = require('lodash')
  , async = require('async')
  , gift = require('gift')

  , config = require('../config')
  , log = require('../lib/log')
  , mail = require('../lib/mail')
  , sortVersions = require('../lib/sort_versions')
  , gitUtils = require('../lib/git-utils');

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
        if (!library.versions || !library.versions.length) {
          log.warning('Failed to find versions for', library);
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

        var gitPath = _.get(config, ["tasks", target, "gitPath"].join("."))
          , filePath = _.get(config, ["tasks", target, "filePath"].join("."));

        if (gitPath) {
          _inferEtags(target, gitPath, filePath, cb);
        }
        else {
          cb(err);
        }
      });
    });
  };
};

function id(a) {
  return a;
}

function _inferEtags(target, gitPath, filePath, cb) {

  var _scope = function (trees, levelPaths, cb) {

    var levelPath = levelPaths[0]
      , dataDirTree = _.find(trees, {name: levelPath});
    if (levelPaths.length === 1) {
      cb(null, dataDirTree)
    }
    else {
      dataDirTree.trees(function (err, trees) {
        if (!err) {
          _scope(trees, levelPaths.slice(1), cb);
        }
        else {
          cb(err);
        }
      });
    }
  };

  // write local git 'etags'
  var repo = gift(gitPath)
    , etagsFilePath = path.resolve(__dirname, "../data/" + target + ".json");

  repo.current_commit(function (err, commit) {
    if (!err) {

      commit.tree().trees(function (err, trees) {

        _scope(trees, filePath.split("/"), function (err, dataDirTree) {

          dataDirTree.trees(function (err, projTrees) {

            var etags = _.map(projTrees, function (projTree) {
              return {
                name: projTree.name,
                etag: "\"" + projTree.id + "\"",
                sha: projTree.id
              };
            });

            fs.writeFile(etagsFilePath, JSON.stringify(_.map(etags, function (metadata) {
              return metadata
            })), function (err) {
              if (err) {
                log.err("failed to save " + target + " etags ", err);
              } else {
                log.info(target + " etags saved to " + etagsFilePath);
              }

              // don't err out if the etags don't save, just log it
              cb();
            });
          });
        });
      }, function (err) {
        cb(err);
      });
    }
    else {
      cb(err);
    }
  });
}