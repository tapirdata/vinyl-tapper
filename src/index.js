import stream from 'readable-stream';
import BufferList from 'bl';

class SingleTapper extends stream.Transform {
  constructor(options) {
    super(options);
    options = options || {};
    if (options.provideBuffer) {
      this.bl = new BufferList();
    }
    this.on('end', function() {
      return this.emit('tap', this.bl && this.bl.slice());
    }
    );
    if (options.terminate) {
      this.resume();
    }
  }

  _transform(chunk, enc, next) {
    if (this.bl) {
      this.bl.append(chunk);
    }
    next(null, chunk);
  }
}


class VinylTapper extends stream.Transform {
  constructor(options) {
    options = options || {};
    super({objectMode: true});
    this.provideBuffer = options.provideBuffer;  
    this.terminate = options.terminate;

    if (this.terminate) {
      this.isFin = false;
      this.waitCount = 0;
      this.on('finish', function() {
        this.isFin = true;
        return this.checkFin();
      }
      );
    }
  }

  checkFin() {
    if (this.isFin && this.waitCount === 0) {
      return this.resume();
    }
  }

  tapFile(file, done) {
    ++this.waitCount;
    if (file.isNull()) {
      done(null);
      return file;
    }
    if (file.isBuffer()) {
      done(file.contents);
      return file;
    }
    let singleTapper = new SingleTapper({
      provideBuffer: this.provideBuffer,
      terminate: this.terminate
    });
    singleTapper.on('tap', buffer => done(buffer)
    );
    file.contents = file.contents.pipe(singleTapper);
    return file;
  }

  _transform(file, enc, next) {
    file = this.tapFile(file, buffer => {
      this.emitTap(file, buffer);
      if (this.terminate) {
        --this.waitCount;
        return this.checkFin();
      }
    }
    );
    next(null, file);
  }

  emitTap(file, buffer) {
    return this.emit('tap', file, buffer);
  }
}


let factory = function(options){
  if (options && options.single) {
    return new SingleTapper(options);
  } else {
    return new VinylTapper(options);
  }
};

factory.SingleTapper = SingleTapper;
factory.VinylTapper = VinylTapper;

export default factory;

