// generated on 2016-10-21 using generator-chrome-extension 0.6.1
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import del from 'del';
import runSequence from 'run-sequence';
import {stream as wiredep} from 'wiredep';
import es from 'event-stream';
import source from 'vinyl-source-stream';
import browserify from 'browserify';

const $ = gulpLoadPlugins();

gulp.task('extras', () => {
  return gulp.src([
    'app/*.*',
    'app/_locales/**',
    '!app/scripts.babel',
    '!app/*.json',
    '!app/*.html',
    '!app/styles.scss'
  ], {
    base: 'app',
    dot: true
  }).pipe(gulp.dest('dist'));
});

function lint(files, options) {
  return () => {
    return gulp.src(files)
      .pipe($.eslint(options))
      .pipe($.eslint.format());
  };
}

gulp.task('lint', lint('app/scripts.babel/**/*.js', {
  env: {
    es6: true
  }
}));

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
    .pipe($.if($.if.isFile, $.cache($.imagemin({
      progressive: true,
      interlaced: true,
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}]
    }))
    .on('error', function (err) {
      console.log(err);
      this.end();
    })))
    .pipe(gulp.dest('dist/images'));
});
gulp.task('styles', () => {
  return gulp.src('app/styles.scss/*.scss')
    .pipe($.plumber())
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe(gulp.dest('app/styles'));
});

gulp.task('html', ['styles'], () => {
  return gulp.src('app/*.html')
    .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe($.sourcemaps.init())
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', $.cleanCss({compatibility: '*'})))
    .pipe($.sourcemaps.write())
    .pipe($.if('*.html', $.htmlmin({removeComments: true, collapseWhitespace: true})))
    .pipe(gulp.dest('dist'));
});

gulp.task('chromeManifest', () => {
  return gulp.src('app/manifest.json')
    .pipe($.chromeManifest({
      buildnumber: true,
      background: {
        target: 'scripts/background.js',
        exclude: [
          'scripts/chromereload.js'
        ]
      }
  }))
  .pipe($.if('*.css', $.cleanCss({compatibility: '*'})))
  .pipe($.if('*.js', $.sourcemaps.init()))
  .pipe($.if('*.js', $.uglify()))
  .pipe($.if('*.js', $.sourcemaps.write('.')))
  .pipe(gulp.dest('dist'));
});

gulp.task('babel', () => {
  let files = [
    'background.js',
    'main.js',
    'chromereload.js'
  ];

  let tasks = files.map( file => {
      return browserify({
        entries: './app/scripts.babel/' + file,
        debug: true
      }).transform('babelify', { presets: ['es2015'] })
        .bundle()
        .pipe(source(file))
        .pipe(gulp.dest('app/scripts'));
  });

  return es.merge.apply(null, tasks);
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('watch', ['lint', 'babel', 'styles'], () => {
  $.livereload.listen();

  gulp.watch([
    'app/*.html',
    'app/scripts/**/*.js',
    'app/images/**/*',
    'app/styles/**/*',
    'app/_locales/**/*.json'
  ]).on('change', $.livereload.reload);

  gulp.watch('app/scripts.babel/**/*.js', ['lint', 'babel']);
  gulp.watch('app/styles.scss/**/*.scss', ['styles']);
});

gulp.task('size', () => {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('wiredep', () => {
  gulp.src('app/*.html')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('app'));
});

gulp.task('package', function () {
  var manifest = require('./dist/manifest.json');
  return gulp.src('dist/**')
      .pipe($.zip('HN Profile Card-' + manifest.version + '.zip'))
      .pipe(gulp.dest('package'));
});

gulp.task('build', (cb) => {
  runSequence(
    'lint', 'babel', 'chromeManifest',
    ['html', 'images', 'extras'],
    'size', cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
