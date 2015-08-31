'use strict';

var _ = require('lodash');
var async = require('async');

var ini = require('ini');
var gift = require('gift');
var fs = require('fs');

var gitUtils = require('../lib/git-utils');

module.exports = function(github, conf) {
  var repo = gift(conf.gitPath);

  return function(cb) {
    repo.pull(function() {
      gitUtils.getFiles({
        gitPath: conf.gitPath,
        filePath: 'files',
        configFile: 'info.ini'
      }, function(err, projects) {
        if (err) return cb(err);
        parse(projects, cb);
      });
    });
  };
};

function parse(projects, cb) {
  var ret = {};

  async.eachOf(projects, function(versions, projectName, cb) {
    var proj = ret[projectName] = {
      name: projectName,
      versions: [],
      assets: {}, // version -> assets
      zip: projectName + '.zip'
    };

    parseIni(versions['info.ini'], function(err, conf) {
      _.extend(proj, conf);

      async.eachOf(versions, function(files, version, cb) {
        // ignore info.ini and update.json
        if (typeof files === 'string') return cb();
        
        proj.versions.push(version);
        var asset = proj.assets[version] = {
          files: files, // note files may be modified in the next step
          version: version,
          mainfile: conf.mainfile
        };
        if (_.contains(files, 'mainfile')) {
          _.pull(files, 'mainfile');
          fs.readFile('mainfile', function(err, f) {
            asset.mainfile = String(f);
            cb();
          });
        } else {
          cb();
        }
      }, cb);
    });

    delete versions['info.ini'];
    delete versions['update.json'];
  }, function(err) {
    cb(err, ret);
  });
}

function parseIni(p, cb) {
  fs.readFile(p, function(err, data) {
    cb(err, ini.parse(String(data)));
  });
}
