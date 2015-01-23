'use strict';

var fs = require('fs');
var path = require('path');

var sortVersions = require('../lib/sort_versions');


module.exports = function(output, target, scrape) {
  return function(cb) {
    console.log('Starting to update ' + target + ' data');

    scrape(function(err, libraries) {
      if(err) {
        console.error('Failed to update ' + target + ' data!', err);

        return cb(err);
      }

      var p = path.resolve(__dirname,'../',output, target + '.json');

      libraries = libraries.map(function(library) {
        library.versions = sortVersions(library.versions);

        // skip if library is missing versions for some reason
        if(!library.versions) {
          console.warn('Failed to find versions for', library);

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
            console.error('Failed to write', p);

            return cb(err);
          }

          console.log('Updated', target, 'data');

          cb();
        }
      );
    });
  };
};

function id(a) {
  return a;
}

function merge(target,libraries) {

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
    console.log(target + " does not yet exist, initializing w/ retrieved data");
    targetJSON = [];
  }

  var targetDBMap = _listToMap(targetJSON)
    , freshDBMap = _listToMap(libraries);

  for(var key in freshDBMap) {
    targetDBMap[key] = freshDBMap[key];
  }

  updatedJSON = _mapToList(targetDBMap);

  return updatedJSON;
}
