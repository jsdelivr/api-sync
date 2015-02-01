'use strict';

var request = require('request')
  , prop = require('annofp').prop

  , log = require('../lib/log')
  , mail = require('../lib/mail');


module.exports = function() {
    return function(cb) {
        request.get({
            url: 'http://api.cdnjs.com/libraries?fields=version,description,homepage,description,keywords,assets,filename,author',
            json: true
        }, function(err, res, data) {
            if(err || !data || !data.results) {
                var s = 'Failed to update cdnjs data!';
                log.err(s, err, data);
                mail.error(s);
                return cb(err);
            }

            log.info('Fetched cdnjs data');

            cb(null, data.results.map(function(library) {
                return {
                    name: library.name,
                    mainfile: library.filename,
                    description: library.description,
                    homepage: library.homepage,
                    author: library.author,
                    assets: library.assets,
                    versions: library.assets && library.assets.map(prop('version'))
                };
            }));
        });
    };
};
