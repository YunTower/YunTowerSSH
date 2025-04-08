import { Client } from 'ssh2'
import { EventEmitter } from 'events'
import { handleError } from '@/utils/errorHandler'

interface SSHConnection {
  client: Client
  shell: any
  lastUsed: number
  isActive: boolean
}

export class SSHService extends EventEmitter {
  private connections: Map<number, SSHConnection> = new Map()
  private readonly MAX_CONNECTIONS = 10
  private readonly CONNECTION_TIMEOUT = 300000 // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.startCleanup()
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections()
    }, 60000) // 每分钟清理一次
  }

  private cleanupInactiveConnections() {
    const now = Date.now()
    this.connections.forEach((conn, serverId) => {
      if (now - conn.lastUsed > this.CONNECTION_TIMEOUT) {
        this.closeConnection(serverId)
      }
    })
  }

  public async connect(serverId: number, config: {
    host: string
    port: number
    username: string
    password: string
  }): Promise<void> {
    if (this.connections.size >= this.MAX_CONNECTIONS) {
      throw new Error('达到最大连接数限制')
    }

    if (this.connections.has(serverId)) {
      throw new Error('服务器已连接')
    }

    const client = new Client()
    
    try {
      await new Promise<void>((resolve, reject) => {
        client.on('ready', () => {
          client.shell((err: Error, stream: any) => {
            if (err) {
              reject(err)
              return
            }

            this.connections.set(serverId, {
              client,
              shell: stream,
              lastUsed: Date.now(),
              isActive: true
            })

            stream.on('data', (data: Buffer) => {
              this.emit('data', serverId, data.toString())
            })

            stream.on('close', () => {
              this.closeConnection(serverId)
            })

            resolve()
          })
        })

        client.on('error', (err: Error) => {
          handleError(err, 'SSH连接错误')
          this.closeConnection(serverId)
        })

        client.connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          readyTimeout: 10000
        })
      })
    } catch (error) {
      client.end()
      throw error
    }
  }

  public async executeCommand(serverId: number, command: string): Promise<void> {
    const connection = this.connections.get(serverId)
    if (!connection || !connection.isActive) {
      throw new Error('服务器未连接')
    }

    try {
      connection.shell.write(command + '\n')
      connection.lastUsed = Date.now()
    } catch (error) {
      handleError(error, '执行命令失败')
      this.closeConnection(serverId)
    }
  }

  public closeConnection(serverId: number): void {
    const connection = this.connections.get(serverId)
    if (connection) {
      if (connection.shell) {
        connection.shell.end()
      }
      if (connection.client) {
        connection.client.end()
      }
      this.connections.delete(serverId)
      this.emit('disconnect', serverId)
    }
  }

  public close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.connections.forEach((_, serverId) => {
      this.closeConnection(serverId)
    })
  }
} 