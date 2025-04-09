import { Client } from 'ssh2'
import { EventEmitter } from 'events'
import { handleError } from '../utils/errorHandler'

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
    // 使用CONNECTION_TIMEOUT清理不活跃的连接
    this.cleanupConnectionsByTime(this.CONNECTION_TIMEOUT);
  }

  public async connect(serverId: number, config: {
    host: string
    port: number
    username: string
    password?: string
    privateKey?: string
  }): Promise<void> {
    console.log(`[SSH] 尝试连接服务器ID=${serverId}, 主机=${config.host}:${config.port}, 用户=${config.username}, 当前连接数: ${this.connections.size}/${this.MAX_CONNECTIONS}`);
    
    // 检查是否达到最大连接数，如果是，则先尝试清理空闲连接
    if (this.connections.size >= this.MAX_CONNECTIONS) {
      console.log(`[SSH] 达到最大连接数限制(${this.MAX_CONNECTIONS})，开始尝试清理空闲连接`);
      
      // 尝试清理30分钟未使用的连接
      const cleanupTime = 30 * 60 * 1000; // 30分钟
      let cleanedUp = this.cleanupConnectionsByTime(cleanupTime);
      
      // 如果没有找到可清理的连接，再尝试清理10分钟未使用的连接
      if (!cleanedUp && this.connections.size >= this.MAX_CONNECTIONS) {
        cleanedUp = this.cleanupConnectionsByTime(10 * 60 * 1000); // 10分钟
      }
      
      // 如果仍然没有找到可清理的连接，再尝试清理5分钟未使用的连接
      if (!cleanedUp && this.connections.size >= this.MAX_CONNECTIONS) {
        cleanedUp = this.cleanupConnectionsByTime(5 * 60 * 1000); // 5分钟
      }
      
      // 如果基于时间的清理都失败，则强制清理最旧的2个连接
      if (!cleanedUp && this.connections.size >= this.MAX_CONNECTIONS) {
        console.log(`[SSH] 基于时间的清理失败，将强制清理最旧的连接`);
        cleanedUp = this.cleanupOldestConnections(2);
      }
      
      // 如果清理后仍达到最大连接数，则抛出错误
      if (this.connections.size >= this.MAX_CONNECTIONS) {
        console.error(`[SSH] 清理连接后仍达到最大连接数限制(${this.MAX_CONNECTIONS})，无法建立新连接`);
        throw new Error('达到最大连接数限制，请稍后再试或关闭一些现有连接')
      }
      
      console.log(`[SSH] 清理连接后，当前连接数: ${this.connections.size}/${this.MAX_CONNECTIONS}，继续连接`);
    }

    // 检查是否已经有相同 serverId 的连接
    // 注释掉阻止多连接的代码，允许同一服务器多次连接
    // if (this.connections.has(serverId)) {
    //   throw new Error('服务器已连接')
    // }

    const client = new Client()
    
    try {
      await new Promise<void>((resolve, reject) => {
        client.on('ready', () => {
          console.log(`[SSH] 服务器ID=${serverId}的SSH连接已就绪，正在请求Shell`);
          
          client.shell((err: Error | undefined, stream: any) => {
            if (err) {
              console.error(`[SSH] 获取服务器ID=${serverId}的Shell失败:`, err);
              reject(err)
              return
            }

            console.log(`[SSH] 服务器ID=${serverId}的Shell已建立，注册事件处理程序`);
            
            this.connections.set(serverId, {
              client,
              shell: stream,
              lastUsed: Date.now(),
              isActive: true
            })

            stream.on('data', (data: Buffer) => {
              // 不记录数据内容，可能包含敏感信息
              this.emit('data', serverId, data.toString())
            })

            // Only add stderr handler if it exists
            if (stream.stderr) {
              stream.stderr.on('data', (data: Buffer) => {
                console.log(`[SSH] 服务器ID=${serverId}的stderr有输出`);
                this.emit('error', serverId, data.toString())
              })
            }

            stream.on('close', () => {
              console.log(`[SSH] 服务器ID=${serverId}的Shell已关闭`);
              this.closeConnection(serverId)
              this.emit('close', serverId)
            })

            stream.on('exit', (code: number) => {
              console.log(`[SSH] 服务器ID=${serverId}的Shell进程退出，代码=${code}`);
              this.emit('exit', serverId, code)
            })

            console.log(`[SSH] 服务器ID=${serverId}的连接已完全建立，当前连接数: ${this.connections.size}/${this.MAX_CONNECTIONS}`);
            resolve()
          })
        })

        client.on('error', (err: Error) => {
          console.error(`[SSH] 服务器ID=${serverId}连接错误:`, err);
          handleError(err, 'SSH连接错误')
          this.closeConnection(serverId)
          reject(err)
        })

        // Prepare connection config
        const connectionConfig: any = {
          host: config.host,
          port: config.port,
          username: config.username,
          readyTimeout: 10000
        }

        // Set authentication method
        if (config.privateKey) {
          console.log(`[SSH] 服务器ID=${serverId}使用私钥认证`);
          connectionConfig.privateKey = config.privateKey
        } else if (config.password) {
          console.log(`[SSH] 服务器ID=${serverId}使用密码认证`);
          connectionConfig.password = config.password
        } else {
          console.error(`[SSH] 服务器ID=${serverId}未提供认证方式`);
          reject(new Error('需要提供密码或私钥以进行身份验证'))
          return
        }

        console.log(`[SSH] 开始连接服务器ID=${serverId}`);
        client.connect(connectionConfig)
      })
    } catch (error) {
      console.error(`[SSH] 连接服务器ID=${serverId}失败:`, error);
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
      throw error
    }
  }

  public isConnected(serverId: number): boolean {
    const connection = this.connections.get(serverId)
    return !!connection && connection.isActive
  }

  public closeConnection(serverId: number): void {
    const connection = this.connections.get(serverId)
    if (connection) {
      console.log(`[SSH] 正在关闭服务器ID=${serverId}的连接`);
      
      if (connection.shell) {
        try {
          connection.shell.end()
          console.log(`[SSH] 服务器ID=${serverId}的Shell已关闭`);
        } catch (error) {
          console.error(`[SSH] 关闭服务器ID=${serverId}的Shell时出错:`, error);
          // Ignore error on closing
        }
      }
      
      if (connection.client) {
        try {
          connection.client.end()
          console.log(`[SSH] 服务器ID=${serverId}的客户端连接已关闭`);
        } catch (error) {
          console.error(`[SSH] 关闭服务器ID=${serverId}的客户端连接时出错:`, error);
          // Ignore error on closing
        }
      }
      
      this.connections.delete(serverId)
      console.log(`[SSH] 服务器ID=${serverId}的连接已从连接池中移除，当前连接数: ${this.connections.size}/${this.MAX_CONNECTIONS}`);
      this.emit('disconnect', serverId)
    } else {
      console.log(`[SSH] 尝试关闭不存在的连接，服务器ID=${serverId}`);
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

  // 根据最后使用时间清理连接，返回是否有连接被清理
  private cleanupConnectionsByTime(timeThreshold: number): boolean {
    const now = Date.now();
    let cleaned = false;
    let cleanedCount = 0;
    
    this.connections.forEach((conn, serverId) => {
      if (now - conn.lastUsed > timeThreshold) {
        console.log(`[SSH] 清理超过 ${timeThreshold/1000} 秒未使用的连接: 服务器ID=${serverId}`);
        this.closeConnection(serverId);
        cleaned = true;
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`[SSH] 基于时间阈值 ${timeThreshold/1000}秒 共清理了 ${cleanedCount} 个连接，当前连接数: ${this.connections.size}/${this.MAX_CONNECTIONS}`);
    }
    
    return cleaned;
  }

  // 清理最旧的N个连接
  private cleanupOldestConnections(count: number): boolean {
    if (this.connections.size === 0 || count <= 0) {
      return false;
    }

    // 将连接转换为数组并按最后使用时间排序
    const connectionEntries = Array.from(this.connections.entries());
    connectionEntries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    
    // 清理最早的n个连接
    const toClean = Math.min(count, connectionEntries.length);
    for (let i = 0; i < toClean; i++) {
      const serverId = connectionEntries[i][0];
      const lastUsedTime = new Date(connectionEntries[i][1].lastUsed).toISOString();
      console.log(`[SSH] 强制清理最旧连接: 服务器ID=${serverId}, 最后使用时间=${lastUsedTime}`);
      this.closeConnection(serverId);
    }
    
    console.log(`[SSH] 强制清理了 ${toClean} 个最旧连接，当前连接数: ${this.connections.size}/${this.MAX_CONNECTIONS}`);
    
    return toClean > 0;
  }
} 