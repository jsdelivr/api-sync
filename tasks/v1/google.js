import * as path from 'path';

import got from 'got';
import cheerio from 'cheerio';
import Promise from 'bluebird';

import log from '../../lib/log';

export default function (taskConfig, eTagMap) {
	eTagMap.data = [];

	return Promise.resolve(got('https://developers.google.com/speed/libraries/devguide')).then((response) => {
		log.info(`Fetched google data`);

		let $ = cheerio.load(response.body, { normalizeWhitespace: true });
		let $libs = $('div[itemprop="articleBody"]').children();
		let libs = [];

		$libs.each((index, element) => {
			let $element = $(element);

			if (element.name === 'h3') {
				try {
					let $libElements = $element.next().find('dd');
					let $versionElements = $element.next().find('dd.versions');
					let homepage = $($libElements[1]).find('a').attr('href');
					let mainfile = $libElements.find('code').text().split('"').slice(-2, -1)[0].split('/').slice(-1)[0];
					let name = $libElements.find('code').text().split('"').slice(-2, -1)[0].split('/')[5];
					let hasMin = ~$libElements.find('code').text().indexOf('.min.js');
					let versions = [];

					$versionElements.each((i, e) => {
						versions.push(...$(e).text().split(',').filter(v => v).map(v => v.trim()));
					});

					libs.push({
						name,
						mainfile,
						homepage,
						versions,
						assets: getAssets(mainfile, versions, hasMin),
					});
				} catch (error) {
					log.err(`Error parsing google data`);
					throw error;
				}
			}
		});

		return libs;
	}).catch((error) => {
		log.err(`Could not get https://developers.google.com/speed/libraries/devguide`);
		throw error;
	}).each((library) => {
		eTagMap.data.push({
			path: library.name,
			etag: Date.now(),
		});
	});
}

function getAssets (mainfile, versions, hasMin) {
	var name = path.basename(path.basename(mainfile, path.extname(mainfile)), '.min');
	var extensions = [ 'js' ];

	if (hasMin) {
		extensions.push('min.js');
	}

	return versions.reverse().map((version) => {
		return {
			version,
			mainfile,
			files: extensions.map(extension => `${name}.${extension}`),
		};
	});
}
