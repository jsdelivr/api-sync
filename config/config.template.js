module.exports = {
    port: 8000,
    output: 'data',
    githubToken: '',
    mongo: {
        hostname: 'localhost',
        port: 27017,
        db: 'jsdelivr_api_sync',
        username: '',
        password: ''
    },
    tasks: {
        bootstrap: {minute: 0},
        cdnjs: {minute: 2},
        google: {minute: 4},
        jsdelivr: {minute: 7},
        jquery: {minute: 5}
    }
};
