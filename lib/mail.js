/**
 * Created by austin on 1/31/15.
 */

var nodemailer = require('nodemailer')
  , smtpTransport = require('nodemailer-smtp-transport')
  , log = require('./log')

  , config = require('../config');

var smtpOptions = config.smtp;
smtpOptions.auth = config.smtpAuth;

var transporter = nodemailer.createTransport(smtpTransport(smtpOptions));

function _send(subject,msg,cb) {

  var _subject = Date() + ' : ' + subject;

  transporter.sendMail({
    to: config.smtpTo.email,
    from: config.smtpFrom.email,
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

