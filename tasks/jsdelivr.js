'use strict';

var url = require('url')
  , _ = require('lodash')
  , async = require('async')
  , extend = require('extend')
  , fp = require('annofp')
  , prop = fp.prop
  , values = fp.values
  , request = require('request')
  , ini = require('ini')
  , path = require('path');

var utils = require('../lib/utils')
  , log = require("../lib/log");

var contains = utils.contains;
var etagsFilePath = path.resolve(__dirname,'../data/jsdelivr_etags.json');
var github;

module.exports = function(_github) {

  github = _github;

  return function(cb) {

    var repoOwner = "jsdelivr"
      , repoName = "jsdelivr"
      , filterFn = function(v) {
        return v.name === 'files';
      };

    utils.githubGetFiles(github,repoOwner,repoName,filterFn,function(err,files) {

      if(err) return cb(err);

      var filtered = [];
      function _allowed(file) {
        var _path = file.path;
        if(!(/100/g).test(file.mode))
          return false;
        if(!(/\//g).test(_path))
          return false;

        return true
      }

      _.each(files, function(file) {
        if(_allowed(file))
          filtered.push(file.path);
      });

      parse(filtered, cb);
    });
  };
};

function parse(files, cb) {
  var base = 'https://raw.githubusercontent.com/jsdelivr/jsdelivr/master/files/';
  var ret = {};

  async.eachLimit(files, 4, function(file, cb) {
    var parts = file.split('/');
    var name = parts[0];
    var filename, version;

    if(parts.length === 2) {
      if(parts[1] === 'info.ini') {
        return parseIni(url.resolve(base, file), function(err, d) {
          if(err) {
            return setImmediate(cb.bind(null, err));
          }

          if(!(name in ret)) {
            ret[name] = {
              name: name,
              versions: [],
              assets: {}, // version -> assets
              zip: name + '.zip'
            };
          }

          ret[name] = extend(ret[name], d);

          setImmediate(cb);
        });
      }

      return setImmediate(cb);
    }
    else {
      version = parts[1];
      filename = parts.slice(2).join('/');
    }

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

    setImmediate(cb);
  }, function(err) {
    if(err) {
      return cb(err);
    }

    //console.log(JSON.stringify(ret));
    cb(null, values(ret).map(function(v) {
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
    }));
  });
}

function parseIni(url, cb) {
  request.get(url, function(err, res, data) {
    if(err) {
      return cb(err);
    }

    cb(null, ini.parse(data));
  });
}
