import path from 'path';
import Promise from 'bluebird';

let fs = Promise.promisifyAll(require('fs-extra'));
let readDirRecursive = Promise.promisify(require('recursive-readdir'));
let concurrency = 40;

export default function (options) {
	let filePath = path.join(options.gitPath, options.filePath || '');
	let projects = {};

	return fs.readdirAsync(filePath).filter((name) => {
		return fs.lstatAsync(path.join(filePath, name)).then(stat => stat.isDirectory());
	}, { concurrency }).map((name) => {
		let projectPath = path.join(filePath, name);
		let project = {};

		return fs.readdirAsync(projectPath).map((version) => {
			let versionPath = path.join(projectPath, version);

			return fs.statAsync(versionPath).then((stat) => {
				if (stat.isFile()) {
					return versionPath;
				}

				return readDirRecursive(versionPath).map(p => p.substr(versionPath.length + 1));
			}).then((files) => {
				project[version] = files;
			});
		}, { concurrency }).then(() => {
			projects[name] = project;
		});
	}, { concurrency }).then(() => projects);
};
