var fs = require('fs');
var path = require('path');
var async = require('async');
var lsR = require('recursive-readdir');
var _ = require('lodash');

function reduceLs(filePath, mapper, cb) {
  fs.readdir(filePath, function(err, result) {
    var memo = {};
    async.each(result, function(name, cb) {
      mapper(name, path.join(filePath, name), function(err, res) {
        if (res) {
          memo[name] = res;
        }
        cb(err, memo);
      });
    }, function(err) {
      cb(err, memo);
    });
  });
}

function getProject(name, projPath, cb) {
  reduceLs(projPath, function(name, versionPath, cb) {
    fs.stat(versionPath, function(err, stat) {
      if (stat.isFile()) {
        cb(err, versionPath);
      } else {
        lsR(versionPath, function(err, result) {
          cb(err, result.map(function(p) {
            return p.slice(versionPath.length + 1);
          }));
        });
      }
    });
  }, function(err, result) {
    cb(err, result);
  });
}

module.exports.getFiles = function(options, cb) {
  var filePath = path.join(options.gitPath, options.filePath || '');
  
  reduceLs(filePath, function(name, path, cb) {
    fs.stat(path, function(err, stat) {
      if (stat.isDirectory()) {
        getProject(name, path, function(err, res) {
          cb(err, res);
        });
      } else {
        cb(err, false);
      }
    });
  }, function(err, result) {
    cb(err, result);
  });
};
