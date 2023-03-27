import { md5 } from "pure-md5";
import nodePath from "./path";
import { IFileSystem, FileType, IFileSystemAdapter } from "../specs/fs";
import FS from "../index";

export const isRelative = (filename: string) => {
  const DOT = ".";
  const F_SLASH = "/";
  const B_SLASH = "\\";

  const first = filename.charAt(0);
  const second = filename.charAt(1);
  const third = filename.charAt(2);
  if (
    first === DOT &&
    ((second === DOT && third === F_SLASH) || second === F_SLASH)
  ) {
    return true;
  }
  if (
    first === DOT &&
    ((second === DOT && third === B_SLASH) || second === B_SLASH)
  ) {
    return true;
  }
  return false;
};

export async function mkdirP(
  fs: IFileSystem,
  p: string,
  mode?: any
): Promise<void> {
  return new Promise(function (resolve, reject) {
    mkdirPFunction(p, { fs }, (err?: Error) => {
      if (err) console.log("err", err);
      if (err) return reject(err);
      resolve();
    });
  });
}
export function mkdirPFunction(
  p: string,
  opts: { fs?: any; mode?: any },
  f: any,
  made?: any
) {
  const _0777 = parseInt("0777", 8);
  if (typeof opts === "function") {
    f = opts;
    opts = {};
  } else if (!opts || typeof opts !== "object") {
    opts = { mode: opts };
  }

  let mode = opts.mode;
  const xfs = opts.fs;

  if (mode === undefined) {
    // todo check mode
    mode = _0777; // & ~process.umask();
  }
  if (!made) made = null;

  const cb = f || function () {};
  p = nodePath.resolve(p);

  xfs.mkdir(p, mode, function (er: any) {
    if (!er) {
      made = made || p;
      return cb(null, made);
    }

    switch (er.code) {
      case "ENOENT":
        mkdirPFunction(
          nodePath.dirname(p),
          opts,
          function (er: any, made: any) {
            if (er) cb(er, made);
            else mkdirPFunction(p, opts, cb, made);
          },
          undefined
        );
        break;

      // In the case of any other error, just see if there's a dir
      // there already.  If so, then hooray!  If not, then something
      // is borked.
      default:
        xfs.stat(p, function (er2: any, stat: any) {
          // if the stat fails, then that's super weird.
          // let the original error be the failure reason.
          if (er2 || !stat.isDirectory()) cb(er, made);
          else cb(null, made);
        });
        break;
    }
  });
}

export const readDirRecursively = async (
  fs: IFileSystem,
  dir: string,
  opts?: { filterSubdirs: (args: string[]) => string[] }
): Promise<string[]> => {
  return new Promise(function (resolve, reject) {
    let results: string[] = [];
    fs.readdir(dir, (err: any, files: string[] | undefined) => {
      if (err || !files) return reject(err);
      const f = opts && opts.filterSubdirs ? opts.filterSubdirs(files) : files;
      let pending = f.length;
      if (!pending) return resolve(results);
      f.forEach(async (file: string) => {
        file = nodePath.resolve(dir, file);
        fs.stat(file, async (err: any, stats: any) => {
          if (stats && stats.isDirectory()) {
            const res = await readDirRecursively(fs, file, opts);
            results = results.concat(res || []);
            if (!--pending) resolve(results);
          } else {
            results.push(file);
            if (!--pending) resolve(results);
          }
        });
      });
    });
  });
};

export function resolveLink() {}

export function digestBuffer(buffer: string) {
  return md5(buffer.toString());
}

export function normalizeMode(
  mode: number | string | null | undefined,
  def: number
): number {
  switch (typeof mode) {
    case "number":
      // (path, flag, mode, cb?)
      return <number>mode;
    case "string":
      // (path, flag, modeString, cb?)
      const trueMode = parseInt(<string>mode, 8);
      if (!isNaN(trueMode)) {
        return trueMode;
      }
      // Invalid string.
      return def;
    default:
      return def;
  }
}
// This maps the integer permission modes from http://linux.die.net/man/3/open
// to node.js-specific file open permission strings at http://nodejs.org/api/fs.html#fs_fs_open_path_flags_mode_callback
export const flagsToPermissionStringMap = {
  0 /*O_RDONLY*/: "r",
  1 /*O_WRONLY*/: "r+",
  2 /*O_RDWR*/: "r+",
  64 /*O_CREAT*/: "r",
  65 /*O_WRONLY|O_CREAT*/: "r+",
  66 /*O_RDWR|O_CREAT*/: "r+",
  129 /*O_WRONLY|O_EXCL*/: "rx+",
  193 /*O_WRONLY|O_CREAT|O_EXCL*/: "rx+",
  514 /*O_RDWR|O_TRUNC*/: "w+",
  577 /*O_WRONLY|O_CREAT|O_TRUNC*/: "w",
  578 /*O_CREAT|O_RDWR|O_TRUNC*/: "w+",
  705 /*O_WRONLY|O_CREAT|O_EXCL|O_TRUNC*/: "wx",
  706 /*O_RDWR|O_CREAT|O_EXCL|O_TRUNC*/: "wx+",
  1024 /*O_APPEND*/: "a",
  1025 /*O_WRONLY|O_APPEND*/: "a",
  1026 /*O_RDWR|O_APPEND*/: "a+",
  1089 /*O_WRONLY|O_CREAT|O_APPEND*/: "a",
  1090 /*O_RDWR|O_CREAT|O_APPEND*/: "a+",
  1153 /*O_WRONLY|O_EXCL|O_APPEND*/: "ax",
  1154 /*O_RDWR|O_EXCL|O_APPEND*/: "ax+",
  1217 /*O_WRONLY|O_CREAT|O_EXCL|O_APPEND*/: "ax",
  1218 /*O_RDWR|O_CREAT|O_EXCL|O_APPEND*/: "ax+",
  4096 /*O_RDONLY|O_DSYNC*/: "rs",
  4098 /*O_RDWR|O_DSYNC*/: "rs+",
};

export function normalizeOptions(
  options: any,
  defEnc: string | null,
  defFlag: string,
  defMode: number | null
): { encoding: string; flag: string; mode: number } {
  // typeof null === 'object' so special-case handing is needed.
  switch (options === null ? "null" : typeof options) {
    case "object":
      return {
        encoding:
          typeof options["encoding"] !== "undefined"
            ? options["encoding"]
            : defEnc,
        flag:
          typeof options["flag"] !== "undefined" ? options["flag"] : defFlag,
        mode: normalizeMode(options["mode"], defMode!),
      };
    case "string":
      return {
        encoding: options,
        flag: defFlag,
        mode: defMode!,
      };
    case "null":
    case "undefined":
    case "function":
      return {
        encoding: defEnc!,
        flag: defFlag,
        mode: defMode!,
      };
    default:
      throw new TypeError(
        `"options" must be a string or an object, got ${typeof options} instead.`
      );
  }
}

// TODO: clean and merge this file with utils/fs

export async function copyAsyncToSync(
  folderPath: string,
  asyncAdapter: IFileSystemAdapter<any>,
  syncAdapter: IFileSystemAdapter<any>
) {
  const asyncFS = new FS(asyncAdapter);
  const syncFS = new FS(syncAdapter);
  try {
    await mkdirP(syncFS, folderPath);
  } catch (e) {}
  const asyncFSSnapshot = await asyncAdapter.export(folderPath);
  await syncAdapter.import(folderPath, asyncFSSnapshot);
}

export function normalizePath(str: string) {
  if (str === "/") return str;
  const path = nodePath.normalize(str);
  return str[str.length - 1] === "/" ? str.slice(0, str.length - 1) : str;
}
