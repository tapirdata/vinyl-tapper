import BufferList from 'bl';
import { Transform, TransformCallback } from 'stream';

import { TapperOptions } from './options';

export class SingleTapper extends Transform {
  protected bl?: BufferList;

  constructor(options: TapperOptions = {}) {
    super(options);
    if (options.provideBuffer) {
      this.bl = new BufferList();
    }
    this.on('end', () => {
      this.emit('tap', this.bl && this.bl.slice());
    });
    if (options.terminate) {
      this.resume();
    }
  }

  public _transform(chunk: Buffer, enc: string, next: TransformCallback): void {
    if (this.bl) {
      this.bl.append(chunk);
    }
    next(null, chunk);
  }
}
