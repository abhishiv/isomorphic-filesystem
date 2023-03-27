import { nanoid } from "nanoid";
import {
  ApiError,
  BFSCallback,
  BFSOneArgCallback,
  ErrorCode,
  FileType,
  IAdapterNodeRecord,
  IFileSystem,
  IFileSystemAdapter,
  IFileSystemMountMap,
  Stats,
} from "./specs/fs";
export * from "./specs/fs";

import { digestBuffer, normalizeOptions, normalizePath } from "./utils/index";

import nodePath from "./utils/path";
export const path = nodePath;

export * from "./utils/index";
export * from "./adapters/indexeddb";
export * from "./adapters/memory";

const shortid = { generate: () => nanoid() };

export function Bufferfrom(obj: string, encoding?: string) {
  console.log(obj);
  //  console.log(Buffer.from(obj).toString('utf8'))
  return new TextEncoder().encode(obj);
}

const nopCb = () => {};
//implements IFileSystem
export class FS implements IFileSystem {
  mountMap: IFileSystemMountMap;
  adapter: IFileSystemAdapter<IAdapterNodeRecord>;
  constructor(adapter: IFileSystemAdapter<IAdapterNodeRecord>) {
    this.adapter = adapter;
    this.mountMap = {};
  }
  // FILE OR DIRECTORY METHODS

  /**
   * Asynchronous rename. No arguments other than a possible exception are given
   * to the completion callback.
   * @param oldPath
   * @param newPath
   * @param callback
   */
  rename(oldPath: string, newPath: string, cb: BFSOneArgCallback): void {
    //console.error("FS#NOIMP rename");
    cb(new ApiError(ErrorCode.ENOTSUP));
  }
  renameSync(oldPath: string, newPath: string): void {
    //console.error("FS#NOIMP rename");
    throw new ApiError(ErrorCode.ENOTSUP);
  }

  /**
   * Asynchronous `stat`.
   * @param path
   * @param callback
   */
  _nodeRecrodToStat = (existingRecord: IAdapterNodeRecord) => {
    return new Stats({
      dev: 0,
      ino: 0,
      type: existingRecord.type,
      mode: existingRecord.mode,
      nlink: 1,
      uid: 0,
      gid: 0,
      rdev: 0,
      size: existingRecord.size as number,
      blksize: 4096,
      blocks: 8,
      atimeMs: null as unknown as number,
      mtimeMs: existingRecord.mtime,
      ctimeMs: existingRecord.ctime,
      birthtimeMs: existingRecord.birthtime,
      atime: null as unknown as Date,
      mtime: new Date(existingRecord.mtime),
      ctime: new Date(existingRecord.ctime),
      birthtime: new Date(existingRecord.birthtime),
    });
  };
  statSync = (path: string): Stats => {
    const existingRecord = (
      this.adapter.query({
        id: normalizePath(path),
      }) as IAdapterNodeRecord[]
    )[0];
    if (existingRecord) {
      return this._nodeRecrodToStat(existingRecord);
    } else {
      throw new ApiError(ErrorCode.ENOENT);
    }
  };
  /**
   * Asynchronous `stat`.
   * @param path
   * @param callback
   */
  stat = async (path: string, cb: BFSCallback<Stats>): Promise<void> => {
    const existingRecord = (
      await this.adapter.query({
        id: normalizePath(path),
      })
    )[0];
    if (existingRecord) {
      cb(null, this._nodeRecrodToStat(existingRecord));
    } else {
      cb(new ApiError(ErrorCode.ENOENT));
    }
  };

  /**
   * Asynchronous `lstat`.
   * `lstat()` is identical to `stat()`, except that if path is a symbolic link,
   * then the link itself is stat-ed, not the file that it refers to.
   * @param path
   * @param callback
   */
  lstat = async (path: string, cb: BFSCallback<Stats>): Promise<void> => {
    const existingRecord = (
      await this.adapter.query({
        id: normalizePath(path),
      })
    )[0];
    if (existingRecord) {
      cb(null, this._nodeRecrodToStat(existingRecord));
    } else {
      cb(new ApiError(ErrorCode.ENOENT));
    }
  };
  lstatSync = (path: string): Stats => {
    const existingRecord = (
      this.adapter.query({
        id: normalizePath(path),
      }) as IAdapterNodeRecord[]
    )[0];
    if (existingRecord) {
      return this._nodeRecrodToStat(existingRecord);
    } else {
      throw new ApiError(ErrorCode.ENOENT);
    }
  };

  unlink = async (path: string, cb: BFSOneArgCallback): Promise<void> => {
    const existingRecord = (
      await this.adapter.query({
        id: normalizePath(path),
      })
    )[0];
    if (existingRecord) {
      await this.adapter.delete({ id: existingRecord.id });
      cb();
    } else {
      cb(new ApiError(ErrorCode.ENOENT));
    }
  };

  unlinkSync = (path: string): void => {
    const existingRecord = (
      this.adapter.query({
        id: normalizePath(path),
      }) as IAdapterNodeRecord[]
    )[0];
    if (existingRecord) {
      this.adapter.delete({ id: existingRecord.id });
    } else {
      throw new ApiError(ErrorCode.ENOENT);
    }
  };

  public readFile = async (
    filename: string,
    arg2: { encoding: string; flag?: string },
    callback?: BFSCallback<string>
  ): Promise<void> => {
    const options = normalizeOptions(arg2, null, "r", null);
    let cb = typeof arg2 === "function" ? arg2 : callback;
    cb = cb || function () {};
    const existingRecord = (
      await this.adapter.query({
        id: normalizePath(filename),
      })
    )[0];

    if (existingRecord) {
      if (existingRecord.type !== FileType.FILE) {
        return cb(new ApiError(ErrorCode.EISDIR));
      }
      const data = Bufferfrom(existingRecord.data, options.encoding as any);
      const result = data && options.encoding ? data.toString() : data;

      cb(null, result as string);
    } else {
      console.info("ErrorCode.ENOENT", filename);
      //console.error(filename)
      cb(new ApiError(ErrorCode.ENOENT));
    }
  };
  public readFileSync(
    filename: string,
    arg2: string | { encoding: string; flag?: string }
  ): any {
    const options = normalizeOptions(arg2, null, "r", null);
    const existingRecord = (
      this.adapter.query({
        id: normalizePath(filename),
      }) as IAdapterNodeRecord[]
    )[0];

    if (existingRecord) {
      if (existingRecord.type !== FileType.FILE) {
        throw new ApiError(ErrorCode.EISDIR);
      }
      const data = Bufferfrom(existingRecord.data, options.encoding as any);
      const result = data && options.encoding ? data.toString() : data;

      return result;
    } else {
      console.info("ErrorCode.ENOENT", filename);
      throw new ApiError(ErrorCode.ENOENT);
    }
  }

  public writeFile = async (
    filename: string,
    data: any,
    arg3?: { encoding?: string; mode?: string | number; flag?: string },
    cb?: BFSOneArgCallback
  ): Promise<void> => {
    const options = normalizeOptions(arg3, "utf8", "w", 0x1a4);
    cb = typeof arg3 === "function" ? arg3 : cb;
    cb = cb || function () {};
    //console.log("writefile", filename, options, data);
    const parentRecord = (
      await this.adapter.query({
        id: normalizePath(nodePath.dirname(filename)),
      })
    )[0];
    if (!parentRecord) {
      return cb(new ApiError(ErrorCode.ENOENT));
    }
    const existingRecord = (
      await this.adapter.query({
        id: normalizePath(filename),
      })
    )[0];
    try {
      const payload = this._inputToNodeRecord(
        filename,
        data,
        options,
        existingRecord
      );

      if (existingRecord) {
        await this.adapter.update({ id: filename }, payload);
      } else {
        await this.adapter.create(payload);
      }
      cb();
    } catch (e: any) {
      //console.log('eee', e, filename)
      cb(e);
    }
  };
  _inputToNodeRecord(
    filename: string,
    data: any,
    options: any,
    existingRecord: IAdapterNodeRecord
  ): IAdapterNodeRecord {
    const buf = Bufferfrom(data, options.encoding as any);
    const now = new Date().getTime();
    const checksum = digestBuffer(buf);
    const payload = {
      ...(existingRecord ? existingRecord : {}),
      data: buf,
      id: filename,
      mode: options.mode,
      type: FileType.FILE,
      encoding: options.encoding,
      checksum,
      name: nodePath.basename(filename),
      parentPath: nodePath.dirname(filename),
      size: buf.length,
      birthtime: existingRecord ? existingRecord.birthtime : now,
      mtime: now,
      rev: shortid.generate(),
    };
    return payload;
  }

  public writeFileSync = (
    filename: string,
    data: any,
    arg3?: { encoding?: string; mode?: string | number; flag?: string }
  ): void => {
    const options = normalizeOptions(arg3, "utf8", "w", 0x1a4);
    //console.log("writefile", filename, options, data);
    const parentRecord = (
      this.adapter.query({
        id: normalizePath(nodePath.dirname(filename)),
      }) as IAdapterNodeRecord[]
    )[0];
    if (!parentRecord) {
      throw new ApiError(ErrorCode.ENOENT);
    }
    const existingRecord = (
      this.adapter.query({
        id: normalizePath(filename),
      }) as IAdapterNodeRecord[]
    )[0];
    try {
      const payload = this._inputToNodeRecord(
        filename,
        data,
        options,
        existingRecord
      );
      if (existingRecord) {
        this.adapter.update({ id: filename }, payload);
      } else {
        this.adapter.create(payload);
      }
    } catch (e) {
      //console.error(e, filename, data);
      throw e;
    }
  };

  rmdir = async (path: string, cb: BFSOneArgCallback): Promise<void> => {
    console.log("rmdir", path);
    const existingRecord = (
      await this.adapter.query({
        id: normalizePath(path),
      })
    )[0];
    if (existingRecord) {
      this.adapter.delete({ id: existingRecord.id });
    } else {
      cb(new ApiError(ErrorCode.ENOENT));
    }
  };
  rmdirSync = (path: string): void => {
    console.log("rmdir", path);
    const existingRecord = (
      this.adapter.query({
        id: normalizePath(path),
      }) as IAdapterNodeRecord[]
    )[0];
    if (existingRecord) {
      this.adapter.delete({ id: existingRecord.id });
    } else {
      throw new ApiError(ErrorCode.ENOENT);
    }
  };

  mkdir = async (
    p: string,
    mode?: any,
    cb: BFSOneArgCallback = nopCb
  ): Promise<void> => {
    const path = p;
    if (path === "/node_modules/react-dom/cjs") {
      // debugger
    }
    if (typeof mode === "function") {
      cb = mode;
      mode = 0x1ff;
    }
    const existingRecord = (
      await this.adapter.query({
        id: normalizePath(path),
      })
    )[0];

    if (existingRecord) {
      //console.error("EEXIST", path, existingRecord);

      return cb(new ApiError(ErrorCode.EEXIST));
      //await this.adapter.update({ id: path }, payload);
    }
    const parentRecord = (
      await this.adapter.query({
        id: normalizePath(nodePath.dirname(path)),
      })
    )[0];

    if (path !== "/" && !parentRecord) {
      return cb(new ApiError(ErrorCode.ENOENT));
    }
    const now = new Date().getTime();
    //console.log("existingRecord", existingRecord);
    const payload = {
      ...(existingRecord ? existingRecord : {}),
      id: path,
      mode: mode,
      type: FileType.DIRECTORY,
      parentPath: path === "/" ? null : nodePath.dirname(path),
      name: nodePath.basename(path),
      rev: shortid.generate(),
      mtime: now,
      birthtime: now,
    };
    try {
      await this.adapter.create(payload as any);
      cb();
    } catch (e) {
      //console.error('error', e, path)
      cb(new ApiError(ErrorCode.EEXIST));
    }
  };
  mkdirSync = (p: string, mode?: any): void => {
    const path = p;
    //console.log("mkdir", path, mode);
    if (typeof mode === "function") {
      mode = 0x1ff;
    }
    const existingRecord = (
      this.adapter.query({
        id: normalizePath(path),
      }) as IAdapterNodeRecord[]
    )[0];

    if (existingRecord) {
      //console.error("EEXIST", path, existingRecord);
      throw new ApiError(ErrorCode.EEXIST);
      //await this.adapter.update({ id: path }, payload);
    }
    const parentRecord = (
      this.adapter.query({
        id: normalizePath(nodePath.dirname(path)),
      }) as IAdapterNodeRecord[]
    )[0];

    if (!parentRecord && path !== "/") {
      throw new ApiError(ErrorCode.ENOENT);
    }
    const now = new Date().getTime();
    //console.log("existingRecord", existingRecord);
    const payload = {
      ...(existingRecord ? existingRecord : {}),
      id: path,
      mode: mode,
      type: FileType.DIRECTORY,
      parentPath: path === "/" ? null : nodePath.dirname(path),
      name: nodePath.basename(path),
      rev: shortid.generate(),
      mtime: now,
      birthtime: now,
    };
    try {
      this.adapter.create(payload as any);
    } catch (e) {
      new ApiError(ErrorCode.EEXIST);
    }
  };

  /**
   * Asynchronous `readdir`. Reads the contents of a directory.
   * The callback gets two arguments `(err, files)` where `files` is an array of
   * the names of the files in the directory excluding `'.'` and `'..'`.
   * @param path
   * @param callback
   */
  readdirSync = (p: string): string[] => {
    //console.log("readdir", path);
    const path = normalizePath(p);
    const existingRecord = (
      this.adapter.query({
        id: normalizePath(path),
      }) as IAdapterNodeRecord[]
    )[0];
    //console.log("readdir existingRecord", existingRecord);
    if (!existingRecord && path !== "/") {
      //console.error(ErrorCode.ENOENT, normalizePath(path), path);
      throw new ApiError(ErrorCode.ENOENT);
    } else {
      const children = this.adapter.query({
        parentPath: normalizePath(path),
      }) as IAdapterNodeRecord[];

      return children.map((el) => nodePath.basename(el.id));
    }
  };
  readdir = async (p: string, cb: BFSCallback<string[]>): Promise<void> => {
    //console.log("readdir", path);
    const path = normalizePath(p);
    const existingRecord = (
      await this.adapter.query({
        id: path,
      })
    )[0];
    //console.log("readdir existingRecord", existingRecord);
    if (!existingRecord && path !== "/") {
      //console.error(ErrorCode.ENOENT, normalizePath(path), path);
      cb(new ApiError(ErrorCode.ENOENT));
    } else {
      const children = await this.adapter.query({
        parentPath: normalizePath(path),
      });
      cb(
        null,
        children.map((el) => nodePath.basename(el.id))
      );
    }
  };

  // SYMLINK METHODS

  /**
   * Asynchronous `link`.
   * @param srcpath
   * @param dstpath
   * @param callback
   */
  link = async (
    srcpath: string,
    dstpath: string,
    cb: BFSOneArgCallback
  ): Promise<void> => {
    //console.error("FS#NOIMP link");
    const existingRecord = (
      await this.adapter.query({
        id: normalizePath(srcpath),
      })
    )[0];

    if (existingRecord) {
      cb(new ApiError(ErrorCode.EEXIST));
    } else {
      const now = new Date().getTime();
      const payload = {
        data: dstpath,
        id: srcpath,
        type: FileType.SYMLINK,
        name: nodePath.basename(srcpath),
        // TODO fix this
        mode: 0o666,
        parentPath: nodePath.dirname(srcpath),
        birthtime: existingRecord ? (existingRecord as any).birthtime : now,
        mtime: now,
        rev: shortid.generate(),
        // todo create checksum
        checksum: shortid.generate(),
      };
      await this.adapter.create(payload);
    }
  };
  /**
   * Asynchronous `symlink`.
   * @param srcpath
   * @param dstpath
   * @param type can be either `'dir'` or `'file'` (default is `'file'`)
   * @param callback
   */
  symlink = async (
    srcpath: string,
    dstpath: string,
    type?: string,
    cb?: BFSOneArgCallback
  ): Promise<void> => {
    const source = normalizePath(srcpath);
    const destination = normalizePath(dstpath);
    if (typeof type === "function") {
      cb = type;
      type = "file";
    }
    cb = cb || function () {};
    const existingRecord = (
      await this.adapter.query({
        id: normalizePath(srcpath),
      })
    )[0];

    if (existingRecord) {
      cb(new ApiError(ErrorCode.EEXIST));
    } else {
      const now = new Date().getTime();
      const payload = {
        destination,
        linkType: type,
        id: nodePath.join(destination, source),
        type: FileType.SYMLINK,
        name: nodePath.basename(source),
        // TODO fix this
        mode: 0o666,
        parentPath: nodePath.dirname(source),
        birthtime: existingRecord ? (existingRecord as any).birthtime : now,
        mtime: now,
        rev: shortid.generate(),
        // todo create checksum
        checksum: shortid.generate(),
      };
      await this.adapter.create(payload);
      cb();
    }
  };

  /**
   * Asynchronous readlink.
   * @param path
   * @param callback
   */
  readlink(path: string, cb: BFSCallback<string>): void {
    //console.error("FS#NOIMP readlink");
    cb(new ApiError(ErrorCode.ENOTSUP));
  }

  /**
   * Asynchronous `chown`.
   * @param path
   * @param uid
   * @param gid
   * @param callback
   */
  chown(path: string, uid: number, gid: number, cb: BFSOneArgCallback): void {
    //console.error("FS#NOIMP chown");
    cb(new ApiError(ErrorCode.ENOTSUP));
  }

  /**
   * Asynchronous `chmod`.
   * @param path
   * @param mode
   * @param callback
   */
  chmod(path: string, mode: number | string, cb: BFSOneArgCallback): void {
    //console.error("FS#NOIMP chmod");
    cb(new ApiError(ErrorCode.ENOTSUP));
  }

  /**
   * Synchronous `realpath`.
   * @param path
   * @param cache An object literal of mapped paths that can be used to
   *   force a specific path resolution or avoid additional `fs.stat` calls for
   *   known real paths.
   * @return [String]
   */
  public realpathSync(
    path: string,
    cache: { [path: string]: string } = {}
  ): string {
    // TODO: implement this
    return normalizePath(path);
  }

  /**
   * Test whether or not the given path exists by checking with the file system.
   * @param path
   * @return [boolean]
   */
  public existsSync(path: string): boolean {
    try {
      const result = this.adapter.query({
        id: normalizePath(path),
      }) as IAdapterNodeRecord[];
      const existingRecord = result[0];
      return !!existingRecord;
    } catch (e) {
      // Doesn't return an error. If something bad happens, we assume it just
      // doesn't exist.
      return false;
    }
  }
}

export default FS;
