var gulp = require('gulp'),
    concat = require('gulp-concat'),
    del = require('del'),
    webpack = require('webpack'),
    webpackStream = require('webpack-stream'),
    webpackConfig = require('./webpack.config.js');

    gulp.task('pack', function() {
        return gulp.src('src/**/*.js')
            .pipe(webpackStream(webpackConfig, webpack))
            .pipe(gulp.dest('dist'));
    });


    /*
    to min
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())

    Sass compile (gulp-ruby-sass)
    Autoprefixer (gulp-autoprefixer)
    Minify CSS (gulp-cssnano)
    JSHint (gulp-jshint)
    Concatenation (gulp-concat)
    Uglify (gulp-uglify)
    Compress images (gulp-imagemin)
    LiveReload (gulp-livereload)
    Caching of images so only changed images are compressed (gulp-cache)
    Notify of changes (gulp-notify)
    Clean files for a clean build (del)
    */