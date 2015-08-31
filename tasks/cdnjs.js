'use strict';

var _ = require('lodash');
var async = require('async');

var gift = require('gift');

var path = require('path');
var fs = require('fs');

var gitUtils = require('../lib/git-utils');
var log = require('../lib/log');


module.exports = function(github, conf) {
  var repo = gift(conf.gitPath);

  return function(cb) {
    repo.pull(function() {
      gitUtils.getFiles({
        gitPath: conf.gitPath,
        filePath: 'ajax/libs',
        configFile: 'package.json'
      }, function(err, projects) {
        if (err) cb(err);
        else parse(projects, cb);
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
      assets: {}, // version -> assets
      zip: projectName + '.zip'
    };

    if (typeof versions['package.json'] !== 'string') {
      log.warn(projectName + ' is missing package.json -- SKIPPING');
      return cb();
    }

    parsePackage(versions['package.json'], function(err, conf) {
      _.extend(proj, conf);

      _.each(versions, function(files, version) {
        // ignore info.ini and update.json
        if (typeof files === 'string') return;
        
        proj.versions.push(version);
        proj.assets[version] = {
          files: files,
          version: version
        };
      });

      ret.push(proj);
      cb();
    });

    delete versions['package.json'];
  }, function(err) {
    cb(err, ret);
  });
}

function _hasMaintainers(json) {
  return typeof json.maintainers !== 'undefined' && json.maintainers.length;
}

function _getGithubRepository(json) {
  return _.find(json.repositories, function (repository) {
    return (/github\.com/).test(repository.url);
  });
}

//map cdnjs package.json to jsdelivr api schema
function parsePackage(path, cb) {
  fs.readFile(path, function(err, data) {
    if (err) return cb(err);

    var resp = {};
    try {
      var json = JSON.parse(data);
      resp.mainfile = _.result(json, 'filename', null);
      resp.author = _.result(json, 'author', null);
      resp.lastversion = _.result(json, 'version', null);
      resp.homepage = _.result(json, 'homepage', null);
      resp.description = _.result(json, 'description', null);

      var hasMaintainers = _hasMaintainers(json);

      //attempt to get author info from maintainers field
      if (!resp.author && hasMaintainers) {
        resp.author = _.result(json, 'maintainers[0].name', null);
      }

      //attempt to get homepage info from maintainers field
      if (!resp.homepage && hasMaintainers) {
        resp.homepage = _.result(json, 'maintainers[0].web', null);
      }

      //attempt to get github information from repositories field
      var githubRepositoryObj = _getGithubRepository(json);
      if (!resp.github && githubRepositoryObj) {
        resp.github = githubRepositoryObj.url;
      }
    } catch (_err) {
      err = _err;
      log.err(err);
    }

    cb(err, resp);
  });
}
