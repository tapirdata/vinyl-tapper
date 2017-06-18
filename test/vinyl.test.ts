import fs = require("fs")
import path = require("path")
import rimraf = require("rimraf")
import File = require("vinyl")
import vinylFs = require("vinyl-fs")
import { expect } from "chai"
import streamTapper from "../src"
import { Cb } from "../src/options"

const fileCount = 2
const srcDir = path.join(__dirname, "fixtures")
const destDir = path.join(__dirname, ".out")
const dumpDir = path.join(__dirname, ".dump")

interface TapResults {
  [key: string]: any
}

function equalBuffers(b1: Buffer, b2: Buffer) {
  if (typeof b1.equals === "function") {
    return b1.equals(b2)
  } else { // node 0.10
    return b1.toString("binary") === b2.toString("binary")
  }
}

function compareTrees(srcRoot: string, destRoot: string, destBuffers: any, done: Cb) {
  const walk = require("walk")
  const walker = walk.walk(srcDir)

  walker.on("file", (src: string, stat: any, next: Cb) => {
    const srcPath = path.join(src, stat.name)
    const destPath = path.join(destRoot, path.relative(src, srcDir), stat.name)
    return fs.readFile(srcPath, (err, srcBuffer) => {
      if (err) {
        done(err)
        return
      }
      if (destBuffers) {
        const destBuffer = destBuffers[destPath]
        if (!equalBuffers(srcBuffer, destBuffer)) {
          done(new Error(`not equal: ${srcPath}`))
          return
        }
        next()
        return
      } else {
        fs.readFile(destPath, (destErr, destBuffer) => {
          if (destErr) {
            done(destErr)
            return
          }
          if (!equalBuffers(srcBuffer, destBuffer)) {
            done(new Error(`not equal: ${srcPath}`))
            return
          }
          next()
        })
        return
      }
    })
  })

  return walker.on("end", () => done(),
  )
}

function makeTests(title: string, options: any) {

  describe(title, () => {
    const tapResults: TapResults = {}
    const tapper = streamTapper({
      provideBuffer: options.provideBuffer,
      terminate: options.terminate,
    })
    tapper.on("tap", (file: File, buffer: Buffer) => {
      const destPath = path.join(destDir, path.relative(srcDir, file.path))
      tapResults[destPath] = buffer || "nothing"
    })

    before((done) => {
      rimraf(destDir, () => {
        let well: any = vinylFs.src("**/*.*", {
          cwd: srcDir,
          buffer: options.useBuffer,
        })
        .pipe(tapper)
        if (!options.terminate) {
          well = well.pipe(vinylFs.dest(destDir))
        }
        well.on("end", done)
        if (!options.terminate) {
          return well = well.pipe(vinylFs.dest(dumpDir))
        }
      })
    })

    if (!options.terminate) {
      it("should pass all files unmodified", (done) => {
        compareTrees(srcDir, destDir, null, (err: any) => done(err))
      })
    }

    it("should tap all files", () =>
      // console.log 'tapResults=', tapResults
      expect(Object.keys(tapResults)).to.have.length(fileCount),

    )

    if (options.provideBuffer) {
      return it("should provide the buffers correctly", (done) => {
        compareTrees(srcDir, destDir, tapResults, (err: any) => done(err))
      })
    }
  })
}

describe("stream-tapper for vinyl-stream", () => {
  makeTests("with buffer-files",
    {useBuffer: true})

  makeTests("with stream-files",
    {useBuffer: false})

  makeTests("with buffer-files, need buffer", {
    useBuffer: true,
    provideBuffer: true,
  })

  makeTests("with stream-files, need buffer", {
    useBuffer: false,
    provideBuffer: true,
  })

  makeTests("with buffer-files, terminate", {
    useBuffer: true,
    terminate: true,
  })

  makeTests("with stream-files, terminate", {
    useBuffer: false,
    terminate: true,
  })

  makeTests("with buffer-files, need buffer, terminate", {
    useBuffer: true,
    terminate: true,
    provideBuffer: true,
  })

  return makeTests("with stream-files, need buffer, terminate", {
    useBuffer: false,
    terminate: true,
    provideBuffer: true,
  })

})
