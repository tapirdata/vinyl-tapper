'use strict'

stream = require 'readable-stream'
BufferList = require 'bl'

class Collector extends stream.Transform
  constructor: (@name) ->
    super()
    @bl = new BufferList()
    @on 'end', ->
      # console.log 'Collector.end name=%s', @name
      @emit 'complete', @bl.slice()

  _transform: (chunk, enc, next) ->
    # console.log 'Collector._transform name=%s, chunk=', @name, chunk
    @bl.append chunk
    next null, chunk
    return


class VinylTap extends stream.Transform
  constructor: (options) ->
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
    # console.log 'VinylTap checkFin', @waitCount, @isFin
    if @isFin and @waitCount == 0
      @resume()

  _transform: (file, enc, next) ->
    file = @doFile file, (buffer) =>
      @emitTap file, buffer
      if @terminate
        --@waitCount
        @checkFin()
    if @terminate and file.isStream()
      file.contents.resume()
    next null, file
    return

  doFile: (file, cb) ->
    ++@waitCount
    if not @provideBuffer
      cb()
      return file
    if file.isNull()
      cb null
      return file
    if file.isBuffer()
      cb file.contents
      return file
    collector = new Collector file.relative
    collector.on 'complete', (buffer) -> cb buffer
    file.contents = file.contents.pipe collector
    return file
     
  emitTap: (file, buffer) ->
    # console.log 'emitTap', file
    @emit 'tap', file, buffer


factory = (options)->
  new VinylTap options
factory.VinylTap = VinylTap

module.exports = factory

