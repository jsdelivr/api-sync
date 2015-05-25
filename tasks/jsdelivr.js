'use strict';

var url = require('url')
  , _ = require('lodash')
  , async = require('async')
  , extend = require('extend')
  , request = require('request')
  , ini = require('ini')
  , path = require('path');

var utils = require('../lib/utils')
  , log = require("../lib/log");

module.exports = function(github) {

  return function(cb) {

    var repoOwner = "jsdelivr"
      , repoName = "jsdelivr"
      , rootShaFn = function(v) {
        return v.name === 'files';
      };

    utils.githubGetFiles(github,repoOwner,repoName,rootShaFn,function(err,files) {

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

      filtered = _.pluck(_.filter(files,_allowed),"path");
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
    if (err) {
      return cb(err);
    }

    var res = _.map(ret, function (v, k) {
      v.assets = _.map(v.versions, function (version) {
        return {version: version, files: v.assets[version]};
      });
      return v;
    });

    async.each(res, function (library, done) {
      var defaultMainfile = library.mainfile;
      async.eachLimit(library.assets, 8, function (versionAssets, done) {

        if (_.includes(versionAssets.files, "mainfile")) {

          // remove the mainfile entry
          _.remove(versionAssets.files, function (file) {
            return file === "mainfile";
          });

          // get mainfile value from github
          var mainfileUrl = base + path.join(library.name, versionAssets.version, "mainfile");
          request.get(mainfileUrl, function (err, res, data) {

            if (!err && res.statusCode < 400) {
              versionAssets.mainfile = data;
              done();
            }
            else {
              // can't find the mainfile, log an error and set it to the default
              log.err("Unable to find mainfile for library " + library.name + " version " + versionAssets.version + " at url " + mainfileUrl);
              versionAssets.mainfile = defaultMainfile;
              done();
            }
          });
        }
        else {
          // no alternate mainfile
          versionAssets.mainfile = defaultMainfile;
          done();
        }
      }, done);
    }, function (err) {

      cb(err, res);
    });
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
