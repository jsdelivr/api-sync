#!/usr/bin/env node
'use strict';

var path = require('path')

  , async = require('async')
  , crypto = require('crypto')
  , connect = require('connect')
  , express = require('express')
  , bodyParser = require('body-parser')
  , mkdirp = require('mkdirp')
  , _ = require('lodash')

  , config = require('./config')
  , log = require('./lib/log')

  , GitHubApi = require('github');

var github = new GitHubApi({
  version: '3.0.0',
  protocol: 'https',
  timeout: 10000
});

if(config.githubToken) {
  github.authenticate({
    type: 'oauth',
    token: config.githubToken
  });
}

var taskUpdating = {};

if(require.main === module) {
  main();
}

module.exports = main;
function main() {
  handleExit();

  async.series([
    mkdirp.bind(null, config.output),
    serve.bind(null, config),
    initTasks
  ], function(err) {
    if(err) {
      return console.error(err);
    }
  });
}

function handleExit() {
  process.on('exit', terminator);

  ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS',
    'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGPIPE', 'SIGTERM'
  ].forEach(function(element) {
      process.on(element, function() {
        terminator(element);
      });
    });
}

function serve(config, cb) {
  var app = express();
  var staticPath = path.join(__dirname, config.output);

  //health route for pingdom
  app.get('/health', function(req,res) {
    res.status(200).json({ "status":"jsdelivr api-sync application is up.", "date": new Date() });
  });

  //data files route
  app.use('/data', express.static(staticPath));

  //github webhook trigger route
  var webhookRouter = express.Router();
  webhookRouter.use(bodyParser.json({verify: verifyHmac}));
  webhookRouter.post('/',function(req,res) {

    if(req.body && req.body.ref && req.body.ref === "refs/heads/master") {
      log.info("Webhook received for push to jsdelvr master branch - begin jsdelivr update");
      triggerTask("jsdelivr");
    }
    else {
      log.info("Webhook received for push to jsdelvr branch other than master - do not begin jsdelivr update");
    }
    res.status(200).end();
  });
  app.use('/webhook',webhookRouter);

  var env = process.env.NODE_ENV || 'development';
  if(env === 'development') {
    app.use(connect.errorHandler());
  }

  app.listen(config.port, function(err) {
    if(err) {
      return cb(err);
    }

    log.info('Node (version: ' + process.version + ') ' + process.argv[1] + ' started on ' + config.port + ' ...');
    cb();
  });
}

var intervalSet = false;
function initTasks(cb) {
  log.info('Running tasks');

  // first kick off the tasks
  async.eachSeries(Object.keys(config.tasks), function(name,done) {
    taskUpdating[name] = false;
    triggerTask(name,done);
  }, function(err) {

    if(err) log.err("Error initializing tasks",err);

    //then set the interval
    if(!intervalSet) {
      intervalSet = true;
      var interval = 6 * (30 * 1e4);

      // we want to space out the start of each sync cycle by 30 minutes each
      setInterval(function () {
        initTasks(function(){
          log.info("libraries synced!");
          return true;
        });
      }, interval);
    }

    if(cb)
      cb();
  });
}

function triggerTask(name,done) {

  if(!taskUpdating[name]) {
    taskUpdating[name] = true;
    var pattern = config.tasks[name];

    var cdn = name
      , task = require('./tasks/task')
      , scrape = null;

    log.info("running task...", name, pattern);

    try {
      scrape = require('./tasks/' + cdn)(github);
      task(config.output, cdn, scrape)(function (err) {

        taskUpdating[name] = false;
        if (err)
          log.err(err);

        if (done)
          done();
      });
    } catch (e) {
      log.err(e);
      if (done)
        done();
    }
  }
  else {
    log.info(name + " sync is currently in progress");
    if (done)
      done();
  }
}

//verify github webhook push
function verifyHmac(req, res, buf) {

  var hash = req.header("X-Hub-Signature"),
    hmac = crypto.createHmac("sha1", config.webhookSecret);

  hmac.update(buf);

  var crypted = 'sha1=' +  hmac.digest("hex");

  if(crypted === hash) {
    // Valid request, do nothing
    log.info("Webhook signature is valid, jsdelivr update can proceed - providedSignature: " + hash + ", calculatedSignature: " + crypted);
  } else {
    // Invalid request
    log.info("Webhook signature is NOT VALID, jsdelivr update WILL NOT proceed - providedSignature: " + hash + ", calculatedSignature: " + crypted);
    var error = { status: 400, body: "Wrong signature" };
    throw error;
  }
}

function terminator(sig) {
  if(typeof sig === 'string') {
    var s = 'Received ' + sig + ' - terminating Node server ...';
    log.info(s);

    //mail.notify("jsdelivr api-sync server has stopped.",function(err,data) {
      log.end();
      process.exit(1);
    //});
  } else {
    //mail.notify("jsdelivr api-sync server has stopped.");
    log.info('Node server stopped.');
    log.end();
  }
}
