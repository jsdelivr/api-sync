#!/usr/bin/env node
'use strict';

var GitHubApi = require('github');

var github = new GitHubApi({
    version: '3.0.0',
    protocol: 'https',
    timeout: 5000
});

var bootstrap = require('../tasks/bootstrap')(github);


main();

function main() {
    bootstrap(function(err, d) {
        if(err) {
            return console.error(err);
        }
    });
}
