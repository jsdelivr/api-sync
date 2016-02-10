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
		return parse(files.map(file => path.relative(rootPath, file).replace(/\\/g, '/')), taskConfig, eTagMap);
	}).filter(project => project);
}

let pattern = /^([^/]+)\/(\d+(\.\d+){0,2}[^/]*)/i;

function parse(files, taskConfig, eTagMap) {
	let libraries = {};

	_.forEach(files, (file) => {
		let fName = file.replace(/(?:\.min|\.pack)?\.\w+$/i, '');

		if (pattern.test(fName)) {
			let match = fName.match(pattern);
			let name = match[1];
			let version = match[2];

			// several projects here, see https://github.com/jsdelivr/api/issues/56
			if (name === 'bootswatch') {
				let folder = fName.split('/')[2];

				if (!/fonts|img/i.test(folder)) {
					name += '.' + folder;
				}
			}

			if (!libraries[name]) {
				libraries[name] = {
					name: name,
					versions: [],
					assets: {},
				}
			}

			if(!~libraries[name].versions.indexOf(version)) {
				libraries[name].versions.push(version);
			}

			if(!libraries[name].assets[version]) {
				let bp = fName.split('/').slice(0, name.indexOf('bootswatch.') === 0 ? 3 : 2).join('/');

				libraries[name].assets[version] = {
					baseUrl: `${taskConfig.cdnRoot}/${bp}/`,
					files: [],
					mainfile: '',
				};
			}

			libraries[name].assets[version].files.push(file.substr(name.length + version.length + 2));
		}
	});

	_.forEach(libraries, (project) => {
		if (/^bootswatch/i.test(project.name)) {
			eTagMap[project.name] = 'bootswatch';
		} else {
			eTagMap[project.name] = project.name;
		}
	});

	return _.values(libraries);
}
