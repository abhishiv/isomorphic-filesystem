import sift from 'sift'
import {
  IFileSystemAdapter,
  IAdapterQuery,
  FileType,
  IAdapterNodeRecord,
  IAdapterBlobRecord,
  IFileSystemAdapterSnapshot,
} from '../specs/fs'
export type InMemoryAdapterRecord = IAdapterNodeRecord

export const createInMemoryAdapter = async (name: string, config: Record<any, any>) => {
  return new InMemoryAdapter()
}

export class InMemoryAdapter implements IFileSystemAdapter<InMemoryAdapterRecord> {
  nodes: Map<string, InMemoryAdapterRecord>
  blobs: Map<string, IAdapterBlobRecord>
  type: 'sync' = 'sync'
  constructor() {
    this.blobs = new Map()
    this.nodes = new Map()
  }
  private getCheckusumRecord = (checksum: string) => {
    const checksumRecords = Array.from(this.blobs.values()).filter(sift({ id: checksum }))
    // console.log("checksum", checksum, checksumRecords);
    return checksumRecords
  }
  private ensureChecksumRecord = (payload: IAdapterNodeRecord) => {
    // console.log("payload", payload);
    if (payload.type === FileType.FILE && payload.checksum) {
      const checksumRecords = this.getCheckusumRecord(payload.checksum)
      if (checksumRecords.length === 0) {
        this.blobs.set(payload.checksum, {
          id: payload.checksum,
          data: payload.data,
        })
      }
      delete payload.data
    }
    // console.log("ppp", payload);
    return payload
  }
  create = (payload: IAdapterNodeRecord): void => {
    // console.log("create", payload);
    const records = this.query({ id: payload.id })

    if (records.length === 0) {
      const finalValue = this.ensureChecksumRecord(payload)
      this.nodes.set(finalValue.id, finalValue)
    } else {
      throw new Error('EEXISTS')
    }
  }
  update = (query: IAdapterQuery, payload: IAdapterNodeRecord): void => {
    // console.log("update", query, payload);
    const records = this.query(query)
    if (records) {
      const record = records[0]
      // console.log("found record");
      const finalValue = this.ensureChecksumRecord(payload)
      this.nodes.set(finalValue.id, finalValue)
      const tt = this.query({ id: payload.id })
      // console.log("tt", tt);
    }
  }
  query = (query: IAdapterQuery): any[] => {
    // console.log("query", query);
    const list = Array.from(this.nodes.values()).filter(sift(query))
    const checksumRecords = list.map((el) => {
      if (el.checksum) {
        const checksumRecords = this.getCheckusumRecord(el.checksum)
        return checksumRecords[0]
      }
    })
    // console.log("l", list, checksumRecords);
    return list.map((el, i) => {
      const record = checksumRecords[i]
      return {
        ...el,
        data: record && record.data ? record.data : null,
      }
    })
  }
  delete = (query: IAdapterQuery): void => {
    // console.log('delete', query)
    const set = this.query(query).map((el) => el.id)
    set.forEach((id) => this.nodes.delete(id))
  }
  export = (path: string): IFileSystemAdapterSnapshot => {
    return {
      blobs: Array.from(this.blobs.values()),
      nodes: Array.from(this.nodes.values()),
    }
  }
  import = (path: string, snapshot: IFileSystemAdapterSnapshot): void => {
    snapshot.nodes.forEach((node) => {
      this.nodes.set(node.id, node)
    })
    snapshot.blobs.forEach((blob) => {
      this.blobs.set(blob.id, blob)
    })
  }
}
