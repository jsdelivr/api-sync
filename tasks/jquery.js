'use strict';

var gift = require('gift');
var path = require('path');
var readDirRecursive = require('recursive-readdir');
var _ = require('lodash');

var log = require('../lib/log');

module.exports = function(github, conf) {
    var repo = gift(conf.gitPath);

    return function (cb, eTagMap) {
        log.info('Pulling changes for the jquery repo...');
        repo.pull(function (err) {
            let rootPath = path.join(conf.gitPath, conf.filePath);

            if (err) {
                cb(err);
                return log.err('Could not pull repo' + conf.gitPath);
            }
            log.info('Done pull...');

            eTagMap['jquery'] = '/';
            eTagMap['jquery.color'] = 'color';
            eTagMap['jquery.migrate'] = '/';
            eTagMap['jquery-mobile'] = 'mobile';
            eTagMap['jquery-ui'] = 'ui';
            eTagMap['pep'] = 'pep';
            eTagMap['qunit'] = 'qunit';

            readDirRecursive(rootPath, function (err, files) {
                if (err) {
                    return cb(err);
                }

                cb(null, parse(files.map(file => path.relative(rootPath, file).replace(/\\/g, '/'))))
            });
        });
    };
};

const patterns = {
    'jquery': /^jquery(?:-compat)?-(\d+(\.\d+){0,2}[^.]*)/i,
    'jquery-ui': /^ui\/(\d+(\.\d+){0,2}[^/]*)/i,
    'jquery-mobile': /^mobile\/(\d+(\.\d+){0,2}[^/]*)/i,
    'jquery.migrate': /^jquery-migrate-(\d+(\.\d+){0,2}[^/]*)/i,
    'jquery.color': /^color\/[^/]*?(\d+(\.\d+){0,2}[^/]*)/i,
    'qunit': /^qunit\/qunit-(\d+(\.\d+){0,2}[^/]*)/i,
    'pep': /^pep\/(\d+(\.\d+){0,2}[^/]*)/i,
};

function parse(files) {
    var ret = {};

    files.forEach(function (file) {
        let fName = file.replace(/(?:\.min|\.pack)?\.\w+$/i, '');
        let name = _.findKey(patterns, pattern => pattern.test(fName));

        if (name) {
            let version = fName.match(patterns[name])[1];

            if (!ret[name]) {
                ret[name] = {
                    name,
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

    return _.map(ret, (project) => {
        // convert to v1 format
        project.assets = _.map(project.assets, (files, version) => {
            return { files, version };
        });

        return project;
    });
}
