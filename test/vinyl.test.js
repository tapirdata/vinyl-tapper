import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { expect } from 'chai';
import vinylFs from 'vinyl-fs';
import streamTapper from '../src';

let fileCount = 2;
let srcDir = path.join(__dirname, 'fixtures');
let destDir = path.join(__dirname, '.out');
let dumpDir = path.join(__dirname, '.dump');

let equalBuffers = function(b1, b2) {
  if (typeof b1.equals === 'function') {
    return b1.equals(b2);
  } else { // node 0.10
    return b1.toString('binary') === b2.toString('binary');
  }
};


function compareTrees(srcRoot, destRoot, destBuffers, done) {
  let walk = require('walk'); 
  let walker = walk.walk(srcDir);

  walker.on('file', function(src, stat, next) {
    let srcPath = path.join(src, stat.name);
    let destPath = path.join(destRoot, path.relative(src, srcDir), stat.name);
    return fs.readFile(srcPath, function(err, srcBuffer) {
      if (err) {
        done(err);
        return;
      }
      if (destBuffers) {
        let destBuffer = destBuffers[destPath];
        if (!equalBuffers(srcBuffer, destBuffer)) {
          done(new Error(`not equal: ${srcPath}`));
          return;
        }
        next();
        return;
      } else {
        fs.readFile(destPath, function(err, destBuffer) {
          if (err) {
            done(err);
            return;
          }
          if (!equalBuffers(srcBuffer, destBuffer)) {
            done(new Error(`not equal: ${srcPath}`));
            return;
          }
          next();
        }
        );
        return;
      }
    }
    );
  }
  ); 


  return walker.on('end', () => done()
  );
}


function makeTests (title, options) {

  describe(title, function() {
    let tapResults = {};
    let tapper = streamTapper({
      provideBuffer: options.provideBuffer,
      terminate: options.terminate
    });
    tapper.on('tap', function(file, buffer) {
      let destPath = path.join(destDir, path.relative(srcDir, file.path));
      return tapResults[destPath] = buffer || 'nothing';
    }
    );

    before(done =>
      rimraf(destDir, function() {
        let well = vinylFs.src('**/*.*', {
          cwd: srcDir,
          buffer: options.useBuffer
        }
        )   
        .pipe(tapper);  
        if (!options.terminate) { 
          well = well.pipe(vinylFs.dest(destDir));
        }
        well.on('end', done);
        if (!options.terminate) { 
          return well = well.pipe(vinylFs.dest(dumpDir));
        }
      }
      )
    );

    if (!options.terminate) {   
      it('should pass all files unmodified', done =>
        compareTrees(srcDir, destDir, null, err => done(err)
        )
      
      );
    }

    it('should tap all files', () =>
      // console.log 'tapResults=', tapResults
      expect(Object.keys(tapResults)).to.have.length(fileCount)
    
    );

    if (options.provideBuffer) {
      return it('should provide the buffers correctly', done =>
        compareTrees(srcDir, destDir, tapResults, err => done(err)
        )
      
      );
    }
  }
  )
}


describe('stream-tapper for vinyl-stream', function() {
  makeTests('with buffer-files',
    {useBuffer: true});

  makeTests('with stream-files',
    {useBuffer: false});

  makeTests('with buffer-files, need buffer', {
    useBuffer: true,
    provideBuffer: true
  }
  );

  makeTests('with stream-files, need buffer', {
    useBuffer: false,
    provideBuffer: true
  }
  );

  makeTests('with buffer-files, terminate', {
    useBuffer: true,
    terminate: true
  }
  );

  makeTests('with stream-files, terminate', {
    useBuffer: false,
    terminate: true
  }
  );

  makeTests('with buffer-files, need buffer, terminate', {
    useBuffer: true,
    terminate: true,
    provideBuffer: true
  }
  );

  return makeTests('with stream-files, need buffer, terminate', {
    useBuffer: false,
    terminate: true,
    provideBuffer: true
  }
  );
}
);

