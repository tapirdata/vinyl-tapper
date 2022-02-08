import { Readable, Transform, TransformCallback } from 'stream';
import File from 'vinyl';

import { TapperOptions } from './options';
import { SingleTapper } from './singleTapper';

export type BufferCb = (buffer: Buffer | null) => void;

export class VinylTapper extends Transform {
  protected provideBuffer?: boolean;
  protected terminate?: boolean;
  protected isFin?: boolean;
  protected waitCount: number;

  constructor(options: TapperOptions = {}) {
    super({ objectMode: true });
    this.provideBuffer = options.provideBuffer;
    this.terminate = options.terminate;
    this.waitCount = 0;

    if (this.terminate) {
      this.isFin = false;
      this.on('finish', () => {
        this.isFin = true;
        this.checkFin();
      });
    }
  }

  public _transform(file: File, enc: string, next: TransformCallback): void {
    file = this.tapFile(file, (buffer: Buffer | null) => {
      this.emitTap(file, buffer);
      if (this.terminate) {
        --this.waitCount;
        return this.checkFin();
      }
    });
    next(null, file);
  }

  protected checkFin(): void {
    if (this.isFin && this.waitCount === 0) {
      this.resume();
    }
  }

  protected tapFile(file: File, done: BufferCb): File {
    ++this.waitCount;
    if (file.isNull()) {
      done(null);
      return file;
    }
    if (file.isBuffer()) {
      done(file.contents);
      return file;
    }
    const singleTapper = new SingleTapper({
      provideBuffer: this.provideBuffer,
      terminate: this.terminate,
    });
    singleTapper.on('tap', (buffer: Buffer) => done(buffer));
    file.contents = (file.contents as Readable).pipe(singleTapper);
    return file;
  }

  protected emitTap(file: File, buffer: Buffer | null): void {
    this.emit('tap', file, buffer);
  }
}
