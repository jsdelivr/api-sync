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
    /*'bootstrap-cdn': {
      minute: 3
    },
    'google': {
      minute: 3
    },
    'cdnjs': {
      minute: 1,
      gitPath: '/home/cdnjs',
      filePath: 'ajax/libs'
    },*/
    'jsdelivr': {
      minute: 1,
      gitPath: '/home/jsdelivr',
      filePath: 'files'
    }
    //jquery: {minute: 5}
  }
};
