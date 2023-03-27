export interface IAdapterRecord {
  id: string
}
export interface IAdapterBlobRecord extends IAdapterRecord {
  data: any
}
export interface IAdapterNodeRecord extends IAdapterRecord {
  parentPath?: string
  name: string
  mode: any
  type: FileType
  encoding?: string
  atime?: any
  mtime?: any
  ctime?: any
  birthtime: any
  data?: any
  size?: number
  checksum: string
  destination?: string
  linkType?: string

  rev: string
}

export type IAdapterQuery = any
export interface IFileSystemAdapterSnapshot {
  blobs: IAdapterBlobRecord[]
  nodes: IAdapterNodeRecord[]
}
export interface IFileSystemAdapter<T> {
  type: 'sync' | 'async'
  create(payload: T): Promise<void> | void
  update(query: IAdapterQuery, payload: T): Promise<void> | void
  query(query: IAdapterQuery): Promise<T[]> | T[]
  delete<IAdapterRecord>(query: IAdapterQuery): Promise<void> | void
  export(path: string): IFileSystemAdapterSnapshot | Promise<IFileSystemAdapterSnapshot>
  import(path: string, snapshot: IFileSystemAdapterSnapshot): void | Promise<void>
}
export enum FileType {
  FILE = 0x8000,
  DIRECTORY = 0x4000,
  SYMLINK = 0xa000
}

export interface IStats {
  dev: number
  ino: number
  mode: number
  nlink: number
  uid: number
  gid: number
  rdev: number
  type: number
  size: number
  blksize: number
  blocks: number
  atimeMs: number
  mtimeMs: number
  ctimeMs: number
  birthtimeMs: number
  atime: Date
  mtime: Date
  ctime: Date
  birthtime: Date
}
export class Stats implements IStats {
  dev: number
  ino: number
  mode: number
  type: number
  nlink: number
  uid: number
  gid: number
  rdev: number
  size: number
  blksize: number
  blocks: number
  atimeMs: number
  mtimeMs: number
  ctimeMs: number
  birthtimeMs: number
  atime: Date
  mtime: Date
  ctime: Date
  birthtime: Date
  constructor(props: IStats) {
    const {
      dev,
      ino,
      mode,
      nlink,
      uid,
      gid,
      rdev,
      size,
      blksize,
      blocks,
      atimeMs,
      mtimeMs,
      ctimeMs,
      birthtimeMs,
      atime,
      mtime,
      ctime,
      birthtime,
      type
    } = props
    this.dev = dev
    this.ino = ino
    this.mode = mode
    this.nlink = nlink
    this.uid = uid
    this.gid = gid
    this.rdev = rdev
    this.size = size
    this.type = type
    this.blksize = blksize
    this.blocks = blocks
    this.atimeMs = atimeMs
    this.mtimeMs = mtimeMs
    this.ctimeMs = ctimeMs
    this.birthtimeMs = birthtimeMs
    this.atime = atime
    this.mtime = mtime
    this.ctime = ctime
    this.birthtime = birthtime
  }
  /**
   * @return [Boolean] True if this item is a file.
   */
  public isFile(): boolean {
    return this.type === FileType.FILE
  }

  /**
   * @return [Boolean] True if this item is a directory.
   */
  public isDirectory(): boolean {
    return this.type === FileType.DIRECTORY
  }

  /**
   * @return [Boolean] True if this item is a symbolic link (only valid through lstat)
   */
  public isSymbolicLink(): boolean {
    return this.type === FileType.SYMLINK
  }

  /**
   * Change the mode of the file. We use this helper function to prevent messing
   * up the type of the file, which is encoded in mode.
   */
  public chmod(mode: number): void {
    this.mode = (this.mode & 0xf000) | mode
  }
  public isSocket(): boolean {
    return false
  }

  public isBlockDevice(): boolean {
    return false
  }

  public isCharacterDevice(): boolean {
    return false
  }

  public isFIFO(): boolean {
    return false
  }
}

export enum ErrorCode {
  EPERM = 1,
  ENOENT = 2,
  EIO = 5,
  EBADF = 9,
  EACCES = 13,
  EBUSY = 16,
  EEXIST = 17,
  ENOTDIR = 20,
  EISDIR = 21,
  EINVAL = 22,
  EFBIG = 27,
  ENOSPC = 28,
  EROFS = 30,
  ENOTEMPTY = 39,
  ENOTSUP = 95
}
export const ErrorStrings: {
  [code: string]: string
  [code: number]: string
} = {}
ErrorStrings[ErrorCode.EPERM] = 'Operation not permitted.'
ErrorStrings[ErrorCode.ENOENT] = 'No such file or directory.'
ErrorStrings[ErrorCode.EIO] = 'Input/output error.'
ErrorStrings[ErrorCode.EBADF] = 'Bad file descriptor.'
ErrorStrings[ErrorCode.EACCES] = 'Permission denied.'
ErrorStrings[ErrorCode.EBUSY] = 'Resource busy or locked.'
ErrorStrings[ErrorCode.EEXIST] = 'File exists.'
ErrorStrings[ErrorCode.ENOTDIR] = 'File is not a directory.'
ErrorStrings[ErrorCode.EISDIR] = 'File is a directory.'
ErrorStrings[ErrorCode.EINVAL] = 'Invalid argument.'
ErrorStrings[ErrorCode.EFBIG] = 'File is too big.'
ErrorStrings[ErrorCode.ENOSPC] = 'No space left on disk.'
ErrorStrings[ErrorCode.EROFS] = 'Cannot modify a read-only file system.'
ErrorStrings[ErrorCode.ENOTEMPTY] = 'Directory is not empty.'
ErrorStrings[ErrorCode.ENOTSUP] = 'Operation is not supported.'
/* tslint:enable:variable-name */

/**
 * Represents a BrowserFS error. Passed back to applications after a failed
 * call to the BrowserFS API.
 */
export class ApiError extends Error implements NodeJS.ErrnoException {
  public static fromJSON(json: any): ApiError {
    const err = new ApiError(0)
    err.errno = json.errno
    err.code = json.code
    err.path = json.path
    err.stack = json.stack
    err.message = json.message
    return err
  }

  /**
   * Creates an ApiError object from a buffer.
   */
  public static fromBuffer(buffer: Buffer, i = 0): ApiError {
    return ApiError.fromJSON(JSON.parse(buffer.toString('utf8', i + 4, i + 4 + buffer.readUInt32LE(i))))
  }

  public static FileError(code: ErrorCode, p: string): ApiError {
    return new ApiError(code, ErrorStrings[code], p)
  }
  public static ENOENT(path: string): ApiError {
    return this.FileError(ErrorCode.ENOENT, path)
  }

  public static EEXIST(path: string): ApiError {
    return this.FileError(ErrorCode.EEXIST, path)
  }

  public static EISDIR(path: string): ApiError {
    return this.FileError(ErrorCode.EISDIR, path)
  }

  public static ENOTDIR(path: string): ApiError {
    return this.FileError(ErrorCode.ENOTDIR, path)
  }

  public static EPERM(path: string): ApiError {
    return this.FileError(ErrorCode.EPERM, path)
  }

  public static ENOTEMPTY(path: string): ApiError {
    return this.FileError(ErrorCode.ENOTEMPTY, path)
  }

  public errno: ErrorCode
  public code: string
  public path: string | undefined
  // Unsupported.
  public syscall = ''
  public stack: string | undefined

  /**
   * Represents a BrowserFS error. Passed back to applications after a failed
   * call to the BrowserFS API.
   *
   * Error codes mirror those returned by regular Unix file operations, which is
   * what Node returns.
   * @constructor ApiError
   * @param type The type of the error.
   * @param [message] A descriptive error message.
   */
  constructor(type: ErrorCode, message: string = ErrorStrings[type], path?: string) {
    super(message)
    this.errno = type
    this.code = ErrorCode[type]
    this.path = path
    this.stack = new Error().stack
    this.message = `Error: ${this.code}: ${message}${this.path ? `, '${this.path}'` : ''}`
  }

  /**
   * @return A friendly error message.
   */
  public toString(): string {
    return this.message
  }

  public toJSON(): any {
    return {
      errno: this.errno,
      code: this.code,
      path: this.path,
      stack: this.stack,
      message: this.message
    }
  }

  /**
   * Writes the API error into a buffer.
   */
  public writeToBuffer(buffer: Buffer = Buffer.alloc(this.bufferSize()), i = 0): Buffer {
    const bytesWritten = buffer.write(JSON.stringify(this.toJSON()), i + 4)
    buffer.writeUInt32LE(bytesWritten, i)
    return buffer
  }

  /**
   * The size of the API error in buffer-form in bytes.
   */
  public bufferSize(): number {
    // 4 bytes for string length.
    return 4 + Buffer.byteLength(JSON.stringify(this.toJSON()))
  }
}
export type BFSOneArgCallback = (e?: ApiError | null) => any
export type BFSCallback<T> = (e: ApiError | null | undefined, rv?: T) => any
export type BFSThreeArgCallback<T, U> = (e: ApiError | null | undefined, arg1?: T, arg2?: U) => any

export interface IFileSystemMountMap {
  [key: string]: string | IFileSystem
}
export interface IFileSystem {
  mountMap: IFileSystemMountMap
  adapter: IFileSystemAdapter<IAdapterNodeRecord>

  /**
   * Test whether or not the given path exists by checking with the file system.
   * @param path
   * @return [boolean]
   */
  existsSync(path: string): boolean
  /**
   * Synchronous `realpath`.
   * @param path
   * @param cache An object literal of mapped paths that can be used to
   *   force a specific path resolution or avoid additional `fs.stat` calls for
   *   known real paths.
   * @return [String]
   */
  realpathSync(path: string, cache: { [path: string]: string }): string

  // FILE OR DIRECTORY METHODS
  /**
   * Asynchronous rename. No arguments other than a possible exception are given
   * to the completion callback.
   * @param oldPath
   * @param newPath
   * @param callback
   */
  rename(oldPath: string, newPath: string, cb: BFSOneArgCallback): void
  renameSync(oldPath: string, newPath: string): void

  /**
   * Asynchronous `stat`.
   * @param path
   * @param callback
   */
  stat(path: string, cb: BFSCallback<Stats>): void
  statSync(path: string): Stats

  /**
   * Asynchronous `lstat`.
   * `lstat()` is identical to `stat()`, except that if path is a symbolic link,
   * then the link itself is stat-ed, not the file that it refers to.
   * @param path
   * @param callback
   */
  lstat(path: string, cb: BFSCallback<Stats>): void
  lstatSync(path: string): Stats

  // FILE-ONLY METHODS

  /**
   * Asynchronous `unlink`.
   * @param path
   * @param callback
   */
  unlink(path: string, cb: BFSOneArgCallback): void
  unlinkSync(path: string): void

  /**
   * Asynchronously reads the entire contents of a file.
   * @example Usage example
   *   fs.readFile('/etc/passwd', function (err, data) {
   *     if (err) throw err;
   *     console.log(data);
   *   });
   * @param filename
   * @param options
   * @option options [String] encoding The string encoding for the file contents. Defaults to `null`.
   * @option options [String] flag Defaults to `'r'`.
   * @param callback If no encoding is specified, then the raw buffer is returned.
   */
  readFile(filename: string, arg2: { encoding: string; flag?: string }, callback?: BFSCallback<string>): Promise<void>

  readFileSync(filename: string, arg2: string): string
  readFileSync(filename: string, arg2: string | { encoding: string; flag?: string }): any

  /**
   * Asynchronously writes data to a file, replacing the file if it already
   * exists.
   *
   * The encoding option is ignored if data is a buffer.
   *
   * @example Usage example
   *   fs.writeFile('message.txt', 'Hello Node', function (err) {
   *     if (err) throw err;
   *     console.log('It\'s saved!');
   *   });
   * @param filename
   * @param data
   * @param options
   * @option options [String] encoding Defaults to `'utf8'`.
   * @option options [Number] mode Defaults to `0644`.
   * @option options [String] flag Defaults to `'w'`.
   * @param callback
   */
  writeFile(
    filename: string,
    data: any,
    arg3?: { encoding?: string; mode?: string | number; flag?: string },
    cb?: BFSOneArgCallback
  ): Promise<void>
  writeFileSync(filename: string, data: any, arg3?: { encoding?: string; mode?: string | number; flag?: string }): void

  // DIRECTORY-ONLY METHODS

  /**
   * Asynchronous `rmdir`.
   * @param path
   * @param callback
   */
  rmdir(path: string, cb: BFSOneArgCallback): void
  rmdirSync(path: string): void

  /**
   * Asynchronous `mkdir`.
   * @param path
   * @param mode defaults to `0777`
   * @param callback
   */
  mkdir(path: string, mode?: any, cb?: BFSOneArgCallback): void
  mkdirSync(path: string, mode?: any): void

  /**
   * Asynchronous `readdir`. Reads the contents of a directory.
   * The callback gets two arguments `(err, files)` where `files` is an array of
   * the names of the files in the directory excluding `'.'` and `'..'`.
   * @param path
   * @param callback
   */
  readdir(path: string, cb: BFSCallback<string[]>): void
  readdirSync(path: string): string[]

  // SYMLINK METHODS

  /**
   * Asynchronous `link`.
   * @param srcpath
   * @param dstpath
   * @param callback
   */
  link(srcpath: string, dstpath: string, cb: BFSOneArgCallback): void

  /**
   * Asynchronous `symlink`.
   * @param srcpath
   * @param dstpath
   * @param type can be either `'dir'` or `'file'` (default is `'file'`)
   * @param callback
   */
  symlink(srcpath: string, dstpath: string, type?: string, cb?: BFSOneArgCallback): Promise<void>

  /**
   * Asynchronous readlink.
   * @param path
   * @param callback
   */
  readlink(path: string, cb: BFSCallback<string>): void

  // PROPERTY OPERATIONS

  /**
   * Asynchronous `chown`.
   * @param path
   * @param uid
   * @param gid
   * @param callback
   */
  chown(path: string, uid: number, gid: number, cb: BFSOneArgCallback): void

  /**
   * Asynchronous `chmod`.
   * @param path
   * @param mode
   * @param callback
   */
  chmod(path: string, mode: number | string, cb: BFSOneArgCallback): void
}
