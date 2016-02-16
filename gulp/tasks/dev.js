var gulp    = require('gulp'),
    runSeq  = require('run-sequence');

gulp.task('dev', function (done) {
    runSeq('copy-html', 'build-vendor', 'watch', 'test', 'webserver', done);
});
