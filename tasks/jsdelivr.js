'use strict';

var _ = require('lodash');
var async = require('async');

var ini = require('ini');
var gift = require('gift');
var fs = require('fs');

var gitUtils = require('../lib/git-utils');
var log = require('../lib/log');

module.exports = function(github, conf) {
  var repo = gift(conf.gitPath);

  return function(cb) {
    log.info('Pulling changes for the jsdelivr repo...');
    repo.pull(function() {
      log.info('Done pull...');
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
  var ret = [];

  async.eachOf(projects, function(versions, projectName, cb) {
    var proj = {
      name: projectName,
      versions: [],
      assets: [], // version -> assets
      zip: projectName + '.zip'
    };

    if (typeof versions['info.ini'] !== 'string') {
      log.warning(projectName + ' is missing info.ini -- SKIPPING');
      return cb();
    }

    parseIni(versions['info.ini'], function(err, conf) {
      _.extend(proj, conf);

      async.eachOf(versions, function(files, version, cb) {
        // ignore info.ini and update.json
        if (typeof files === 'string') return cb();
        
        var asset = {
          files: files, // note files may be modified in the next step
          version: version,
          mainfile: conf.mainfile
        };
        proj.versions.push(version);
        proj.assets.push(asset);
        if (_.contains(files, 'mainfile')) {
          _.pull(files, 'mainfile');
          fs.readFile('mainfile', function(err, f) {
            asset.mainfile = String(f);
            cb();
          });
        } else {
          cb();
        }
      }, function() {
        ret.push(proj);
        cb();
      });
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
