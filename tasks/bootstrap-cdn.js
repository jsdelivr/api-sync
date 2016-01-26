'use strict';

var gift = require('gift');
var path = require('path');
var readDirRecursive = require('recursive-readdir');
var _ = require('lodash');

var log = require('../lib/log');

module.exports = function(github, conf) {
    var repo = gift(conf.gitPath);

    return function (cb, eTagMap) {
        log.info('Pulling changes for the bootstrap repo...');
        repo.pull(function (err) {
            var rootPath = path.join(conf.gitPath, conf.filePath);

            if (err) {
                cb(err);
                return log.err('Could not pull repo' + conf.gitPath);
            }
            log.info('Done pull...');

            readDirRecursive(rootPath, function (err, files) {
                if (err) {
                    return cb(err);
                }

                cb(null, parse(files.map(function (file) { return path.relative(rootPath, file).replace(/\\/g, '/'); }), eTagMap))
            });
        });
    };
};

var pattern = /^([^/]+)\/(\d+(\.\d+){0,2}[^/]*)/i;

function parse(files, eTagMap) {
    var ret = {};

    files.forEach(function (file) {
        var fName = file.replace(/(?:\.min|\.pack)?\.\w+$/i, '');

        if (pattern.test(fName)) {
            var match = fName.match(pattern);
            var name = match[1];
            var version = match[2];

            // several projects here, see https://github.com/jsdelivr/api/issues/56
            if (name === 'bootswatch') {
                var folder = fName.split('/')[2];

                if (!/fonts|img/i.test(folder)) {
                    name += '.' + folder;
                }
            }

            if (!ret[name]) {
                ret[name] = {
                    name: name,
                    versions: [],
                    assets: {}
                }
            }

            if(!~ret[name].versions.indexOf(version)) {
                ret[name].versions.push(version);
            }

            if(!ret[name].assets[version]) {
                ret[name].assets[version] = [];
            }

            ret[name].assets[version].push(file);
        }
    });

    _.forEach(ret, function (project) {
        if (/^bootswatch/i.test(project.name)) {
            eTagMap[project.name] = 'bootswatch';
        } else {
            eTagMap[project.name] = project.name;
        }
    });

    return _.map(ret, function (project) {
        // convert to v1 format
        project.assets = _.map(project.assets, function (files, version) {
            return { files: files, version: version };
        });

        return project;
    });
}
