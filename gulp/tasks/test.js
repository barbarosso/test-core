var gulp = require('gulp');
var mochify = require('mochify');
gulp.task('test', function () {
    mochify( './test/**/*.js', {
        reporter : 'spec',
        watch: true,
        debug: false
    }).bundle();
});


