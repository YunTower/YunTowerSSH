import { Client } from 'ssh2'
import { decrypt } from '../utils/crypto'

class SSHPool {
  private pool: Map<string, Client> = new Map()
  private maxConnections = 5
  
  async getConnection(serverId: string): Promise<Client> {
    if (this.pool.has(serverId)) {
      return this.pool.get(serverId)!
    }
    
    if (this.pool.size >= this.maxConnections) {
      throw new Error('Maximum connections reached')
    }
    
    const server = await ServerModel.findById(serverId)
    const conn = new Client()
    
    return new Promise((resolve, reject) => {
      conn.on('ready', () => {
        this.pool.set(serverId, conn)
        resolve(conn)
      }).on('error', (err) => {
        reject(err)
      }).connect({
        host: server.host,
        port: server.port,
        username: server.username,
        password: decrypt(server.password)
      })
    })
  }
  
  releaseConnection(serverId: string) {
    const conn = this.pool.get(serverId)
    if (conn) {
      conn.end()
      this.pool.delete(serverId)
    }
  }
}

export { SSHPool } 