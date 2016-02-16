'use strict';

var _ = require('lodash');
var fs = require('fs');
var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var nodeResolve = require('resolve');
var getNPMPackages = require('../util/getNPMPackages');

var production = (process.env.NODE_ENV === 'production');
production = 'production';

//gulp.task('default', ['build-vendor', 'build-app']);

gulp.task('build-vendor', function () {

    var b = browserify({
        // generate source maps in non-production environment
        debug: true
    });

    // resolve path using 'resolve' module
    getNPMPackages.getNPMPackageIds().forEach(function (id) {
        console.log('require:',id);
        b.require(nodeResolve.sync(id), { expose: id });
    });

    var stream = b
        .bundle()
        .on('error', function(err){
            // print the error (can replace with gulp-util)
            console.log(err.message);
            // end this stream
            this.emit('end');
        })
        .pipe(source('libs.js'));

    stream.pipe(gulp.dest('./bin/javascript'));

    return stream;
});

gulp.task('build-app', function () {

    var b = browserify('./src/index.js', {
        // generate source maps in non-production environment
        debug: true
    });

    // do the similar thing, but for npm-managed modules.
    // resolve path using 'resolve' module
    getNPMPackageIds().forEach(function (id) {
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


function getNPMPackageIds() {
    // read package.json and get dependencies' package ids
    var packageManifest = {};
    try {
        packageManifest = require('../../package.json');
    } catch (e) {
        // does not have a package.json manifest
    }
    return _.keys(packageManifest.dependencies) || [];

}
