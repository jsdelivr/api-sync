'use strict';

var path = require('path')
  , fs = require("fs")
  , _ = require("lodash")

  , cheerio = require('cheerio')
  , request = require('request')

  , config = require("../config")
  , log = require('../lib/log')
  , mail = require('../lib/mail');


module.exports = function () {
  return function (cb) {
    request.get({
      url: 'https://developers.google.com/speed/libraries/devguide'
    }, function (err, res, data) {
      if (err || !data) {
        var s = 'Failed to update google data!';
        log.err(s, err, data);
        mail.error(s);
        return cb(err);
      }

      log.info('Fetched google data');
      var res = scrape(data);

      // mimic the github style etags values to ensure api knows what to sync
      var etagsFilePath = path.resolve(__dirname, "../data/google.json");
      fs.writeFile(etagsFilePath, JSON.stringify(_.map(res, function (lib) {
        return {etag: Date.now(), path: lib.name};
      })), function (err) {
        if (err) {
          log.err("failed to save google etags ", err);
        } else {
          log.info("google etags saved to " + etagsFilePath);
        }

        // don't err out if the etags don't save, just log it
        cb(null, res);
      });
    });
  };
};

function scrape(data) {
  var $ = cheerio.load(data, {normalizeWhitespace: true})
    , libs = $('div[itemprop="articleBody"]').children()
    , ret = [];

  libs.each(function (i, e) {
    var $e = $(e);

    if (e.name === "h3") {
      try {
        var $libElements = $e.next().find("dd")
          , $versionElements = $e.next().find("dd.versions")
          , homepage = $($libElements[1]).find('a').attr('href')
          , mainfile = $libElements.find('code').text().split('"').slice(-2, -1)[0].split('/').slice(-1)[0]
          , name = $libElements.find('code').text().split('"').slice(-2, -1)[0].split('/')[5]
          , versions = $versionElements.text().split(",").filter(id).map(trim)
          , hasMin = $libElements.find('code').text().indexOf('.min.js') !== -1;

        ret.push({
          name: name,
          mainfile: mainfile,
          homepage: homepage,
          assets: getAssets(mainfile, versions, hasMin),
          versions: versions
        });
      } catch (err) {
        log.err("Error parsing google data", err);
        mail.error("The google parse task failed, likely the page being scraped has changed.")
      }
    }
  });

  return ret;
}

function getAssets(mainfile, versions, hasMin) {
  var name = path.basename(path.basename(mainfile, path.extname(mainfile)), '.min');
  var extensions = ['js'];

  if (hasMin) {
    extensions.push('min.js');
  }

  return versions.reverse().map(function (version) {
    return {
      version: version,
      files: extensions.map(function (extension) {
        return name + '.' + extension;
      })
    };
  });
}

function trim(s) {
  return s.trim();
}

function id(a) {
  return a;
}
