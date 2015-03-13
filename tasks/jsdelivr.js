'use strict';

var url = require('url')
  , async = require('async')
  , extend = require('extend')
  , fp = require('annofp')
  , prop = fp.prop
  , values = fp.values
  , request = require('request')
  , ini = require('ini')
  , fs = require('fs')
  , path = require('path');

var utils = require('../lib/utils')
  , log = require("../lib/log");

var contains = utils.contains;
var etagsFilePath = path.resolve(__dirname,'../data/jsdelivr_etags.json');
var github;

module.exports = function(_github) {

  github = _github;

  return function(cb) {

    getFiles(function(err,files,etags) {

      //write etags value to file
      fs.writeFile(etagsFilePath, JSON.stringify(etags), function(err) {
        if(err) {
          log.err("failed to save jsdelivr etags ",err);
        } else {
          log.info("jsdelivr etags saved to " + etagsFilePath);
        }
      });

      parse(files, cb);
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

function getFiles(cb) {

  //attempt to get etags file
  var etags;
  try {
    etags = require(etagsFilePath);
  } catch(err) {
    log.info('jsdelivr has no cached etags file, starting from scratch');
    etags = {};
  }

  github.repos.getContent({
    user: 'jsdelivr',
    repo: 'jsdelivr',
    path: ''
  }, function(err, res) {
    if(err) {
      return cb(err);
    }

    var sha = res.filter(function(v) {
      return v.name === 'files';
    })[0].sha;

    github.gitdata.getTree({
      user: 'jsdelivr',
      repo: 'jsdelivr',
      sha: sha
    }, function(err, res) {
      if(err) {
        return cb(err);
      }

      if(!res.tree) {
        return cb(new Error('Missing tree'));
      }

      // get each dir under /files
      var dirs = res.tree.filter(function(v) {
        return v.mode.indexOf('040') === 0;
      });

      var files = [];

      async.eachLimit(dirs, 8, function(dir, done) {

        var config = {
          user: 'jsdelivr',
          repo: 'jsdelivr',
          sha: dir.sha,
          recursive: 1 // just recurse these smaller directories
        };
        if(etags[dir.sha]) // add conditional request
          config.headers = {
            "If-None-Match": etags[dir.sha]
          };
        github.gitdata.getTree(config, function(err, res) {
          // skip invalid entries, don't abort the entire update
          if (!err && res.tree) {
            //console.log(JSON.stringify(res.meta));

            //set sha => etag map so we know the response state
            etags[dir.sha] = res.meta["etag"];
            res.tree.forEach(function(file) {
              // prepend the original base dir
              file.path = dir.path + '/' + file.path;
              files.push(file);
            });
          }

          setImmediate(done);
        });
      }, function(err) {
        var filtered = files.filter(function(v) {
          return v.mode.indexOf('100') === 0;
        }).map(prop('path')).filter(contains('/'));

        cb(null, filtered, etags);
      });


    });
  });
}
