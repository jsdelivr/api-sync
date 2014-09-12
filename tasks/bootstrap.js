'use strict';

var fp = require('annofp');
var not = fp.not;
var prop = fp.prop;
var values = fp.values;

var utils = require('../lib/utils');
var contains = utils.contains;
var startsWith = utils.startsWith;


module.exports = function(github) {
    return function(cb) {
        getFiles(function(err, files) {
            if(err) {
                return cb(err);
            }
            //=start v1 bugfix https://github.com/jsdelivr/api/issues/50
            var objParsed = parse(files);

            // clones sub-array that contains `"name": "twitter-bootstrap"` http://stackoverflow.com/a/15997913/1324588
            var matchIndex,
                objBootstrap = [],
                objFixed = [];
            objParsed.some(function(entry, i) { //some stops at first match
                if (entry.name === "twitter-bootstrap") {
                    matchIndex = i;
                    return true;
                }
            });
            objBootstrap = JSON.parse(JSON.stringify(objParsed[matchIndex])); // copys sub-array
            objBootstrap.name = "bootstrap";

            // merge fix, leaving "twitter-bootstrap" in for compatabilty
            objFixed = JSON.stringify(objParsed).substr(1); // original array without the first character, which should be `[`
            objFixed = "[" + JSON.stringify(objBootstrap) + "," + objFixed; // prepend correction
            objFixed = JSON.parse(objFixed); // make into Object again

            cb(null, objFixed);
            //=end v1 bugfix https://github.com/jsdelivr/api/issues/50

/*
            //=start v2 bugfix, dropping "twitter-bootstrap" compatabilty https://github.com/jsdelivr/api/issues/50
            var objParsed = parse(files);

            // simply replaces `"name": "twitter-bootstrap"` with "bootstrap"
            objParsed.some(function(entry, i) { //some stops at first match
                if (entry.name === "twitter-bootstrap") { entry.name = "bootstrap" }
            });

            cb(null, objParsed);
            //=end v2 bugfix https://github.com/jsdelivr/api/issues/50
*/
        });
    };

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

    function getFiles(cb) {
        github.repos.getContent({
            user: 'maxcdn',
            repo: 'bootstrap-cdn',
            path: ''
        }, function(err, res) {
            if(err) {
                return cb(err);
            }

            var sha = res.filter(function(v) {
                return v.name === 'public';
            })[0].sha;

            github.gitdata.getTree({
                user: 'maxcdn',
                repo: 'bootstrap-cdn',
                sha: sha,
                recursive: 1
            }, function(err, res) {
                if(err) {
                    return cb(err);
                }

                if(!res.tree) {
                    return cb(new Error('Missing tree'));
                }

                var filtered = res.tree.filter(function(v) {
                    return v.mode.indexOf('100') === 0;
                }).map(prop('path')).
                    filter(contains('/')).
                    filter(not(startsWith('images/'))).
                    filter(not(startsWith('stylesheets/')));

                cb(null, filtered);
            });
        });
    }
};
