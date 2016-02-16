'use strict';

var _ = require('lodash');
var fs = require('fs');
var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var getNPMPackage = require('../util/getNPMPackages');

var production = (process.env.NODE_ENV === 'production');
production = 'production';

gulp.task('build-app', function () {

    var b = browserify('./src/index.js', {
        // generate source maps in non-production environment
        debug: true
    });

    // do the similar thing, but for npm-managed modules.
    // resolve path using 'resolve' module
    getNPMPackage.getNPMPackageIds().forEach(function (id) {
        b.external(id);
    });

    var stream = b.bundle().pipe(source('index.js'));

    // pipe additional tasks here (for eg: minifying / uglifying, etc)
    // remember to turn off name-mangling if needed when uglifying

    stream.pipe(gulp.dest('./bin/javascript'));

    return stream;

});

/**
 * Helper function(s)
 */



