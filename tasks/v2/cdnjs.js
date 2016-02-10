import _ from 'lodash';
import gift from 'gift';
import Promise from 'bluebird';

import readRepo from '../../lib/read-repo';
import log from '../../lib/log';

let fs = Promise.promisifyAll(require('fs-extra'));

export default function (taskConfig, eTagMap) {
	let repo = Promise.promisifyAll(gift(taskConfig.gitPath));
	log.info(`Pulling changes for the cdnjs repo...`);

	return repo.pullAsync().then(() => {
		log.info(`Done cdnjs pull...`);
		return readRepo(taskConfig);
	}, (error) => {
		log.err(`Could not pull repo ${taskConfig.gitPath}`);
		throw error;
	}).then((projects) => {
		return Promise.all(_.map(projects, (versions, name) => {
			if (typeof versions['package.json'] !== 'string') {
				log.warning(`${name} is missing package.json -- SKIPPING`);
				return null;
			}

			let project = {
				name,
				assets: {},
				versions: [],
				zip: `${name}.zip`,
			};

			return fs.readFileAsync(versions['package.json']).then((data) => {
				let info = {};
				let json = JSON.parse(data);

				info.mainfile = _.result(json, 'filename', null);
				info.lastversion = _.result(json, 'version', null);
				info.homepage = _.result(json, 'homepage', null);
				info.description = _.result(json, 'description', null);

				if (_.isString(json.author)) {
					info.author = json.author;
				} else if (_.isObject(json.author) && json.author.name) {
					info.author = json.author.name;
				} else {
					info.author = null;
				}

				if (json.repository) {
					info.repositories = [ json.repository ];
				} else if (json.repositories) {
					info.repositories = json.repositories;
				} else {
					info.repositories = [];
				}

				let hasMaintainers = json.maintainers && json.maintainers.length;

				// attempt to get author info from maintainers field
				if (!info.author && hasMaintainers) {
					info.author = _.result(json, 'maintainers[0].name', null);
				}

				// attempt to get homepage info from maintainers field
				if (!info.homepage && hasMaintainers) {
					info.homepage = _.result(json, 'maintainers[0].web', null);
				}

				// attempt to get github information from repositories field
				let githubRepositoryObj = getGithubRepository(json);

				if (!info.github && githubRepositoryObj) {
					info.github = githubRepositoryObj.url;
				}

				return info;
			}).catch((error) => {
				log.warning(`Couldn't read package.json for ${name} -- SKIPPING`);
				log.warning(error);
			}).then((info) => {
				_.extend(project, info);

				_.each(versions, (files, version) => {
					// ignore package.json
					if (typeof files === 'string') {
						return;
					}

					project.versions.push(version);

					project.assets[version] = {
						baseUrl: `${taskConfig.cdnRoot}/${name}/${version}/`,
						files,
						mainfile: info.mainfile,
					};
				});

				delete versions['package.json'];

				return project;
			});
		}, { concurrency: 50 }));
	}).filter(project => project).each((project) => {
		eTagMap[project.name] = project.name;
	});
}

function getGithubRepository (json) {
	if (json.repository) {
		if (/github\.com/.test(json.repository.url)) {
			return json.repository;
		}
	}

	return _.find(json.repositories, repository => /github\.com/.test(repository.url));
}
