import stream = require("stream");

export interface TapperOptions extends stream.TransformOptions {
  single?: boolean;
  provideBuffer?: boolean;
  terminate?: boolean;
}
