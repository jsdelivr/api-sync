import Logger from 'le_node';
import config from '../config';

let logger = new Logger({
	withStack: true,
	timestamp: true,
	console: true,
	token: config.logentriesToken,
	bufferSize: 4000,
});

logger.on('error', (error) => {
	console.error('Logger error:', error);
});

export default logger;
