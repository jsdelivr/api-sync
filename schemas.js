'use strict';

var mongoose = require('mongoose');
var sugar = require('mongoose-sugar');

var schema = sugar.schema(mongoose);


var fields = {
    name: String,
    zip: String,
    mainfile: String,
    mainfile2: String, // jsdelivr specific
    lastversion: String,
    description: String,
    homepage: String,
    github: String,
    author: String,
    assets: sugar.mixed(),
    versions: [String]
};

schema(exports, 'bootstrapLibrary').fields(fields);
schema(exports, 'cdnjsLibrary').fields(fields);
schema(exports, 'googleLibrary').fields(fields);
schema(exports, 'jsdelivrLibrary').fields(fields);
schema(exports, 'jqueryLibrary').fields(fields);
