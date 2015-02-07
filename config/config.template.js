module.exports = {
  port: 8000,
  output: 'data',
  githubToken: '',
  logentriesToken: '',
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
    bootstrap: {minute: 0},
    cdnjs: {minute: 2},
    google: {minute: 4},
    jsdelivr: {minute: 7}
    //jquery: {minute: 5}
  }
};
