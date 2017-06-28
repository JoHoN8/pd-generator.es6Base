//<%= ngapp %> to add text in file
'use strict';
var generator = require('yeoman-generator'),
    chalk = require('chalk'),
    yosay = require('yosay'),
    includes = function (ary, lib) {
        var val = ary.indexOf(lib);

        return val > -1;
    };

module.exports = generator.extend({
    constructor: function(){
        generator.apply(this, arguments);
        
        this.includes = includes;
        // this.argument('appname', { type: String, required: true });
        // this.appname = _.kebabCase(this.appname);
        
    },  
    initializing: function(){
    },
    prompting: function(){
        var self = this;

        this.log(yosay(chalk.yellow('Create an ES6 project')));
            
        //var done = this.async();
        return this.prompt([{
            type: 'input',
            name: 'projectName',
            message: 'Provide project name',
            default: 'siteApp'
        },
        {
            type: 'checkbox',
            name: 'jslibs',
            message: 'Which JS libraries would you like to include?',
            choices: [
                {
                    name: 'jQuery',
                    value: 'jquery',
                    checked: false
                },
                {
                    name: 'lodash',
                    value: 'lodash',
                    checked: false 
                },
                {
                    name: 'Moment.js',
                    value: 'momentjs',
                    checked: false
                },
                {
                    name: 'pd-spUtil.js',
                    value: 'pdsputil',
                    checked: false
                },
                {
                    name: 'pd-spServerAjax.js',
                    value: 'pdspserverajax',
                    checked: false
                },
                {
                    name: 'pd-spServerJsom.js',
                    value: 'spserverjsom',
                    checked: false
                },
                {
                    name: 'pd-appUtil.js',
                    value: 'pdapputil',
                    checked: false
                }
            ]
        }]).then(function(answers){
            self.log(answers);
            self.projectName = answers.projectName;
            //self.config.set('appname', answers.projectName);
            // self.config.save();
            
            self.includeJquery = self.includes(answers.jslibs, 'jquery');
            self.includeLodash = self.includes(answers.jslibs, 'lodash');
            self.includeMoment = self.includes(answers.jslibs, 'momentjs');             
            self.includesputil = self.includes(answers.jslibs, 'pdsputil');             
            self.includespserverajax = self.includes(answers.jslibs, 'pdspserverajax');             
            self.includespserverjsom = self.includes(answers.jslibs, 'pdspserverjson');             
            self.includeapputil = self.includes(answers.jslibs, 'pdapputil');             
            //done(); 
        });
            
    },
    configuring: function(){
    },
    writing: {
        packageJSON: function(){
            var packageFile = {
                name: this.projectName,
                version: "1.0.0",
                description: this.desc,
                main: "app.js",
                scripts: {
                    test: "echo \"Error: no test specified\" && exit 1"
                },
                author: this.author,
                license: "ISC",
                dependencies: {},
                devDependencies: {}
            };

            //dependencies
            if(this.includeJquery) {packageFile.dependencies["jquery"] = "latest";}
            if(this.includeLodash) {packageFile.dependencies["lodash"] = "latest";}
            if(this.includeMoment) {packageFile.dependencies["moment"] = "latest";}
            if(this.includesputil) {packageFile.dependencies["pd-sputil"] = "latest";}
            if(this.includespserverajax) {packageFile.dependencies["pd-spserverajax"] = "latest";}
            if(this.includespserverjsom) {packageFile.dependencies["pd-spserverjsom"] = "latest";}
            if(this.includeapputil) {packageFile.dependencies["pd-apputil"] = "latest";}
            
            //devDependencies
            packageFile.devDependencies["babel-core"] = "latest";
            packageFile.devDependencies["babel-loader"] = "latest";
            packageFile.devDependencies["babel-preset-es2015"] = "latest";
            packageFile.devDependencies["gulp"] = "latest";
            packageFile.devDependencies["gulp-util"] = "latest";
            packageFile.devDependencies["webpack"] = "latest";
            packageFile.devDependencies["gulp-spsave"] = "latest";

            this.fs.writeJSON(
                this.destinationPath('package.json'),
                packageFile
            );
        },
        gulpfile: function(){
            this.fs.copy(
                this.templatePath('_gulpfile.js'),
                this.destinationPath('gulpfile.js')
            );
            this.fs.copy(
                this.templatePath('_gulp.config.js'),
                this.destinationPath('gulp.config.js')
            );
        },
        appStaticFiles: function(){
            // this.copy('_favicon.ico', 'src/favicon.ico');
            this.fs.copy(
                this.templatePath('styles/*.css'),
                this.destinationPath('src/styleSheets')
            );
            this.fs.copy(
                this.templatePath('jshintrc'),
                this.destinationPath('.jshintrc')
            );
            this.fs.copy(
                this.templatePath('_webpack.config.js'),
                this.destinationPath('webpack.config.js')
            );
        },
        scripts: function(){
            this.fs.copyTpl(
                this.templatePath('app/_app.js'),
                this.destinationPath('src/scripts/app.js'),
                {
                    projectName: this.projectName
                }
            );
        },
        html: function(){
            // example
            // this.fs.copyTpl(
            //     this.templatePath('_index.html'),
            //     this.destinationPath('src/index.html'),
            //     {
            //         appname: _.startCase(this.appname),
            //         ngapp: this.config.get('ngappname')
            //     }
            // );
        }
    },
    conflicts: function(){
    },
    install: function(){
        //this.bowerInstall();
        this.yarnInstall();
    },
    end: function(){
        this.log(chalk.yellow.bold('Installation successful!'));
    }
});