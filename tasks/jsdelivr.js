'use strict';

var url = require('url');

var async = require('async');
var extend = require('extend');
var fp = require('annofp');
var prop = fp.prop;
var values = fp.values;

var request = require('request');
var ini = require('ini');

var utils = require('../lib/utils');
var contains = utils.contains;
var is = utils.is;


module.exports = function(github) {
    return function(cb) {
        getFiles(function(err, files) {
            if(err) {
                return cb(err);
            }

            parse(files, cb);
        });
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
                                assets: {} // version -> assets
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
                sha: sha,
                recursive: 1
            }, function(err, res) {
                if(err) {
                    return cb(err);
                }

                if(!res.tree) {
                    return cb(new Error('Missing tree'));
                }

                // mode, 100644 === blob that is file
                cb(null, res.tree.filter(is('mode', '100644')).map(prop('path')).
                    filter(contains('/')));
            });
        });
    }
};
