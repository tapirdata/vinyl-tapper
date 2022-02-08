import { TapperOptions } from "./options";
import { SingleTapper } from "./singleTapper";
import { VinylTapper } from "./vinylTapper";

export interface Factory {
  (options: TapperOptions): SingleTapper | VinylTapper;
  SingleTapper: typeof SingleTapper;
  VinylTapper: typeof VinylTapper;
}

const factory = ((options: TapperOptions) => {
  if (options && options.single) {
    return new SingleTapper(options);
  } else {
    return new VinylTapper(options);
  }
}) as Factory;

factory.SingleTapper = SingleTapper; // legacy
factory.VinylTapper = VinylTapper; // legacy

export default factory;
export { TapperOptions, SingleTapper, VinylTapper };
