export default {
	port: 8000,
	output: 'data',
	logentriesToken: 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', // replace with logentries token
	webhookSecret: '',
	smtp: {
		host: '',
		port: '',
	},
	smtpAuth: {
		user: '',
		pass: '',
	},
	smtpTo: {
		email: '',
	},
	smtpFrom: {
		email: '',
	},
	tasks: {
		v1: {
			google: {},
			bootstrap: {
				gitPath: 'home/bootstrap-cdn',
				filePath: 'public',
			},
			jquery: {
				gitPath: 'home/codeorigin.jquery.com',
				filePath: 'cdn',
			},
			jsdelivr: {
				gitPath: 'home/jsdelivr',
				filePath: 'files',
			},
			cdnjs: {
				gitPath: 'home/cdnjs',
				filePath: 'ajax/libs',
			},
		},
		v2: {
			google: {},
			bootstrap: {
				gitPath: 'home/bootstrap-cdn',
				filePath: 'public',
			},
			jquery: {
				gitPath: 'home/codeorigin.jquery.com',
				filePath: 'cdn',
			},
			jsdelivr: {
				gitPath: 'home/jsdelivr',
				filePath: 'files',
			},
			cdnjs: {
				 gitPath: 'home/cdnjs',
				 filePath: 'ajax/libs',
			},
		},
	}
};
