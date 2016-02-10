import * as path from 'path';

import _ from 'lodash';
import gift from 'gift';
import Promise from 'bluebird';

import log from '../../lib/log';

let readDirRecursive = Promise.promisify(require('recursive-readdir'));

export default function (taskConfig, eTagMap) {
	let repo = Promise.promisifyAll(gift(taskConfig.gitPath));
	let rootPath = path.join(taskConfig.gitPath, taskConfig.filePath || '');

	log.info(`Pulling changes for the jquery repo...`);

	eTagMap['jquery'] = '/';
	eTagMap['jquery.color'] = 'color';
	eTagMap['jquery.migrate'] = '/';
	eTagMap['jquery-mobile'] = 'mobile';
	eTagMap['jquery-ui'] = 'ui';
	eTagMap['pep'] = 'pep';
	eTagMap['qunit'] = 'qunit';

	return repo.pullAsync().then(() => {
		log.info(`Done jquery pull...`);
		return readDirRecursive(rootPath);
	}, (error) => {
		log.err(`Could not pull repo ${taskConfig.gitPath}`);
		throw error;
	}).then(function (files) {
		return parse(files.map(file => path.relative(rootPath, file).replace(/\\/g, '/')));
	}).filter(project => project);
}

let patterns = {
	'jquery': /^jquery(?:-compat)?-(\d+(\.\d+){0,2}[^.]*)/i,
	'jquery-ui': /^ui\/(\d+(\.\d+){0,2}[^/]*)/i,
	'jquery-mobile': /^mobile\/(\d+(\.\d+){0,2}[^/]*)/i,
	'jquery.migrate': /^jquery-migrate-(\d+(\.\d+){0,2}[^/]*)/i,
	'jquery.color': /^color\/[^/]*?(\d+(\.\d+){0,2}[^/]*)/i,
	'qunit': /^qunit\/qunit-(\d+(\.\d+){0,2}[^/]*)/i,
	'pep': /^pep\/(\d+(\.\d+){0,2}[^/]*)/i,
};

function parse(files) {
	let libraries = {};

	_.forEach(files, (file) => {
		let fName = file.replace(/(?:\.min|\.pack)?\.\w+$/i, '');
		let name = _.findKey(patterns, pattern => pattern.test(fName));

		if (name) {
			let version = fName.match(patterns[name])[1];

			if (!libraries[name]) {
				libraries[name] = {
					name,
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

			libraries[name].assets[version].push(file);
		}
	});

	return _.map(libraries, (library) => {
		library.assets = _.map(library.assets, (files, version) => {
			return { files, version, mainfile: '' };
		});

		return library;
	});
}
