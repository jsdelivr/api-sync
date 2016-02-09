import * as path from 'path';

import _ from 'lodash';
import gift from 'gift';
import Promise from 'bluebird';

import log from '../../lib/log';

let readDirRecursive = Promise.promisify(require('recursive-readdir'));

export default function (taskConfig, eTagMap) {
	let repo = Promise.promisifyAll(gift(taskConfig.gitPath));
	let rootPath = path.join(taskConfig.gitPath, taskConfig.filePath || '');

	log.info(`Pulling changes for the bootstrap repo...`);

	return repo.pullAsync().then(() => {
		log.info(`Done bootstrap pull...`);
		return readDirRecursive(rootPath);
	}, (error) => {
		log.err(`Could not pull repo ${taskConfig.gitPath}`);
		throw error;
	}).then(function (files) {
		return parse(files.map(file => path.relative(rootPath, file).replace(/\\/g, '/')), eTagMap);
	}).filter(project => project);
}

let pattern = /^([^/]+)\/(\d+(\.\d+){0,2}[^/]*)/i;

function parse(files, eTagMap) {
    let libraries = {};

	_.forEach(files, (file) => {
        let fName = file.replace(/(?:\.min|\.pack)?\.\w+$/i, '');

        if (pattern.test(fName)) {
            let match = fName.match(pattern);
            let name = match[1];
            let version = match[2];

            if (!libraries[name]) {
                libraries[name] = {
                    name: name,
                    versions: [],
                    assets: {}
                }
            }

            if(!~libraries[name].versions.indexOf(version)) {
                libraries[name].versions.push(version);
            }

            if(!libraries[name].assets[version]) {
                libraries[name].assets[version] = [];
            }

            libraries[name].assets[version].push(file.substr(name.length + version.length + 2));
        }
    });

    _.forEach(libraries, (project) => {
        eTagMap[project.name] = project.name;
    });

	// alias for v1 https://github.com/jsdelivr/api/issues/94
	libraries.bootstrap = _.cloneDeep(libraries['twitter-bootstrap']);
	libraries.bootstrap.name = 'bootstrap';
	eTagMap.bootstrap = 'twitter-bootstrap';

    return _.map(libraries, (project) => {
        project.assets = _.map(project.assets, (files, version) => {
            return { files, version, mainfile: '' };
        });

        return project;
    });
}
