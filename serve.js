#!/usr/bin/env node
'use strict';

var taskist = require('taskist');
var sugar = require('mongoose-sugar');

var config = require('./config');

var GitHubApi = require('github');

var github = new GitHubApi({
    version: '3.0.0',
    protocol: 'https',
    timeout: 5000
});

if(config.githubToken) {
    github.authenticate({
        type: 'oauth',
        token: config.githubToken
    });
}

var tasks = require('./tasks')(github);


if(require.main === module) {
    main();
}

module.exports = main;
function main(cb) {
    cb = cb || noop;

    var mongoUrl = sugar.parseAddress(config.mongo);

    console.log('Connecting to database');

    sugar.connect(mongoUrl, function(err) {
        if(err) {
            return console.error('Failed to connect to database', err);
        }

        console.log('Connected to database');

        console.log('Initializing tasks');
        initTasks();

        cb();
    });
}

function initTasks() {
    taskist(config.tasks, tasks, {
        instant: true,
        series: true
    });
}

function noop() {}
