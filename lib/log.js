import Logger from 'le_node';
import config from '../config';

export default new Logger({
	withStack: true,
	timestamp: true,
	console: true,
	token: config.logentriesToken,
	bufferSize: 4000,
});

