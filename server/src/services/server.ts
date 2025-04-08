import { Client } from 'ssh2'
import { handleError } from '../utils/errorHandler'
import { DatabaseService } from './database'

interface SSHConnection {
  client: Client
  userId: number
  serverId: number
  lastActive: Date
  isConnected: boolean
}

interface SSHConfig {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
}

export class ServerService {
  private connections: Map<string, SSHConnection> = new Map()
  private readonly MAX_CONNECTIONS = 10
  private readonly CONNECTION_TIMEOUT = 30000 // 30 seconds
  private db: DatabaseService

  constructor(db: DatabaseService) {
    this.db = db
    this.startConnectionCleanup()
  }

  public async connect(userId: number, serverId: number, config: SSHConfig): Promise<void> {
    try {
      const connectionKey = `${userId}-${serverId}`
      
      if (this.connections.has(connectionKey)) {
        throw new Error('已存在连接')
      }

      if (this.connections.size >= this.MAX_CONNECTIONS) {
        throw new Error('达到最大连接数限制')
      }

      const client = new Client()
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.end()
          reject(new Error('连接超时'))
        }, this.CONNECTION_TIMEOUT)

        client.on('ready', () => {
          clearTimeout(timeout)
          this.connections.set(connectionKey, {
            client,
            userId,
            serverId,
            lastActive: new Date(),
            isConnected: true
          })
          resolve()
        })

        client.on('error', (error: Error) => {
          clearTimeout(timeout)
          reject(error)
        })

        client.connect(config)
      })

      await this.db.execute(
        'UPDATE servers SET last_connected = ?, connection_count = connection_count + 1 WHERE id = ?',
        [new Date().toISOString(), serverId]
      )
    } catch (error) {
      handleError(error, 'SSH连接失败')
      throw error
    }
  }

  public async executeCommand(userId: number, serverId: number, command: string): Promise<string> {
    try {
      const connection = this.getConnection(userId, serverId)
      if (!connection) {
        throw new Error('未找到连接')
      }

      return new Promise<string>((resolve, reject) => {
        connection.client.exec(command, (error: Error | undefined, stream: any) => {
          if (error) {
            reject(error)
            return
          }

          let output = ''
          stream.on('data', (data: Buffer) => {
            output += data.toString()
          })

          stream.on('close', () => {
            connection.lastActive = new Date()
            resolve(output)
          })

          stream.on('error', (error: Error) => {
            reject(error)
          })
        })
      })
    } catch (error) {
      handleError(error, '命令执行失败')
      throw error
    }
  }

  public async disconnect(userId: number, serverId: number): Promise<void> {
    try {
      const connectionKey = `${userId}-${serverId}`
      const connection = this.connections.get(connectionKey)

      if (connection) {
        connection.client.end()
        this.connections.delete(connectionKey)
      }
    } catch (error) {
      handleError(error, '断开连接失败')
      throw error
    }
  }

  private getConnection(userId: number, serverId: number): SSHConnection | undefined {
    return this.connections.get(`${userId}-${serverId}`)
  }

  private startConnectionCleanup(): void {
    setInterval(() => {
      const now = new Date()
      for (const [key, connection] of this.connections.entries()) {
        const inactiveTime = now.getTime() - connection.lastActive.getTime()
        if (inactiveTime > this.CONNECTION_TIMEOUT) {
          connection.client.end()
          this.connections.delete(key)
        }
      }
    }, 60000) // Check every minute
  }

  public async getServerStatus(userId: number, serverId: number): Promise<boolean> {
    const connection = this.getConnection(userId, serverId)
    return connection?.isConnected || false
  }

  public async listConnections(userId: number): Promise<Array<{ serverId: number; isConnected: boolean }>> {
    const connections: Array<{ serverId: number; isConnected: boolean }> = []
    for (const connection of this.connections.values()) {
      if (connection.userId === userId) {
        connections.push({
          serverId: connection.serverId,
          isConnected: connection.isConnected
        })
      }
    }
    return connections
  }
} 