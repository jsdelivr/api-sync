'use strict';

var fs = require('fs')
  , path = require('path')
  , _ = require('lodash')

  , log = require('../lib/log')
  , mail = require('../lib/mail')
  , sortVersions = require('../lib/sort_versions');

module.exports = function(output, target, scrape) {
  return function(cb) {
    log.info('Starting to update ' + target + ' data');

    scrape(function(err, libraries) {
      if(err) {
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

      var updatedTarget = merge(p, libraries);
      fs.writeFile(
        p,
        JSON.stringify(updatedTarget),
        function (err) {
          if (err) {
            log.err('Failed to write json db to path ' + p);

            return cb(err);
          }

          log.info('Updated', target, 'data');

          cb();
        }
      );
    });
  };
};

function id(a) {
  return a;
}

function merge(target,receivedJSON) {

  var targetJSON

    , targetNames = []
    , receivedNames = []

    , targetNamesToJSONindex = {}
    , receivedNamesToJSONindex = {};

  try {
    targetJSON = require(target);
  } catch (err) {
    log.info(target + " does not yet exist, initializing w/ retrieved data");
    targetJSON = [];
  }

  for(var i = 0; i < targetJSON.length; i++) {
    targetNames.push(targetJSON[i].name);
    targetNamesToJSONindex[targetJSON[i].name] = i;
  }
  for(var i = 0; i < receivedJSON.length; i++) {
    if(receivedJSON[i].name) {
      receivedNames.push(receivedJSON[i].name);
      receivedNamesToJSONindex[receivedJSON[i].name] = i;
    }
    else
      log.warn("unable to merge library w/o name",receivedJSON[i]);
  }

  log.info("merging ",receivedJSON.length," items into ",target);

  _.each(receivedNames,function(name) {
    if(typeof targetNamesToJSONindex[name] !== "undefined")//updated
      targetJSON[targetNamesToJSONindex[name]] = receivedJSON[receivedNamesToJSONindex[name]];
    else//new
      targetJSON.push(receivedJSON[receivedNamesToJSONindex[name]]);
  });

  log.info("saving ",targetJSON.length," items into ",target);

  //make sure these are garbage collected
  targetNames.length = 0;
  receivedNames.length = 0;
  receivedJSON.length = 0;

  return targetJSON;
}
