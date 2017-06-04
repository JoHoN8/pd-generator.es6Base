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
            message: 'Provide project name (siteApp)',
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
                    checked: true
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
            
            //devDependencies
            packageFile.devDependencies["babel-core"] = "latest";
            packageFile.devDependencies["babel-loader"] = "latest";
            packageFile.devDependencies["babel-preset-es2015"] = "latest";
            packageFile.devDependencies["del"] = "latest";
            packageFile.devDependencies["gulp"] = "latest";
            packageFile.devDependencies["gulp-concat"] = "latest";
            packageFile.devDependencies["gulp-util"] = "latest";
            packageFile.devDependencies["webpack"] = "latest";
            packageFile.devDependencies["webpack-stream"] = "latest";
            //this.copy('_package.json', 'package.json');

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
                this.destinationPath('src/styles')
            );
            this.fs.copy(
                this.templatePath('jshintrc'),
                this.destinationPath('.jshintrc')
            );
            this.fs.copy(
                this.templatePath('webpack.config.js'),
                this.destinationPath('webpack.config.js')
            );
        },
        scripts: function(){
            this.fs.copyTpl(
                this.templatePath('app/_app.js'),
                this.destinationPath('src/js/app.js'),
                {
                    projectName: this.projectName
                    //app: this.config.get('ngappname')
                }
            );
        },
        html: function(){
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