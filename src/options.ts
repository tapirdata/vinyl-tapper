import stream = require("stream")

export type Cb = (err?: any, val?: any) => void

export interface TapperOptions extends stream.TransformOptions {
  single?: boolean,
  provideBuffer?: boolean,
  terminate?: boolean,
}
