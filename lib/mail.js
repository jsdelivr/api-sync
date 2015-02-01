/**
 * Created by austin on 1/31/15.
 */

var nodemailer = require('nodemailer')
  , log = require('./log')

  , config = require('../config');

var transporter = nodemailer.createTransport(config.mailFrom);

function _send(subject,msg,cb) {

  var _subject = Date() + ' : ' + subject;

  transporter.sendMail({
    to: config.mailTo.user,
    subject: _subject,
    text: msg || 'no msg provided'
  },function(err,data){

    if(err) {
      log.err("Mailer error",err);
    }

    if(cb)
      cb(err,data);
  });
}

module.exports.notify = function(msg,cb) {
  _send('JsDelivr api-sync: notify',msg,cb);
};

module.exports.error = function(msg,cb) {
  _send('JsDelivr api-sync: ERROR',msg,cb);
};

