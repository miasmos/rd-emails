var gulp = require('gulp'),
    replace = require('gulp-replace');
(argv = require('yargs').argv),
    (zip = require('gulp-zip')),
    (del = require('del')),
    (livereload = require('gulp-livereload')),
    (flatten = require('gulp-flatten')),
    (path = require('path')),
    (sequence = require('run-sequence')),
    (merge = require('merge-stream')),
    (fs = require('fs')),
    (config = require('./config.json'));

var brand = argv.brand,
    name = argv.name,
    img = path.resolve(__dirname, './' + brand + '/img/'),
    src = path.resolve(__dirname, './' + brand + '/src/' + name),
    dev = path.resolve(__dirname, './' + brand + '/dist/' + name + '/dev/'),
    prod = path.resolve(__dirname, './' + brand + '/dist/' + name + '/prod/'),
    dest = path.resolve(__dirname, './' + brand + '/dist/' + name);

if (!argsAreValid()) {
    console.warn('--brand & --name are required, quitting...');
    process.exit();
}

if (!dirIsValid()) {
    console.warn(src + ' is not a valid path, quitting...');
    process.exit();
}

var version = '1.0';
if (!hasVersion()) {
    console.warn(
        brand + ' ' + name + ' does not have a version set, assuming 1.0'
    );
} else {
    version = config.version[brand][name];
}

gulp.task('dev', ['default'], function() {
    livereload.listen();

    gulp.watch(path.resolve(src, './index.html'), ['html', 'img-paths', 'img']);
    gulp.watch(path.resolve(img, './**/*'), ['img-paths', 'img']);
});

gulp.task('default', function(done) {
    sequence('del', 'img-paths', 'img', 'html', done);
});

gulp.task('html', function() {
    var streams = [];
    // prod
    streams.push(
        gulp
            .src(src + '/index.html')
            .pipe(
                replace(
                    /src="(\/.*?)"/g,
                    'src="' + config.url + '/' + brand + '$1"'
                )
            )
            .pipe(gulp.dest(prod))
    );

    // dev
    streams.push(
        gulp
            .src(src + '/index.html')
            .pipe(
                replace(/src="(\/.*)"/g, function(match, p1) {
                    var s = p1.split('/');
                    return 'src="' + s[s.length - 1] + '"';
                })
            )
            .pipe(gulp.dest(dev))
            .pipe(livereload())
    );

    return merge(streams);
});

var imgPaths = [];
gulp.task('img-paths', function() {
    imgPaths = [];
    var streams = [];
    streams.push(
        gulp.src(src + '/index.html').pipe(
            replace(/src="(\/.*?)"/g, function(match, p1) {
                var p = path.resolve(img, './' + p1);

                if (fs.existsSync(p)) {
                    imgPaths.push(p);
                } else {
                    console.warn(p + ' does not exist in file system');
                }
            })
        )
    );

    return merge(streams);
});

gulp.task('img', function() {
    var streams = [];

    // dev
    streams.push(
        gulp
            .src(imgPaths)
            .pipe(flatten())
            .pipe(gulp.dest(dev))
    );

    // prod
    for (var index in imgPaths) {
        var p = imgPaths[index],
            s = p.split('\\'),
            parentFolder = s[s.length - 2];

        streams.push(
            gulp
                .src(p)
                .pipe(
                    gulp.dest(
                        path.resolve(prod, './' + brand + '/' + parentFolder)
                    )
                )
        );
    }

    return merge(streams);
});

gulp.task('del', function() {
    return del(dest);
});

gulp.task('package', function() {
    var streams = [];
    streams.push(
        gulp
            .src([prod + '/**/*', '!' + prod + '/**/*.zip'])
            .pipe(zip(brand + '-' + name + '-v' + version + '.zip'))
            .pipe(gulp.dest(prod))
    );
    streams.push(
        gulp
            .src([dev + '/**/*', '!' + dev + '/**/*.zip'])
            .pipe(zip(brand + '-' + name + '-v' + version + '.zip'))
            .pipe(gulp.dest(dev))
    );
});

function argsAreValid() {
    return 'brand' in argv && !!argv.brand && 'name' in argv && argv.name;
}

function dirIsValid() {
    return fs.existsSync(src);
}

function hasVersion() {
    return (
        'version' in config &&
        !!config.version &&
        brand in config.version &&
        !!config.version[brand] &&
        name in config.version[brand] &&
        !!config.version[brand][name]
    );
}
