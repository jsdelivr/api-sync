import nodemailer from 'nodemailer';

import config from '../config';
import log from './log';

let smtpOptions = config.smtp;
smtpOptions.auth = config.smtpAuth;

let transporter = nodemailer.createTransport(smtpOptions);

export default {
	error (message) {
		return send('JsDelivr api-sync: ERROR', message);
	},
	notify (message) {
		return send('JsDelivr api-sync: notify', message);
	},
};

function send (subject, message) {
	return new Promise((resolve, reject) => {
		let subject = new Date() + ' : ' + subject;

		transporter.sendMail({
			to: config.smtpTo.email,
			from: config.smtpFrom.email,
			subject: subject,
			text: message || 'no message provided',
		}, function (err, data) {
			if (err) {
				log.err('Mailer error');
				log.err(err);
				return reject(err);
			}

			resolve(data);
	    });
	});
}
