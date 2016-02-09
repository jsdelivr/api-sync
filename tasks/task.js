import path from 'path';

import _ from 'lodash';
import gift from 'gift';
import Promise from 'bluebird';

import log from '../lib/log';
import mail from '../lib/mail';
import sortVersions from '../lib/sort-versions';

let fs = Promise.promisifyAll(require('fs-extra'));

export default function (name, taskConfig, output) {
	return Promise.try(() => {
		log.info(`Starting to update ${name} data...`);
		let eTagMap = {};
		let successCount = 0;
		let errorCount = 0;

		return require('./' + name)(taskConfig, eTagMap).then((libraries) => {
			libraries = libraries.map((library) => {
				// skip if library is missing versions for some reason
				if (!library.versions || !library.versions.length) {
					log.warning(`Failed to find versions for ${library.name}`);

					// remove the library from the etag map as well
					if (taskConfig.gitPath) {
						delete eTagMap[library.name];
					} else {
						delete eTagMap.data[library.name];
					}

					return;
				}

				library.versions = sortVersions(library.versions);
				library.lastversion = library.versions[0];

				return library;
			}).filter(library => library);

			return Promise.map(libraries, (library) => {
				let p = path.resolve(__dirname, '../', output, name, library.name, 'library.json');
				let s = JSON.stringify(library);

				return fs.mkdirpAsync(path.dirname(p)).then(() => {
					return fs.writeFileAsync(p, s)
				}).then(() => {
					successCount++;
					log.info(`Successfully synced CDN:library ${name}:${library.name}`);
				}).catch((error) => {
					error++;
					log.err(`Error writing file for ${name}:${library.name}`);
					log.err(error);
				});
			}, { concurrency: 50 }).catch((error) => {
				log.err(`Error syncing CDN ${name}`);
				log.err(error);
			});
		}).then(() => {
			log.info(`Synced CDN ${name}, successfully updated ${successCount} libraries and failed to update ${errorCount} libraries`);

			if (taskConfig.gitPath) {
				return inferEtags(name, taskConfig.gitPath, taskConfig.filePath, eTagMap);
			}

			let etagsFilePath = path.resolve(__dirname, '../data/', `${name}.json`);

			return fs.writeFileAsync(etagsFilePath, JSON.stringify(eTagMap.data)).then(() => {
				log.info(`${name} etags saved to ${etagsFilePath}`);
			}).catch(() => {
				log.err(`Failed to save ${name} etags`);
				log.err(err);
			});
		}).catch((error) => {
			let message = `Failed to update ${name} data`;

			log.err(name);
			log.err(error);
			mail.error(message);

			throw error;
		});
	});
};

function inferEtags (target, gitPath, filePath, map) {
	let scope = (trees, levelPaths, cb) => {
		let levelPath = levelPaths[0];
		let dataDirTree = _.find(trees, { name: levelPath });

		if (levelPaths.length === 1) {
			cb(null, dataDirTree)
		} else {
			dataDirTree.trees((err, trees) => {
				if (!err) {
					scope(trees, levelPaths.slice(1), cb);
				} else {
					cb(err);
				}
			});
		}
	};

	return new Promise((resolve, reject) => {
		let repo = gift(gitPath);
		let etagsFilePath = path.resolve(__dirname, '../data/', `${target}.json`);

		repo.current_commit((err, commit) => {
			if (!err) {
				commit.tree().trees((err, trees) => {
					scope(trees, filePath.split('/'), (err, dataDirTree) => {
						dataDirTree.trees((err, projTrees) => {
							let etags = _.map(map, (gitPath, path) => {
								let id = (gitPath === '/' ? dataDirTree : _.find(projTrees, tree => tree.name === gitPath)).id;

								return {
									path,
									etag: `"${id}"`,
									sha: id,
								};
							});

							fs.writeFileAsync(etagsFilePath, JSON.stringify(etags)).then(() => {
								log.info(`${target} etags saved to ${etagsFilePath}`);
							}).catch(() => {
								log.err(`Failed to save ${target} etags`);
								log.err(err);
							}).finally(resolve);
						});
					});
				}, reject);
			} else {
				reject(err);
			}
		});
	});
}
