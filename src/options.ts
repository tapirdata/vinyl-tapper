import { TransformOptions } from 'stream';

export interface TapperOptions extends TransformOptions {
  single?: boolean;
  provideBuffer?: boolean;
  terminate?: boolean;
}
