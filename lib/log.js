/**
 * Created by austin on 1/31/15.
 */

var logentries = require("le_node")
  , config = require('../config');

var log
  , logConfig = {};

if(config.logentriesToken) {
  logConfig.token = config.logentriesToken;
}

log = logentries.logger(logConfig);

log.on("log",function(line) {
  console.log(line);
});

module.exports = log;
