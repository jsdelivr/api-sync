module.exports = {
    port: 8000,
    mongo: {
        hostname: 'localhost',
        port: 27017,
        db: 'jsdelivr_api_sync',
        username: '',
        password: ''
    },
    tasks: {
        bootstrap: {minute: 1},
        cdnjs: {minute: 1},
        google: {minute: 1},
        jsdelivr: {minute: 1},
        jquery: {minute: 1}
    }
};
