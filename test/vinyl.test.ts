import { expect } from "chai";
import fs = require("fs");
import path = require("path");
import rimraf = require("rimraf");
import { Transform } from "stream";
import File = require("vinyl");
import vinylFs = require("vinyl-fs");
import { walk, WalkStatEventCallback, WalkStats } from "walk";

import streamTapper from "../src";

const fileCount = 2;
const srcDir = path.join(__dirname, "fixtures");
const destDir = path.join(__dirname, ".out");
const dumpDir = path.join(__dirname, ".dump");

interface TapResults {
  [key: string]: Buffer | null;
}

type Done = (error?: Error) => void;

interface TestOptions {
  useBuffer?: boolean;
  provideBuffer?: boolean;
  terminate?: boolean;
}

function equalBuffers(b1: Buffer, b2: Buffer | null) {
  if (b2 == null) {
    return false;
  }
  if (typeof b1.equals === "function") {
    return b1.equals(b2);
  } else {
    // node 0.10
    return b1.toString("binary") === b2.toString("binary");
  }
}

function compareTrees(
  srcRoot: string,
  destRoot: string,
  destBuffers: null | Record<string, Buffer | null>,
  done: Done
) {
  const walker = walk(srcDir);

  walker.on(
    "file",
    (src: string, stat: WalkStats, next: WalkStatEventCallback) => {
      const srcPath = path.join(src, stat.name);
      const destPath = path.join(
        destRoot,
        path.relative(src, srcDir),
        stat.name
      );
      return fs.readFile(srcPath, (err, srcBuffer) => {
        if (err) {
          done(err);
          return;
        }
        if (destBuffers) {
          const destBuffer = destBuffers[destPath];
          if (!equalBuffers(srcBuffer, destBuffer)) {
            done(new Error(`not equal: ${srcPath}`));
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          next(src, stat, () => {});
          return;
        } else {
          fs.readFile(destPath, (destErr, destBuffer) => {
            if (destErr) {
              done(destErr);
              return;
            }
            if (!equalBuffers(srcBuffer, destBuffer)) {
              done(new Error(`not equal: ${srcPath}`));
              return;
            }
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            next(src, stat, () => {});
          });
          return;
        }
      });
    }
  );

  return walker.on("end", () => done());
}

function makeTests(title: string, options: TestOptions) {
  describe(title, () => {
    const tapResults: TapResults = {};
    const tapper = streamTapper({
      provideBuffer: options.provideBuffer,
      terminate: options.terminate,
    });
    tapper.on("tap", (file: File, buffer: Buffer) => {
      const destPath = path.join(destDir, path.relative(srcDir, file.path));
      tapResults[destPath] = buffer || Buffer.from("nothing");
    });

    before((done) => {
      rimraf(destDir, () => {
        let well: Transform = vinylFs
          .src("**/*.*", {
            cwd: srcDir,
            buffer: options.useBuffer,
          })
          .pipe(tapper);
        if (!options.terminate) {
          well = well.pipe(vinylFs.dest(destDir)) as Transform;
        }
        well.on("end", done);
        if (!options.terminate) {
          return (well = well.pipe(vinylFs.dest(dumpDir)) as Transform);
        }
      });
    });

    if (!options.terminate) {
      it("should pass all files unmodified", (done: Done) => {
        compareTrees(srcDir, destDir, null, done);
      });
    }

    it("should tap all files", () =>
      // console.log 'tapResults=', tapResults
      expect(Object.keys(tapResults)).to.have.length(fileCount));

    if (options.provideBuffer) {
      return it("should provide the buffers correctly", (done: Done) => {
        compareTrees(srcDir, destDir, tapResults, done);
      });
    }
  });
}

describe("stream-tapper for vinyl-stream", () => {
  makeTests("with buffer-files", { useBuffer: true });

  makeTests("with stream-files", { useBuffer: false });

  makeTests("with buffer-files, need buffer", {
    useBuffer: true,
    provideBuffer: true,
  });

  makeTests("with stream-files, need buffer", {
    useBuffer: false,
    provideBuffer: true,
  });

  makeTests("with buffer-files, terminate", {
    useBuffer: true,
    terminate: true,
  });

  makeTests("with stream-files, terminate", {
    useBuffer: false,
    terminate: true,
  });

  makeTests("with buffer-files, need buffer, terminate", {
    useBuffer: true,
    terminate: true,
    provideBuffer: true,
  });

  return makeTests("with stream-files, need buffer, terminate", {
    useBuffer: false,
    terminate: true,
    provideBuffer: true,
  });
});
