var gulp = require('gulp'),
		connect = require('gulp-connect');

gulp.task('webserver', function () {
		connect.server({
				root: ['./bin'],
				port: 8000,
				livereload: true
		});
});