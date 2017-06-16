import { TapperOptions } from "./options"
import { SingleTapper } from "./singleTapper"
import { VinylTapper } from "./vinylTapper"

export interface Factory {
  (options: TapperOptions): SingleTapper | VinylTapper,
  SingleTapper: any
  VinylTapper: any
}

const factory = ((options: TapperOptions) => {
  if (options && options.single) {
    return new SingleTapper(options)
  } else {
    return new VinylTapper(options)
  }
}) as Factory

factory.SingleTapper = SingleTapper
factory.VinylTapper = VinylTapper

export default factory
