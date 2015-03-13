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
    bootstrap: {minute: 1},
    cdnjs: {minute: 3},
    google: {minute: 5}
    //jquery: {minute: 5}
  }
};
