var gulp = require('gulp');
var browserify = require('browserify');
var handleErrors = require('../util/handleErrors');
var source = require('vinyl-source-stream');


gulp.task('libs', function () {
    return browserify({
        // generate source maps in non-production environment
        debug: true
    })
        .bundle()
        .on('error', handleErrors)
        .pipe(source('libs.js'))
        .pipe(gulp.dest('./bin/javascript/'));
});
/*
gulp.task('scripts', function () {
    return browserify('./src/main.js')
        .external('gsap')
        .external('pixi.js')
        .bundle()
        .on('error', handleErrors)
        .pipe(source('main.js'))
        .pipe(gulp.dest('./build/'));
});

*/
//gulp.task('default', ['libs', 'scripts', 'watch']);
