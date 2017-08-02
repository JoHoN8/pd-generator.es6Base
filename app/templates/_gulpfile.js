var gulp = require('gulp'),
    gutil = require('gulp-util'),
    //creds = require(), //path to credintial file
    spsave = require('gulp-spsave'),
    webpack = require('webpack'),
    webpackConfig = require('./webpack.config.js'),
    packageData = require("./package.json");


/************common webpack configs************/

/**********add external libraries here*********/
//example - webpackConfig.externals.jquery = 'jquery';
 

/*********webpack stuff*************************/
gulp.task('dev', ['webpack:dev', 'copyCSS']);
gulp.task('prod', ['webpack:prod', 'copyCSS']);
gulp.task('saveAll', ['saveScripts', 'saveStyles', 'savePages']);

gulp.task('webpack:prod', function (callback) {
    //custom production config
    let UglifyJsPlugin = new webpack.optimize.UglifyJsPlugin();
    let envTrigger = new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    });
    webpackConfig.output.filename = 'app.min.js';
    webpackConfig.plugins.push(envTrigger, UglifyJsPlugin);
    
    webpack(webpackConfig, function (err, stats) {
        if (err) {
            throw new gutil.PluginError('webpack:build', err);
        }
        gutil.log('production pack completed');
        callback();
    });
});

gulp.task('webpack:dev', function (callback) {
    //custom dev config
    webpackConfig.output.filename = 'app.js';

    let envTrigger = new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('developer')
    });

    webpackConfig.plugins.push(envTrigger);
    webpack(webpackConfig, function (err, stats) {
        if (err) {
            throw new gutil.PluginError('webpack:build', err);
        }
        gutil.log('developer pack completed');
        callback();
    });
});

/***************sp save stuff***************************/
gulp.task('saveScripts', function () {
    return gulp.src("./dist/**/*.js")
        .pipe(spsave({
            siteUrl: '', //absolute path to site
            folder: '', //library/folder
            flatten: false
        }, creds));
});

gulp.task('saveStyles', function () {
    return gulp.src("./dist/**/*.css")
        .pipe(spsave({
            siteUrl: '', //absolute path to site
            folder: '', //library/folder
            flatten: false
        }, creds));
});

gulp.task('savePages', function () {
    return gulp.src("./dist/**/*.aspx")
        .pipe(spsave({
            siteUrl: '', //absolute path to site
            folder: '', //library/folder
            flatten: false
        }, creds));
});

/*************copy files stuff********************************/
gulp.task('copyCSS', function () {
    gulp.src('./src/styleSheets/*')
        .pipe(gulp.dest('./dist/styleSheets'));
});