'use strict';

var fp = require('annofp')
  , _ = require("lodash")
  , values = fp.values;

var log = require('../lib/log')
  , utils = require('../lib/utils')
  , mail = require('../lib/mail');

var github;

module.exports = function(_github) {

  github = _github;

  return function(cb) {
    getFiles(function(err, files) {
      if(err) {
        var s = 'Failed to update bootstrap data!';
        log.err(s, err);
        mail.error(s);
        return cb(err);
      }

      if(files.length) {
        var objParsed = parse(files);

        // clones sub-array that contains `"name": "twitter-bootstrap"` http://stackoverflow.com/a/15997913/1324588
        var matchIndex,
          objBootstrap = [],
          objFixed = [];
        objParsed.some(function (entry, i) { //some stops at first match
          if (entry.name === "twitter-bootstrap") {
            matchIndex = i;
            return true;
          }
        });
        objBootstrap = JSON.parse(JSON.stringify(objParsed[matchIndex])); // copys sub-array
        objBootstrap.name = "bootstrap";

        cb(null, objParsed.concat(objBootstrap));
      }
      else {
        cb(null,[]);
      }
    });
  };
};

function getFiles(cb) {

  var repoOwner = "maxcdn"
    , repoName = "bootstrap-cdn"
    , rootShaFn = function(v) {
      return v.name === 'public';
    };

  function _allowed(file) {
    var _path = file.path;
    if(!(/100/g).test(file.mode))
      return false;
    if(!(/\//g).test(_path))
      return false;

    // ignore the images and stylesheets directories
    if((/^images\//).test(_path))
      return false;
    if((/^stylesheets\//).test(_path))
      return false;

    return true
  }

  utils.githubGetFiles(github,repoOwner,repoName,rootShaFn,function(err,files) {

    if(err) return cb(err);

    var filtered = _.pluck(_.filter(files,_allowed),"path");
    cb(null, filtered);
  });
}

function parse(files) {
  var ret = {};

  files.forEach(function(file) {
    var parts = file.split('/');
    var name = parts[0];
    var version = parts[1];
    var filename = parts.slice(2).join('/');

    if(!(name in ret)) {
      ret[name] = {
        name: name,
        versions: [],
        assets: {} // version -> assets
      };
    }

    var lib = ret[name];

    // version
    if(lib.versions.indexOf(version) === -1) {
      lib.versions.push(version);
    }

    // assets
    if(!(version in lib.assets)) {
      lib.assets[version] = [];
    }

    lib.assets[version].push(filename);
  });

  return values(ret).map(function(v) {
    // convert assets to v1 format
    var assets = [];

    fp.each(function(version, files) {
      assets.push({
        version: version,
        files: files
      });
    }, v.assets);

    v.assets = assets;

    return v;
  });
}
