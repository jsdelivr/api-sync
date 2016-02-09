import path from 'path';
import crypto from 'crypto';

import _ from 'lodash';
import Promise from 'bluebird';
import express from 'express';
import bodyParser from 'body-parser';

import config from './config';
import log from './lib/log';

let fs = Promise.promisifyAll(require('fs-extra'));
let taskUpdating = {};

export default function () {
	handleExit();

	return fs.mkdirpAsync(config.output).then(() => {
		return serve(config);
	}).then(() => {
		return runTasks();
	}).catch((error) => {
		console.error(error);
	});
}

function serve (config) {
	return new Promise((resolve, reject) => {
		let app = express();
		let staticPath = path.join(__dirname, config.output);

		// health route for pingdom
		app.get('/health', (req, res) => {
			res.status(200).json({
				'status': 'jsdelivr api-sync application is up.',
				'date': new Date(),
			});
		});

		// data files route
		app.use('/data', express.static(staticPath));

		// github webhook trigger route
		let webhookRouter = express.Router();

		webhookRouter.use(bodyParser.json({ verify: verifyHmac }));
		webhookRouter.post('/', function (req, res) {

			if (req.body && req.body.ref && req.body.ref === 'refs/heads/master') {
				log.info(`Webhook received for push to jsDelivr master branch - begin jsdelivr update`);
				runTask('jsdelivr');
			} else {
				log.info(`Webhook received for push to jsDelivr branch other than master - do not begin jsdelivr update`);
			}

			res.status(200).end();
		});

		app.use('/webhook', webhookRouter);

		app.listen(config.port, function (err) {
			if (err) {
				return reject(err);
			}

			log.info(`Node (version: ${process.version}) ${process.argv[1]} started on ${config.port}`);
			resolve();
		});
	});
}

let intervalSet = false;

function runTasks () {
	return new Promise((resolve) => {
		let tasks = _(config.tasks)
			.map((task, version) => {
				return Object.keys(task).map(name => `${version}/${name}`);
			})
			.flatten()
			.value();

		log.info(`Running tasks: ${tasks.join(',')}`);

		return Promise.mapSeries(tasks, (name) => {
			taskUpdating[name] = false;
			return runTask(name);
		}).catch((error) => {
			log.err(`Error initializing tasks`);
			log.err(error);
		}).then(() => {
			// then set the interval
			if (!intervalSet) {
				intervalSet = true;
				let interval = 6 * (30 * 1e4);

				// we want to space out the start of each sync cycle by 30 minutes each
				setInterval(() => {
					runTasks().then(() => {
						log.info(`Libraries synced!`);
					});
				}, interval);
			}

			resolve();
		});
	});
}

function runTask (name) {
	return new Promise((resolve) => {
		if (!taskUpdating[name]) {
			taskUpdating[name] = true;

			log.info(`Running task ${name}...`);

			let taskConfig = _.get(config.tasks, name.replace(/\//g, '.'));
			let task = require('./tasks/task');

			try {
				task(name, taskConfig, config.output).catch((error) => {
					log.err(error)
				}).finally(() => {
					taskUpdating[name] = false;
					resolve();
				});
			} catch (error) {
				log.err(error);
				resolve();
			}
		} else {
			log.info(`${name} sync is currently in progress`);
			resolve();
		}
	});
}

// verify github webhook push
function verifyHmac (req, res, buf) {
	let hash = req.header('X-Hub-Signature');
	let hmac = crypto.createHmac('sha1', config.webhookSecret);

	hmac.update(buf);

	let crypted = 'sha1=' + hmac.digest('hex');

	if (crypted === hash) {
		// Valid request, do nothing
		log.info(`Webhook signature is valid, jsDelivr update can proceed - providedSignature: ${hash}, calculatedSignature: ${crypted}`);
	} else {
		// Invalid request
		log.info(`Webhook signature is NOT VALID, jsDelivr update WILL NOT proceed - providedSignature: ${hash}, calculatedSignature: ${crypted}`);
		throw { status: 400, body: 'Wrong signature' };
	}
}

function handleExit () {
	process.on('exit', terminator);

	[ 'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS',
		'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGPIPE', 'SIGTERM'
	].forEach((element) => {
		process.on(element, () => {
			terminator(element);
		});
	});
}

function terminator (sig) {
	if (typeof sig === 'string') {
		log.info(`Received ${sig} - terminating Node server`);
		log.closeConnection();
		process.exit(1);
	} else {
		log.info(`Node server stopped`);
		log.closeConnection();
	}
}
