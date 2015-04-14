'use strict';

var url = require('url')
  , request = require('request')
  , _ = require("lodash")
  , async = require("async")

  , log = require('../lib/log')
  , utils = require('../lib/utils');


module.exports = function(github) {

  return function(cb) {

    var repoOwner = "cdnjs"
      , repoName = "cdnjs"
      , rootShaFn = function(v) {
        return v.name === 'libs';
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

      filtered = _.filter(files,_allowed);
      parse(filtered, cb);
    }, {path:"/ajax"});
  };
};

function parse(files, cb) {
  var base = 'https://raw.githubusercontent.com/cdnjs/cdnjs/master/ajax/libs/';
  var ret = {};

  async.eachLimit(files, 4, function(file, cb) {

    var parts = file.path.split('/')
      , name = parts[0]
      , filename, version;

    //init libary object form
    if(!(name in ret)) {
      ret[name] = {
        name: name,
        versions: [],
        assets: {} // version -> assets
      };
    }

    if(parts.length === 2 && parts[1] === "package.json") {
      return _parsePackage(url.resolve(base, file.path), function(err, d) {
        if(err) {
          return setImmediate(cb.bind(null, err));
        }

        _.extend(ret[name], d);

        setImmediate(cb);
      });
    } else {

      version = parts[1];
      filename = parts.slice(2).join('/');

      var lib = ret[name];

      // version
      if (lib.versions.indexOf(version) === -1) {
        lib.versions.push(version);
      }

      // assets
      if (!(version in lib.assets)) {
        lib.assets[version] = {version:version,files:[]};
      }

      //cdnjs represents file size by the kilobyte
      var size = Math.floor(file.size/1000);
      lib.assets[version].files.push({name: filename, size: size});

      setImmediate(cb);
    }
  }, function(err) {

    if(err)
      cb(err);
    else
      cb(null,_toV1Format(ret));
  });
}

//massage the response data according to v1 format
function _toV1Format(ret) {
  return _.map(ret, function(library) {
    library.assets = _.map(library.assets, function(asset) {
      return {version:asset.version,files:asset.files};
    });
    return library;
  });
}

//map cdnjs package.json to jsdelivr api schema
function _parsePackage(url, cb)  {

  var _hasMaintainers = function(json) {
    return (json.maintainers && json.maintainers.length);
  };

  request.get(url, function(err, res, data) {
    if(err) {
      return cb(err);
    }

    var resp = {};
    try {
      var json = JSON.parse(data);
      resp.mainfile = json.filename || null;
      resp.author = json.author || null;
      resp.lastversion = json.version || null;
      resp.homepage = json.homepage || null;
      resp.description = json.description || null;

      //TODO do we want to attempt something like this to fill in partial/missing metadata?
      //
      //attempt to get author info from maintainers field
      /*if(!resp.author && _hasMaintainers(json)) {
        resp.author = json.maintainers[0].name || null;
      }

      //attempt to get homepage info from maintainers field
      if(!resp.homepage && _hasMaintainers(json)) {
        resp.homepage = json.maintainers[0].web || null;
      }*/

    } catch (err) {console.error(err);}

    cb(null, resp);
  });
}

