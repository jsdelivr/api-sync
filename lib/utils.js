
"use strict";

var path = require("path")
  , fs = require("fs")
  , _ = require("lodash")
  , async = require("async")
  , log = require("./log")
  , mail = require("./mail");

var _maxDive = 5;

module.exports.contains = function contains(str) {
    return function(v) {
        return v.indexOf(str) >= 0;
    };
};

module.exports.startsWith = function startsWith(str) {
    return function(v) {
        return v.indexOf(str) === 0;
    };
};

// heavy lifting for all github based api syncs
// function will selectively update data/<library>.json files according to github etag status
// and return an array of all files
module.exports.githubGetFiles = function(githubClient,repoOwner,repoName,rootShaFn,cb,_options) {

  var etagsFilePath = path.resolve(__dirname,"../data/" + repoName + ".json")
    , options = _options || {};

  //attempt to get etags file
  var etags;
  try {
    // clear the cache node require etag cache first
    delete require.cache[etagsFilePath];
    etags = _.indexBy(require(etagsFilePath), "sha");
  } catch(err) {
    log.info(repoName +  " has no cached etags file, starting from scratch");
    etags = {};
  }

  //get the top level repo structure

  githubClient.repos.getContent({
    user: repoOwner,
    repo: repoName,
    path: options.path || ""
  }, function(err, res) {
    if (err) {
      return cb(err);
    }

    var tree = res.filter(rootShaFn)
      , files = [];

    // error out if no tree was returned for the repo
    if(typeof tree[0] === "undefined") return cb(new Error("Unable to retrieve tree for " + repoName));

    var sha = tree[0].sha;

    githubClient.gitdata.getTree({
      user: repoOwner,
      repo: repoName,
      sha: sha
    }, function(err, res) {
      if(err || !res.tree) {
        return cb(err || new Error("Unable to retrieve tree for " + repoName + " under sha " + sha));
      }

      // get each dir in the tree
      var dirs = res.tree.filter(function(v) {
        return v.mode.indexOf('040') === 0;
      });

      async.eachLimit(dirs, 8, function(dir, done) {

        var config = {
          user: repoOwner,
          repo: repoName,
          sha: dir.sha,
          recursive: 1 // just recurse these smaller directories
        };

        if(etags[dir.sha] && etags[dir.sha].etag) // add conditional request
          config.headers = {
            "If-None-Match": etags[dir.sha].etag
          };

        _getTree(githubClient,dir,files,etags,config,done);
      }, function(err) {

        if(!err) {
          // write etags value to file
          fs.writeFile(etagsFilePath, JSON.stringify(_.map(etags, function (metadata) {
            return metadata
          })), function (err) {
            if (err) {
              log.err("failed to save " + repoName + " etags ", err);
            } else {
              log.info(repoName + " etags saved to " + etagsFilePath);
            }

            // don't err out if the etags don't save, just log it
            cb(null, files);
          });
        }
        else {
          mail.error(err);
          log.err("Error getting github files for repo " + repoName,err);
          cb(err, []);
        }
      });
    });
  });
};

function _getTree(githubClient,dir,files,etags,config,done) {
  var skipCache = config.skipCache ? config.skipCache : false
    , depth = config.depth ? config.depth : 0;

  delete config.skipCache;
  delete config.depth;

  githubClient.gitdata.getTree(config, function(err, res) {
    // skip invalid entries, don't abort the entire update
    if (!err && res.tree) {

      //set sha => etag map so we know the response state
      if(!skipCache) {
        _writeMetaData(etags, dir, res);
      }
      res.tree.forEach(function(file) {
        // prepend the original base dir
        file.path = path.join(dir.path,file.path);
        files.push(file);
      });

      done();
    }
    else if(err) {
      //if it's a gateway timeout, try a dive!
      if(err.code == "504" && depth < _maxDive) {
        log.info("Get gitTree request timed out",dir);
        config.depth = depth + 1;
        _dive(githubClient,dir,files,etags,config,done);
      }
      else {
        //delete the sha on error so we attempt to get this library next time
        delete etags[dir.sha];
        log.err("Error getting github tree ",dir, err);
        done();
      }
    }
    else {
      done();
    }
  });
}

// some libraries (like mathjax in cdnjs) are far too large to be retrieved in a single recurrsive call
// resulting in github returning a 504 gateway timeout, _dive mitigates this by delving one level farther down the tree
// before attempting a recursive call to github. The maximum number of level dive may traverse is controlled by the
// _maxDive variable.
function _dive(githubClient,_dir,_files,etags,_config,done) {

  log.info("Attempting to dive at depth " + _config.depth,_config);

  var depth = _config.depth;
  delete _config.depth;
  delete _config.recursive;

  var _dirs = []
    , _contentDirs = [];

  async.series([

    //get the directories under the root mathjax folder, these are all version folders and the package.json
    function(next) {
      githubClient.gitdata.getTree(_config, function(err, res) {
        if(err) {
          return next(err);
        }
        else if (!res.tree) {
          err = new Error("The cache is up to date.");
          err.code = 304;
          return next(err);
        }

        //this is the root of our dive, we want to preserve this eTag
        if (depth === 1) {
          _writeMetaData(etags, _dir, res);
        }

        //grab files at this level
        var files = _.filter(res.tree, function(v) {
          return (/100/g).test(v.mode)
        });
        _.each(files, function(file) {
          file.path = path.join(_dir.path,file.path);
          _files.push(file);
        });

        _dirs = _.filter(res.tree, function(v) {
          return v.mode.indexOf('040') === 0;
        });
        _.each(_dirs, function(dir) {
          //maintain the path structure
          dir.path = path.join(_dir.path,dir.path);
        });

        next();
      });
    },

    //get the top level structure of the root version folder
    function(next) {
      async.each(_dirs, function(_dir,done) {

        var config = {
          user: _config.user,
          repo: _config.repo,
          sha: _dir.sha,
          skipCache: true
        };

        githubClient.gitdata.getTree(config, function(err, res) {

          //just skip the error here, we don't want to error out of updating the other versions
          if (err || !res.tree) {
            return done();
          }

          //grab files at this level
          var files = _.filter(res.tree, function(v) {
            return (/100/g).test(v.mode)
          });
          _.each(files, function(file) {
            file.path = path.join(_dir.path,file.path);
            _files.push(file);
          });

          var contentDirs = _.filter(res.tree, function(v) {
            return v.mode.indexOf('040') === 0;
          });
          _.each(contentDirs, function(dir) {
            //maintain the path structure
            dir.path = path.join(_dir.path,dir.path);
          });

          _contentDirs = _contentDirs.concat(contentDirs);

          done();
        });
      }, next);
    },

    //now get each of the collected dirs via our common _getTree function
    function(next) {
      async.eachLimit(_contentDirs, 8, function(_dir, done) {
        var config = {
          user: _config.user,
          repo: _config.repo,
          sha: _dir.sha,
          recursive: 1,
          skipCache: true,
          depth: depth
        };
        _getTree(githubClient,_dir,_files,etags,config,done);
      }, next);
    }
  ], function(err) {
    if(err && err.code === 304)
      log.info("Cache is up to date",_dir);
    else if(err)
      log.err("Error getting library",err);
    else
      log.info("Dive into path " + _dir.path + " complete.",_dir);

    done();
  });
}

function _writeMetaData(etags, dir, res) {

  if (!etags[dir.sha])
    etags[dir.sha] = {};

  etags[dir.sha].etag = res.meta["etag"];
  etags[dir.sha].path = dir.path;
  etags[dir.sha].sha = dir.sha;
}
