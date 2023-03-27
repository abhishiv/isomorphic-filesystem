import {
  IFileSystemAdapter,
  IAdapterQuery,
  FileType,
  IAdapterNodeRecord,
  IAdapterBlobRecord,
  IFileSystemAdapterSnapshot,
} from '../specs/fs'
import { openDB, DBSchema, IDBPDatabase } from 'idb'
export type IndexedDBBlobRecord = IAdapterBlobRecord

interface FSSchema extends DBSchema {
  blobs: {
    key: 'id'
    value: IAdapterBlobRecord
    indexes: { 'by-id': string }
  }
  nodes: {
    key: 'id'
    value: IAdapterNodeRecord
    indexes: { 'by-id': string; 'by-name': string; 'by-parentPath': string }
  }
}

export const createIndexedDBAdapter = async (name: string, config: Record<any, any>) => {
  const db = await openDB<FSSchema>(name, 3, {
    upgrade(db) {
      const blobsStore = db.createObjectStore('blobs', {
        keyPath: 'id',
        autoIncrement: false,
      })
      const nodesStore = db.createObjectStore('nodes', {
        keyPath: 'id',
        autoIncrement: false,
      })
      blobsStore.createIndex('by-id', 'id')
      nodesStore.createIndex('by-id', 'id')
      nodesStore.createIndex('by-name', 'name')
      nodesStore.createIndex('by-parentPath', 'parentPath')
    },
  })

  return new IndexedDBAdapter(name, db, config)
}

export class IndexedDBAdapter implements IFileSystemAdapter<IAdapterNodeRecord> {
  records: IAdapterNodeRecord[]
  name: string
  db: IDBPDatabase<FSSchema>
  type: 'async' = 'async'
  config: any
  constructor(name: string, db: IDBPDatabase<FSSchema>, config: any) {
    this.name = name
    this.db = db
    this.records = []
    this.config = config
  }

  private getCheckusumRecord = async (checksum: string) => {
    const checksumRecord = await this.db.getFromIndex('blobs', 'by-id', checksum)
    //console.log("checksum", checksum, checksumRecords);
    return checksumRecord ? [checksumRecord] : []
  }

  private ensureChecksumRecord = async (payload: IAdapterNodeRecord) => {
    //console.log("payload", payload);
    if (payload.type === FileType.FILE && payload.checksum) {
      const checksumRecords = await this.getCheckusumRecord(payload.checksum)
      if (checksumRecords.length === 0) {
        await this.db.put('blobs', {
          id: payload.checksum,
          data: payload.data,
        })
      }
      delete payload.data
    }
    return payload
  }

  create = async (payload: IAdapterNodeRecord): Promise<void> => {
    const records = await this.query({ id: payload.id })
    //    if (records.length !== 0) throw new Error('EXIST')
    const finalValue = await this.ensureChecksumRecord(payload)

    await this.db.put('nodes', finalValue)
  }

  update = async (query: IAdapterQuery, payload: IAdapterNodeRecord): Promise<void> => {
    //console.log("update", query, payload);
    const records = await this.query(query)
    if (records) {
      //console.log("found record");
      const finalValue = await this.ensureChecksumRecord(payload)
      await this.db.put('nodes', finalValue)
    }
  }

  query = async (query: IAdapterQuery): Promise<any[]> => {
    const key = Object.keys(query)[0]

    const list: IAdapterNodeRecord[] = await (async () => {
      if (query[key]['$regex']) {
        const prefix = query[key]['$regex']
        const records = await this.db.getAllFromIndex(
          'nodes',
          ('by-' + key) as 'by-id',
          IDBKeyRange.bound(prefix, prefix + 'uffff', false, false),
        )
        return records
      } else {
        const records = await this.db.getAllFromIndex('nodes', ('by-' + key) as 'by-id', query[key])
        return records
      }
    })()

    const checksumRecords = await Promise.all(
      list.map(async (el) => {
        if (el.checksum) {
          const checksumRecords = await this.getCheckusumRecord(el.checksum)

          return checksumRecords[0]
        }
      }),
    )

    const l = list.map((el, i) => {
      const record = checksumRecords[i]
      return {
        ...el,
        data: record && record.data ? record.data : null,
      }
    })

    return l
  }

  delete = async (query: IAdapterQuery): Promise<void> => {
    const set = (await this.query(query)).map((el) => el.id)
    //await Promise.all(set.map((el) => this.db.delete('nodes', el.id)))
  }

  export = async (path: string): Promise<IFileSystemAdapterSnapshot> => {
    const nodes = await this.query({ id: { $regex: path } })
    const checksumIds = Object.keys(
      nodes.reduce(function (state, node) {
        return {
          ...state,
          ...(node.type === FileType.FILE
            ? {
                [node.checksum as string]: true,
              }
            : {}),
        }
      }, {}),
    )
    // todo: performance // IDBKeyRange.only(checksumIds)
    const blobs = await this.db.getAll('blobs')
    if (!blobs) throw new Error('blobs')
    return {
      blobs,
      nodes,
    }
  }
  import = async (path: string, snapshot: IFileSystemAdapterSnapshot): Promise<void> => {
    return
  }
}
