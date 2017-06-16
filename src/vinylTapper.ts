import stream = require("stream")
import { Cb, TapperOptions } from "./options"
import { SingleTapper } from "./singleTapper"

export class VinylTapper extends stream.Transform {

  protected provideBuffer?: boolean
  protected terminate?: boolean
  protected isFin?: boolean
  protected waitCount: number

  constructor(options: TapperOptions = {}) {
    super({objectMode: true})
    this.provideBuffer = options.provideBuffer
    this.terminate = options.terminate
    this.waitCount = 0

    if (this.terminate) {
      this.isFin = false
      this.on("finish", () => {
        this.isFin = true
        this.checkFin()
      })
    }
  }

  public _transform(file: any, enc: string, next: Cb) {
    file = this.tapFile(file, (buffer: Buffer) => {
      this.emitTap(file, buffer)
      if (this.terminate) {
        --this.waitCount
        return this.checkFin()
      }
    })
    next(null, file)
  }

  protected checkFin() {
    if (this.isFin && this.waitCount === 0) {
      this.resume()
    }
  }

  protected tapFile(file: any, done: Cb) {
    ++this.waitCount
    if (file.isNull()) {
      done(null)
      return file
    }
    if (file.isBuffer()) {
      done(file.contents)
      return file
    }
    const singleTapper = new SingleTapper({
      provideBuffer: this.provideBuffer,
      terminate: this.terminate,
    })
    singleTapper.on("tap", (buffer: Buffer) => done(buffer))
    file.contents = file.contents.pipe(singleTapper)
    return file
  }

  protected emitTap(file: any, buffer: Buffer) {
    this.emit("tap", file, buffer)
  }
}
