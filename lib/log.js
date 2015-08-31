/**
 * Created by austin on 1/31/15.
 */

var logentries = require("le_node")
  , config = require("../config");

var log
  , logConfig = {};

if(config.logentriesToken && config.logentriesToken !== "") {
  logConfig.token = config.logentriesToken;
}

log = logentries.logger(logConfig);

log.on("log", console.log);

log.on("error", console.error.bind(console));

module.exports = log;
