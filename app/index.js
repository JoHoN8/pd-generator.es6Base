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
                    name: 'axios',
                    value: 'axios',
                    checked: true
                },
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
            
            self.includeAxios = self.includes(answers.jslibs, 'axios');
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
                    "devBuild": "webpack --config ./webpackConfigs/webpack.config.dev.js",
                    "prodBuild": "webpack --config ./webpackConfigs/webpack.config.prod.js"
                },
                author: this.author,
                license: "ISC",
                dependencies: {},
                devDependencies: {}
            };

            //dependencies
            if(this.includeAxios) {packageFile.dependencies["axios"] = "latest";}
            if(this.includeJquery) {packageFile.dependencies["jquery"] = "2.2.4";}
            if(this.includeLodash) {packageFile.dependencies["lodash"] = "latest";}
            if(this.includeMoment) {packageFile.dependencies["moment"] = "latest";}
            if(this.includesputil) {packageFile.dependencies["pd-sputil"] = "latest";}
            if(this.includespserverajax) {packageFile.dependencies["pd-spserverajax"] = "latest";}
            if(this.includespserverjsom) {packageFile.dependencies["pd-spserverjsom"] = "latest";}
            if(this.includeapputil) {packageFile.dependencies["pd-apputil"] = "latest";}
            packageFile.dependencies["babel-polyfill"] = "latest";
            
            //devDependencies
            packageFile.devDependencies["webpack"] = "latest";
            packageFile.devDependencies["clean-webpack-plugin"] = "latest";
            packageFile.devDependencies["html-webpack-plugin"] = "latest";
            packageFile.devDependencies["css-loader"] = "latest";
            packageFile.devDependencies["sass-loader"] = "latest";
            packageFile.devDependencies["file-loader"] = "latest";
            packageFile.devDependencies["extract-text-webpack-plugin"] = "latest";
            packageFile.devDependencies["babel-core"] = "latest";
            packageFile.devDependencies["babel-loader"] = "latest";
            packageFile.devDependencies["babel-preset-latest"] = "latest";
            packageFile.devDependencies["babel-preset-stage-0"] = "latest";
            packageFile.devDependencies["eslint"] = "latest";
            packageFile.devDependencies["npm-run-all"] = "latest";

            this.fs.writeJSON(
                this.destinationPath('package.json'),
                packageFile
            );
        },
        appStaticFiles: function(){
            // this.copy('_favicon.ico', 'src/favicon.ico');
            this.fs.copy(
                this.templatePath('gitignore'),
                this.destinationPath('.gitignore')
            );
            this.fs.copy(
                this.templatePath('.eslintrc.json'),
                this.destinationPath('.eslintrc.json')
            );
            this.fs.copy(
                this.templatePath('webpackConfigs/*'),
                this.destinationPath('webpackConfigs/')
            );
        },
        styleSheets: function() {
            this.fs.copy(
                this.templatePath('app/_main.css'),
                this.destinationPath('src/styleSheets/main.css')
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
            this.fs.copy(
                this.templatePath('_index.html'),
                this.destinationPath('src/index.html')
            );
        }
    },
    conflicts: function(){
    },
    install: function(){
        //this.bowerInstall();
        this.npmInstall();
    },
    end: function(){
        this.log(chalk.yellow.bold('Installation successful!'));
    }
});