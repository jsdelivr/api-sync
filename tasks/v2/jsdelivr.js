import * as path from 'path';

import _ from 'lodash';
import ini from 'ini';
import gift from 'gift';
import Promise from 'bluebird';

import readRepo from '../../lib/read-repo';
import log from '../../lib/log';

let fs = Promise.promisifyAll(require('fs-extra'));

export default function (taskConfig, eTagMap) {
	let repo = Promise.promisifyAll(gift(taskConfig.gitPath));
	log.info(`Pulling changes for the jsDelivr repo...`);

	return repo.pullAsync().then(() => {
		log.info(`Done jsDelivr pull...`);
		return readRepo(taskConfig);
	}, (error) => {
		log.err(`Could not pull repo ${taskConfig.gitPath}`);
		throw error;
	}).then((projects) => {
		return Promise.all(_.map(projects, (versions, name) => {
			if (typeof versions['info.ini'] !== 'string') {
				log.warning(`${name} is missing info.ini -- SKIPPING`);
				return null;
			}

			let project = {
				name,
				assets: {},
				versions: [],
				zip: `${name}.zip`,
			};

			return fs.readFileAsync(versions['info.ini']).then((data) => {
				return ini.parse(String(data));
			}, (error) => {
				log.warning(`Couldn't read info.ini for ${name} -- SKIPPING`);
				log.warning(error);
			}).then((info) => {
				if (info.hide === true || info.hide === "true") {
					log.info(`${name} has a property "hide" set to "true" -- SKIPPING`);
					return null;
				}

				_.extend(project, info);

				if (info.github) {
					project.repositories = [ { type: 'git', url: info.github } ];
				} else {
					project.repositories = [];
				}

				return Promise.all(_.map(versions, (files, version) => {
					// ignore info.ini and update.json
					if (typeof files === 'string') {
						return null;
					}

					project.versions.push(version);

					if (!_.includes(files, 'mainfile')) {
						project.assets[version] = {
							files: files,
							mainfile: info.mainfile,
						};
					} else {
						_.pull(files, 'mainfile');

						return fs.readFileAsync(path.join(taskConfig.gitPath, taskConfig.filePath || '', name, version, 'mainfile')).then((f) => {
							project.assets[version] = {
								files: files,
								mainfile: f,
							};
						})
					}
				})).then(() => {
					delete versions['info.ini'];
					delete versions['update.json'];
				}).then(() => project);
			});
		}, { concurrency: 50 }));
	}).filter(project => project).each((project) => {
		eTagMap[project.name] = project.name;
	});
}
