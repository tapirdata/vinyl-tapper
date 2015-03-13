var assert = require('assert');
var path = require('path');
var gunzip = require('gulp-gunzip');
var vinylFs = require('vinyl-fs');
var vinylTapper = require('vinyl-tapper');

var tapper = vinylTapper();
tapper.on('tap', function(file) {
  assert(!file.path.match(/\.gz$/));
});

vinylFs.src(['**/*.gz'], {cwd: 'src', buffer: false}) // works with 'buffer: true', too 
  .pipe(gunzip())
  .pipe(tapper)
  .pipe(vinylFs.dest('dist'));

