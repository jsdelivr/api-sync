'use strict';

var fs = require('fs')
  , path = require('path')

  , log = require('../lib/log');

var sortVersions = require('../lib/sort_versions');


module.exports = function(output, target, scrape) {
  return function(cb) {
    log.info('Starting to update ' + target + ' data');

    scrape(function(err, libraries) {
      if(err) {
        log.err('Failed to update ' + target + ' data!', err);
        return cb(err);
      }

      var p = path.resolve(__dirname,'../',output, target + '.json');

      libraries = libraries.map(function(library) {
        library.versions = sortVersions(library.versions);

        // skip if library is missing versions for some reason
        if(!library.versions) {
          log.warn('Failed to find versions for', library);

          return;
        }

        library.lastversion = library.versions[0];

        return library;
      }).filter(id);

      var updatedTarget = merge(p,libraries);
      fs.writeFile(
        p,
        JSON.stringify(updatedTarget),
        function(err) {
          if(err) {
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

  var _listToMap = function(list) {
    var map = {};
    for(var i = 0; i < list.length; i++) {
      map[list[i].name] = list[i];
    }
    return map;
  };

  var _mapToList = function(map) {
    var list = [];
    for(var key in map) {
      list.push(map[key]);
    }
    return list;
  };

  var targetJSON
    , updatedJSON;

  try {
    targetJSON = require(target);
  } catch (err) {
    log.info(target + " does not yet exist, initializing w/ retrieved data");
    targetJSON = [];
  }

  var targetDBMap = _listToMap(targetJSON)
    , freshDBMap = _listToMap(receivedJSON);

  log.info("merging ",receivedJSON.length," items into ",target);

  for(var key in freshDBMap) {
    targetDBMap[key] = freshDBMap[key];
  }

  updatedJSON = _mapToList(targetDBMap);

  log.info("saving ",updatedJSON.length," items into ",target);

  if(updatedJSON.length < targetJSON.length) {
    log.err("Data potentially lost during ",target," update!");
    log.err("updatedJSON item count ",updatedJSON.length," < "," original targetJSON item count ",targetJSON.length);
  }
  if(updatedJSON.length < receivedJSON.length) {
    log.err("Update data not completely merged into ",target);
    log.err("updatedJSON item count ",updatedJSON.length," < "," receivedJSON item count ",receivedJSON.length);
  }

  return updatedJSON;
}
