import WebSocket from 'ws'
import { EventEmitter } from 'events'
import { handleError } from '../utils/errorHandler'

interface WebSocketClient {
  ws: WebSocket
  userId: number
  lastPing: number
  isAlive: boolean
}

export class WebSocketService extends EventEmitter {
  private wss: WebSocket.Server
  private clients: Map<WebSocket, WebSocketClient> = new Map()
  private readonly PING_INTERVAL = 30000 // 30 seconds
  private readonly PONG_TIMEOUT = 10000 // 10 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(server: any) {
    super()
    this.wss = new WebSocket.Server({ server })
    this.initialize()
  }

  private initialize(): void {
    this.wss.on('connection', this.handleConnection.bind(this))
    this.startHeartbeat()
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const client = this.clients.get(ws)
        if (!client) return

        if (!client.isAlive) {
          this.clients.delete(ws)
          return ws.terminate()
        }

        client.isAlive = false
        client.lastPing = Date.now()
        ws.ping()
      })
    }, this.PING_INTERVAL)
  }

  private handleConnection(ws: WebSocket, req: any): void {
    const userId = this.getUserIdFromRequest(req)
    if (!userId) {
      ws.close(1008, '未授权')
      return
    }

    const client: WebSocketClient = {
      ws,
      userId,
      lastPing: Date.now(),
      isAlive: true
    }

    this.clients.set(ws, client)
    this.setupClientHandlers(ws, client)
  }

  private getUserIdFromRequest(req: any): number | null {
    try {
      const url = new URL(req.url, 'ws://localhost')
      const token = url.searchParams.get('token')
      if (!token) return null
      // TODO: 验证token并返回用户ID
      return 1
    } catch (error) {
      handleError(error, '获取用户ID失败')
      return null
    }
  }

  private setupClientHandlers(ws: WebSocket, client: WebSocketClient): void {
    ws.on('pong', () => {
      client.isAlive = true
      client.lastPing = Date.now()
    })

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data)
        this.handleMessage(ws, client, message)
      } catch (error) {
        handleError(error, '处理消息失败')
      }
    })

    ws.on('close', () => {
      this.clients.delete(ws)
      this.emit('clientDisconnected', client.userId)
    })

    ws.on('error', (error) => {
      handleError(error, 'WebSocket错误')
      this.clients.delete(ws)
    })
  }

  private handleMessage(ws: WebSocket, client: WebSocketClient, message: any): void {
    switch (message.type) {
      case 'command':
        this.emit('command', {
          userId: client.userId,
          command: message.command,
          serverId: message.serverId
        })
        break
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        break
      default:
        handleError(new Error('未知的消息类型'), '处理消息失败')
    }
  }

  public sendToUser(userId: number, message: any): void {
    this.wss.clients.forEach((ws: WebSocket) => {
      const client = this.clients.get(ws)
      if (client && client.userId === userId) {
        ws.send(JSON.stringify(message))
      }
    })
  }

  public broadcast(message: any): void {
    this.wss.clients.forEach((ws: WebSocket) => {
      ws.send(JSON.stringify(message))
    })
  }

  public getConnectedUsers(): number[] {
    return Array.from(this.clients.values()).map(client => client.userId)
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    this.wss.close()
    this.clients.clear()
  }
} 