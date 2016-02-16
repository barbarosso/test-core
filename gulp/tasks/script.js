var gulp = require('gulp');
var browserify = require('browserify');
var handleErrors = require('../util/handleErrors');
var source = require('vinyl-source-stream');

var production = (process.env.NODE_ENV === 'production');

gulp.task('script', function () {
    return browserify('./src/index.js',{
        // generate source maps in non-production environment
        debug: true
    })
        .bundle()
        .on('error', handleErrors)
        .pipe(source('index.js'))
        .pipe(gulp.dest('./bin/javascript/'));
});


//gulp.task('default', ['libs', 'scripts', 'watch']);
