var assert = require('assert');
var path = require('path');
var gunzip = require('gulp-gunzip');
var vinylFs = require('vinyl-fs');
var vinylTapper = require('vinyl-tapper');

var tapper = vinylTapper({provideBuffer: true});
tapper.on('tap', function(file, buffer) {
  var contents = buffer.toString('utf8')
  assert(contents.match(/exports/)) // all our modules do export something
});

vinylFs.src(['**/*.gz'], {cwd: 'src', buffer: false}) // works with 'buffer: true', too 
  .pipe(gunzip())
  .pipe(tapper)
  .pipe(vinylFs.dest('dist'));

