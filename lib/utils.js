
"use strict";

var path = require("path")
  , fs = require("fs")
  , async = require("async")
  , log = require("./log")
  , mail = require("./mail");

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

  var etagsFilePath = path.resolve(__dirname,"../data/" + repoName + "_etags.json")
    , options = _options || {};

  //attempt to get etags file
  var etags;
  try {
    etags = require(etagsFilePath);
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
      if(err) {
        return cb(err);
      }

      if(!res.tree) {
        return cb(new Error("Unable to retrieve tree for " + repoName + " under sha " + sha));
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
        if(etags[dir.sha]) // add conditional request
          config.headers = {
            "If-None-Match": etags[dir.sha]
          };

        githubClient.gitdata.getTree(config, function(err, res) {

          // skip invalid entries, don't abort the entire update
          if (!err && res.tree) {

            //set sha => etag map so we know the response state
            etags[dir.sha] = res.meta["etag"];
            res.tree.forEach(function(file) {
              // prepend the original base dir
              file.path = dir.path + '/' + file.path;
              files.push(file);
            });
          }

          done();
        });
      }, function(err) {

        if(!err) {
          // write etags value to file
          fs.writeFile(etagsFilePath, JSON.stringify(etags), function (err) {
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
