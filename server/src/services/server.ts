import { Client } from 'ssh2'
import { handleError } from '../utils/errorHandler'
import { DatabaseService } from './database'
import { SSHService } from './ssh'
import { WebSocket } from 'ws'

interface SSHConnection {
  client: Client
  userId: number
  serverId: number
  lastActive: Date
  isConnected: boolean
  ws?: WebSocket // WebSocket connection
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
  private sshService: SSHService

  constructor(db: DatabaseService) {
    this.db = db
    this.sshService = new SSHService()
    this.setupSSHEvents()
    this.startConnectionCleanup()
  }

  private setupSSHEvents() {
    // Handle SSH data events
    this.sshService.on('data', (serverId: number, data: string) => {
      this.broadcastToConnections(serverId, data)
    })

    // Handle SSH error events
    this.sshService.on('error', (serverId: number, error: string) => {
      this.broadcastToConnections(serverId, `Error: ${error}`)
    })

    // Handle SSH close events
    this.sshService.on('close', (serverId: number) => {
      this.broadcastToConnections(serverId, '\r\n[Connection closed]')
    })

    // Handle SSH exit events
    this.sshService.on('exit', (serverId: number, code: number) => {
      this.broadcastToConnections(serverId, `\r\n[Process exited with code ${code}]`)
    })

    // Handle SSH disconnect events
    this.sshService.on('disconnect', (serverId: number) => {
      this.broadcastToConnections(serverId, '\r\n[Disconnected from server]')
    })
  }

  private broadcastToConnections(serverId: number, message: string) {
    // Find all connections for this server and send the message
    for (const [_, connection] of this.connections.entries()) {
      if (connection.serverId === serverId && connection.ws && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(message)
      }
    }
  }

  public async connect(userId: number, serverId: number, config: SSHConfig): Promise<void> {
    try {
      const connectionKey = `${userId}-${serverId}`
      const uniqueConnectionKey = `${connectionKey}-${Date.now()}`

      if (this.connections.size >= this.MAX_CONNECTIONS) {
        throw new Error('达到最大连接数限制')
      }

      // Connect using the SSHService
      await this.sshService.connect(serverId, {
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey
      })

      // Store the connection
      this.connections.set(uniqueConnectionKey, {
        client: new Client(), // This is just a placeholder, the actual client is managed by SSHService
        userId,
        serverId,
        lastActive: new Date(),
        isConnected: true
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

      // Execute the command using the SSHService
      await this.sshService.executeCommand(serverId, command)
      connection.lastActive = new Date()
      
      // Return an empty string because the actual output will be sent via WebSocket
      return ''
    } catch (error) {
      handleError(error, '命令执行失败')
      throw error
    }
  }

  public async disconnect(userId: number, serverId: number): Promise<void> {
    try {
      // Check if there are any other connections for this server
      const allConnections = this.getAllConnectionsForServer(serverId);
      const userConnections = this.getConnections(userId, serverId);
      
      // Only close the SSH connection if this is the last user connected
      if (allConnections.length <= userConnections.length) {
        // This is the last user connected, close the SSH connection
        this.sshService.closeConnection(serverId);
      }
      
      // Remove this user's connections from our map
      const prefix = `${userId}-${serverId}`;
      for (const key of this.connections.keys()) {
        if (key.startsWith(prefix)) {
          this.connections.delete(key);
        }
      }
    } catch (error) {
      handleError(error, '断开连接失败');
      throw error;
    }
  }

  // Get all connections for a specific server, regardless of user
  private getAllConnectionsForServer(serverId: number): SSHConnection[] {
    const connections: SSHConnection[] = [];
    
    for (const [_, connection] of this.connections.entries()) {
      if (connection.serverId === serverId) {
        connections.push(connection);
      }
    }
    
    return connections;
  }

  // Register a WebSocket connection for a specific user and server
  public registerWebSocket(userId: number, serverId: number, ws: WebSocket | undefined): void {
    const connections = this.getConnections(userId, serverId);
    
    if (!ws) {
      // WebSocket is closed, just update the connections to remove the WebSocket reference
      for (const connection of connections) {
        connection.ws = undefined;
        connection.lastActive = new Date();
      }
      return;
    }
    
    if (connections.length === 0) {
      // No existing connection, create a new one just for WebSocket
      const connectionKey = `${userId}-${serverId}-ws-${Date.now()}`;
      this.connections.set(connectionKey, {
        client: new Client(), // Placeholder
        userId,
        serverId,
        lastActive: new Date(),
        isConnected: this.sshService.isConnected(serverId),
        ws
      });
    } else {
      // Update existing connections with this WebSocket
      for (const connection of connections) {
        connection.ws = ws;
        connection.lastActive = new Date();
      }
    }
    
    // Send initial connection status
    if (this.sshService.isConnected(serverId)) {
      ws.send('\r\n[Connected to server]');
    } else {
      ws.send('\r\n[Not connected to server]');
    }
  }

  private getConnections(userId: number, serverId: number): SSHConnection[] {
    const connections: SSHConnection[] = []
    const prefix = `${userId}-${serverId}`
    
    for (const [key, connection] of this.connections.entries()) {
      if (key.startsWith(prefix)) {
        connections.push(connection)
      }
    }
    
    return connections
  }

  private getConnectionByKey(connectionKey: string): SSHConnection | undefined {
    return this.connections.get(connectionKey)
  }

  private getConnection(userId: number, serverId: number): SSHConnection | undefined {
    const connections = this.getConnections(userId, serverId)
    return connections.length > 0 ? connections[0] : undefined
  }

  private startConnectionCleanup(): void {
    setInterval(() => {
      const now = new Date()
      for (const [key, connection] of this.connections.entries()) {
        const inactiveTime = now.getTime() - connection.lastActive.getTime()
        if (inactiveTime > this.CONNECTION_TIMEOUT) {
          if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.close()
          }
          this.connections.delete(key)
        }
      }
    }, 60000) // Check every minute
  }

  public async getServerStatus(userId: number, serverId: number): Promise<boolean> {
    return this.sshService.isConnected(serverId)
  }

  public async listConnections(userId: number): Promise<Array<{ serverId: number; connectionKey: string; isConnected: boolean; serverName?: string; host?: string; username?: string }>> {
    const connections: Array<{ serverId: number; connectionKey: string; isConnected: boolean }> = []
    for (const [key, connection] of this.connections.entries()) {
      if (connection.userId === userId) {
        connections.push({
          serverId: connection.serverId,
          connectionKey: key,
          isConnected: this.sshService.isConnected(connection.serverId)
        })
      }
    }
    return connections
  }
} 