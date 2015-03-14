'use strict'

stream = require 'readable-stream'
BufferList = require 'bl'

class SingleTapper extends stream.Transform
  constructor: (options) ->
    super options
    options = options or {}
    if options.provideBuffer
      @bl = new BufferList()
    @on 'end', ->
      @emit 'tap', @bl and @bl.slice()
    if options.terminate
      @resume()

  _transform: (chunk, enc, next) ->
    if @bl
      @bl.append chunk
    next null, chunk
    return


class VinylTapper extends stream.Transform
  constructor: (options) ->
    options = options or {}
    super objectMode: true
    @provideBuffer = options.provideBuffer  
    @terminate = options.terminate

    if @terminate
      @isFin = false
      @waitCount = 0
      @on 'finish', ->
        @isFin = true
        @checkFin()

  checkFin: ->
    if @isFin and @waitCount == 0
      @resume()

  tapFile: (file, done) ->
    ++@waitCount
    if file.isNull()
      done null
      return file
    if file.isBuffer()
      done file.contents
      return file
    singleTapper = new SingleTapper
      provideBuffer: @provideBuffer
      terminate: @terminate
    singleTapper.on 'tap', (buffer) ->
      done buffer
    file.contents = file.contents.pipe singleTapper
    return file

  _transform: (file, enc, next) ->
    file = @tapFile file, (buffer) =>
      @emitTap file, buffer
      if @terminate
        --@waitCount
        @checkFin()
    next null, file
    return

  emitTap: (file, buffer) ->
    @emit 'tap', file, buffer


factory = (options)->
  if options and options.single
    new SingleTapper options
  else
    new VinylTapper options

factory.SingleTapper = SingleTapper
factory.VinylTapper = VinylTapper

module.exports = factory

