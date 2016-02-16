/**
 * Created by pascal on 20/10/15.
 */
var gulp    = require('gulp');

gulp.task('copy-html', function() {
		gulp.src(['html/**/*']).pipe(gulp.dest('bin'));
});