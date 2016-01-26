module.exports = {
  port: 8000,
  output: 'data',
  githubToken: '',
  logentriesToken: '',
  webhookSecret: '',
  smtp: {
    host: '',
    port: ''
  },
  smtpAuth: {
    user: '',
    pass: ''
  },
  smtpTo: {
    email: ''
  },
  smtpFrom: {
    email: ''
  },
  tasks: {
    'bootstrap-cdn': {
      interval: 180,
      gitPath: '/home/bootstrap-cdn',
      filePath: 'public'
    },
    'google': {
      interval: 180
    },
    'cdnjs': {
      interval: 180,
      gitPath: '/home/cdnjs',
      filePath: 'ajax/libs'
    },
    'jsdelivr': {
      interval: 180,
      gitPath: '/home/jsdelivr',
      filePath: 'files'
    },
    'jquery': {
      interval: 180,
      gitPath: '/home/jquery',
      filePath: 'cdn'
    }
  }
};
