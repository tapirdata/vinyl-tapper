# vinyl-tapper [![Build Status](https://secure.travis-ci.org/tapirdata/vinyl-tapper.png?branch=master)](https://travis-ci.org/tapirdata/vinyl-tapper) [![Dependency Status](https://david-dm.org/tapirdata/vinyl-tapper.svg)](https://david-dm.org/tapirdata/vinyl-tapper) [![devDependency Status](https://david-dm.org/tapirdata/vinyl-tapper/dev-status.svg)](https://david-dm.org/tapirdata/vinyl-tapper#info=devDependencies)
> A transform-stream for vinyl stream that emits a 'tap'-event for every file

## Features

Works with buffer- and file- vinyl-streams, optionally terminates the stream.

## Usage

### Check metadata

Check if `gulp-unzip` correctly strips the `.gz` - extension:

``` js
var assert = require('assert');
var path = require('path');
var gunzip = require('gulp-gunzip');
var vinylFs = require('vinyl-fs');
var vinylTapper = require('vinyl-tapper');

var tapper = vinylTapper();
tapper.on('tap', function(file) {
  assert(!file.path.match(/\.gz$/));
});

vinylFs.src(['**/*.gz'], {cwd: 'src', buffer: false}) 
// works with 'buffer: true', too 
  .pipe(gunzip())
  .pipe(tapper)
  .pipe(vinylFs.dest('dist'));

```
### Check contents

Check if `gulp-unzip` does some expansion

``` js
var assert = require('assert');
var path = require('path');
var gunzip = require('gulp-gunzip');
var vinylFs = require('vinyl-fs');
var vinylTapper = require('vinyl-tapper');

var tapper = vinylTapper({provideBuffer: true});
tapper.on('tap', function(file, buffer) {
  var contents = buffer.toString('utf8');
  assert(contents.match(/exports/)) // all our modules do export something
});

vinylFs.src(['**/*.gz'], {cwd: 'src', buffer: false}) 
// works with 'buffer: true', too 
  .pipe(gunzip())
  .pipe(tapper)
  .pipe(vinylFs.dest('dist'));
```
The passed file-object are not modified in any manner.

### Termination

If there is no need to pipe along the resulting stream, you can specify `terminate: true` to get it eaten up right here:

``` js
var tapper = vinylTapper({provideBuffer: true, terminate: true});
tapper.on('tap', function(file, buffer) {
  // do some checks
});

vinylFs.src(['**/*.gz'], {cwd: 'src', buffer: false})
  .pipe(gunzip())
  .pipe(tapper)
  .on('end', function() {
    // all files have been tapped now...
  });
```

## API

#### var tapper = tapper(options);

creates a new tapper-stream. Available options:

- `single`: If true, creates a tapper for a single data-stream. If false (default), create a tapper for a vinyl-file-stream.
- `provideBuffer`: If true, 'tap'-events will provide a buffer.
- `terminate`: If true, the incoming stream will be consumed by the tapper.

### Event 'tap'

- `file` (only if not `single`): the vinyl-file object
- `buffer` (only if `provideBuffer`): the buffered contents of the vinyl-file.

This event will be emitted as soon as possible: With not `provideBuffer` or if a file already holds a buffer, this will be when the file enters the tapper. For stream-files with `provideBuffer` the event will be emmitted when the file has passed completely.

