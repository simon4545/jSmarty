module.exports = function(grunt) {
    // 配置
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            jsmart: {
                src: ['src/wrap_start.js', 'src/util.js', 'src/reMarker.js', 'src/Parser.js', 'src/wrap_end.js'],
                dest: 'dest/jsmart.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'dest/jsmart.js',
                dest: 'dest/jsmart.min.js'
            }
        }
    });
    // 载入concat和uglify插件，分别对于合并和压缩
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    // 注册任务
    grunt.registerTask('default', ['concat', 'uglify']);
};
