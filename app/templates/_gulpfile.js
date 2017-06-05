var gulp = require('gulp'),
    concat = require('gulp-concat'),
    gulpUtil = require('gulp-util'),
    del = require('del'),
    webpack = require('webpack'),
    webpackStream = require('webpack-stream'),
    webpackConfigDev = require('./webpack.config.dev.js'),
    webpackConfigProd = require('./webpack.config.prod.js');

    gulp.task('devPack', function() {
        return gulp.src('src/**/*.js')
            .pipe(webpackStream(webpackConfigDev, webpack))
            .pipe(gulp.dest('dist'));
    });

    gulp.task('prodPack', function() {
        return gulp.src('src/**/*.js')
            .pipe(webpackStream(webpackConfigProd, webpack))
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