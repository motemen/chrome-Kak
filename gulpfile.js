var gulp = require('gulp'),
    $    = require('gulp-load-plugins')();

var bowerFiles = require('main-bower-files'),
    del        = require('del');

gulp.task('html', [ 'vendor' ], function () {
  return gulp.src('src/**/*.html')
    .pipe(
      $.inject(
        gulp.src('dist/vendor/**', { read: false }),
        { starttag: '<!-- inject:vendor:{{ext}} -->', ignorePath: 'dist/', addRootSlash: false }
      )
    )
    .pipe(gulp.dest('dist'));
});

gulp.task('vendor', function () {
  return gulp.src(bowerFiles())
    .pipe(gulp.dest('dist/vendor'));
});

gulp.task('styles', function () {
  return gulp.src('src/**/*.{css,less}')
    .pipe(gulp.dest('dist'));
});

gulp.task('scripts', function () {
  return gulp.src('src/**/*.js')
    .pipe(gulp.dest('dist'));
});

gulp.task('manifest', function () {
  return gulp.src('src/manifest.json')
    .pipe(gulp.dest('dist'));
});

gulp.task('clean', del.bind(null, ['dist']));

gulp.task('dist', [ 'html', 'scripts', 'styles', 'manifest' ]);

gulp.task('default', [ 'dist' ]);
