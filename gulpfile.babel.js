import del from 'del';

import gulp from 'gulp';
import babel from 'gulp-babel';

gulp.task('compile-babel', compileBabel);

gulp.task('build', ['clean'], compileBabel);

gulp.task('clean', (cb) => {
  del('./lib/*', { dot: true })
    .then(() => cb());
});

/////////////////////////////////////////////////////////////

function compileBabel() {
  return gulp.src('./src/index.js', { base: './src' })
    .pipe(babel())
    .pipe(gulp.dest('./lib'));
}
