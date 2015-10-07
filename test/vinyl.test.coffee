fs = require 'fs'
path = require 'path'
rimraf = require 'rimraf'
chai = require 'chai'
expect = chai.expect
vinylFs = require 'vinyl-fs'
streamTapper = require '../src'

fileCount = 2
srcDir = path.join __dirname, 'fixtures'
destDir = path.join __dirname, '.out'
dumpDir = path.join __dirname, '.dump'

equalBuffers = (b1, b2) ->
  if typeof b1.equals == 'function'
    b1.equals b2
  else # node 0.10
    b1.toString('binary') == b2.toString('binary')


compareTrees = (srcRoot, destRoot, destBuffers, done) ->
  walk = require 'walk' 
  walker = walk.walk srcDir

  walker.on 'file', (src, stat, next) ->
    srcPath = path.join src, stat.name
    destPath = path.join destRoot, path.relative(src, srcDir), stat.name
    # console.log 'compareTrees srcPath=', srcPath
    # console.log 'compareTrees destPath=', destPath
    fs.readFile srcPath, (err, srcBuffer) ->
      if err
        done err
        return
      # console.log 'compareTrees srcBuffer=', srcBuffer
      if destBuffers
        destBuffer = destBuffers[destPath]
        if not equalBuffers srcBuffer, destBuffer
          done new Error "not equal: #{srcPath}"
          return
        next()
        return
      else
        fs.readFile destPath, (err, destBuffer) ->
          if err
            done err
            return
          if not equalBuffers srcBuffer, destBuffer
            done new Error "not equal: #{srcPath}"
            return
          next()
          return
        return 


  walker.on 'end', ->
    done()


makeTests = (title, options) ->

  describe title, ->
    tapResults = {}
    tapper = streamTapper
      provideBuffer: options.provideBuffer
      terminate: options.terminate
    tapper.on 'tap', (file, buffer) ->
      destPath = path.join destDir, path.relative srcDir, file.path
      tapResults[destPath] = buffer or 'nothing'

    before (done) ->
      rimraf destDir, ->
        well = vinylFs.src '**/*.*',
          cwd: srcDir
          buffer: options.useBuffer   
        .pipe tapper  
        if not options.terminate 
          well = well.pipe vinylFs.dest destDir
        well.on 'end', done
        if not options.terminate 
          well = well.pipe vinylFs.dest dumpDir

    if not options.terminate   
      it 'should pass all files unmodified', (done) ->
        compareTrees srcDir, destDir, null, (err) ->
          done err

    it 'should tap all files', ->
      # console.log 'tapResults=', tapResults
      expect(Object.keys tapResults).to.have.length fileCount

    if options.provideBuffer
      it 'should provide the buffers correctly', (done) ->
        compareTrees srcDir, destDir, tapResults, (err) ->
          done err


describe 'stream-tapper for vinyl-stream', ->
  makeTests 'with buffer-files',
    useBuffer: true

  makeTests 'with stream-files',
    useBuffer: false

  makeTests 'with buffer-files, need buffer',
    useBuffer: true
    provideBuffer: true

  makeTests 'with stream-files, need buffer',
    useBuffer: false
    provideBuffer: true

  makeTests 'with buffer-files, terminate',
    useBuffer: true
    terminate: true

  makeTests 'with stream-files, terminate',
    useBuffer: false
    terminate: true

  makeTests 'with buffer-files, need buffer, terminate',
    useBuffer: true
    terminate: true
    provideBuffer: true

  makeTests 'with stream-files, need buffer, terminate',
    useBuffer: false
    terminate: true
    provideBuffer: true

