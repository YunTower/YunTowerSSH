import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { config } from 'dotenv'
import { ServerService } from './services/server'
import { AuthService } from './services/auth'
import { DatabaseService } from './services/database'
import { handleError } from './utils/errorHandler'

interface User {
  id: number
  username: string
}

interface Server {
  id: number
  user_id: number
  name: string
  host: string
  port: number
  username: string
  password?: string
  private_key?: string
  created_at: string
  last_connected?: string
  connection_count: number
}

// 加载环境变量
config()

const app = express()
const httpServer = createServer(app)
const wss = new WebSocketServer({ server: httpServer })

// 中间件
app.use(cors())
app.use(express.json())

// 初始化服务
const db = new DatabaseService()
const authService = new AuthService(db)
const serverService = new ServerService(db)

// WebSocket 连接处理
wss.on('connection', async (ws, req) => {
  try {
    const url = req.url || '';
    const urlObj = new URL(`http://localhost${url}`); // Dummy base for URL parsing
    const parts = urlObj.pathname.split('/').filter(p => p !== '');
    
    // Extract user and server IDs from URL
    let userId: string | null = null;
    let serverId: string | null = null;
    
    // Format: /users/:userId/terminal/:serverId or /terminal/:serverId (old format)
    if (parts.length >= 4 && parts[0] === 'users' && parts[2] === 'terminal') {
      userId = parts[1];
      serverId = parts[3];
    } else if (parts.length >= 2 && parts[0] === 'terminal') {
      serverId = parts[1];
      userId = serverId; // Backward compatibility
    }

    if (!serverId || !userId) {
      console.error('Invalid WebSocket URL format:', url);
      ws.close();
      return;
    }

    // Verify token from query parameter
    const token = urlObj.searchParams.get('token');
    if (!token) {
      console.error('No authentication token provided');
      ws.send('Error: Authentication required');
      ws.close();
      return;
    }

    try {
      // Verify the token
      const user = await authService.verifyToken(token);
      
      // Check if the user ID in the token matches the requested user ID
      if (user.id !== Number(userId)) {
        console.error('Token user ID does not match requested user ID');
        ws.send('Error: Unauthorized access');
        ws.close();
        return;
      }
    } catch (error) {
      console.error('Invalid token:', error);
      ws.send('Error: Invalid authentication token');
      ws.close();
      return;
    }

    const userIdNum = Number(userId);
    const serverIdNum = Number(serverId);

    // Register this WebSocket connection with the server service
    serverService.registerWebSocket(userIdNum, serverIdNum, ws);

    ws.on('message', async (message) => {
      try {
        await serverService.executeCommand(userIdNum, serverIdNum, message.toString());
        // Note: response is handled by the registered WebSocket event listeners
      } catch (error) {
        handleError(error, '命令执行失败');
        ws.send('Error: ' + (error as Error).message);
      }
    });

    ws.on('close', () => {
      // Only disconnect this specific WebSocket connection, 
      // not the entire SSH connection which may be used by other clients
      try {
        serverService.registerWebSocket(userIdNum, serverIdNum, undefined);
      } catch (error) {
        handleError(error, 'WebSocket关闭处理失败');
      }
    });
  } catch (error) {
    handleError(error, 'WebSocket连接处理失败');
    ws.close();
  }
});

// 路由
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const result = await authService.login(username, password)
    res.json(result)
  } catch (error) {
    handleError(error, '登录失败')
    res.status(401).json({ error: (error as Error).message })
  }
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body
    await authService.register(username, password)
    res.status(201).json({ message: '注册成功' })
  } catch (error) {
    handleError(error, '注册失败')
    res.status(400).json({ error: (error as Error).message })
  }
})

app.get('/api/servers', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      throw new Error('未授权')
    }

    const user = await authService.verifyToken(token) as User
    const servers = await db.query<Server[]>('SELECT * FROM servers WHERE user_id = ?', [user.id])
    res.json(servers)
  } catch (error) {
    handleError(error, '获取服务器列表失败')
    res.status(401).json({ error: (error as Error).message })
  }
})

app.post('/api/servers', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      throw new Error('未授权')
    }

    const user = await authService.verifyToken(token) as User
    const { name, host, port, username, password, private_key } = req.body

    if (!name || !host || !port || !username) {
      throw new Error('缺少必要参数')
    }

    const result = await db.execute(
      'INSERT INTO servers (user_id, name, host, port, username, password, private_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, name, host, port, username, password || null, private_key || null]
    )

    res.status(201).json({ message: '服务器创建成功', id: result.lastID })
  } catch (error) {
    handleError(error, '创建服务器失败')
    res.status(400).json({ error: (error as Error).message })
  }
})

app.post('/api/servers/:id/connect', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      throw new Error('未授权')
    }

    const user = await authService.verifyToken(token) as User
    const servers = await db.query<Server[]>('SELECT * FROM servers WHERE id = ? AND user_id = ?', [req.params.id, user.id])
    const server = servers[0] as unknown as Server
    
    if (!server) {
      throw new Error('服务器不存在')
    }

    await serverService.connect(user.id, server.id, {
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      privateKey: server.private_key
    })

    res.json({ message: '连接成功' })
  } catch (error) {
    handleError(error, '连接服务器失败')
    res.status(400).json({ error: (error as Error).message })
  }
})

// 验证Token
app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      throw new Error('未提供Token')
    }

    const user = await authService.verifyToken(token)
    res.json({ user })
  } catch (error) {
    handleError(error, 'Token验证失败')
    res.status(401).json({ error: (error as Error).message })
  }
})

// 添加获取当前连接的接口
app.get('/api/connections', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      throw new Error('未授权')
    }

    const user = await authService.verifyToken(token) as User
    const connections = await serverService.listConnections(user.id)
    
    // 获取服务器信息
    const serverIds = [...new Set(connections.map(conn => conn.serverId))]
    
    // 只有当有服务器IDs时才查询
    let servers: Server[] = []
    if (serverIds.length > 0) {
      const serversResult = await db.query<Server>(
        'SELECT * FROM servers WHERE id IN (' + serverIds.map(() => '?').join(',') + ')',
        serverIds
      )
      if (Array.isArray(serversResult)) {
        servers = serversResult
      }
    }
    
    // 合并服务器信息和连接信息
    const result = connections.map(conn => {
      const server = servers.find(s => s.id === conn.serverId)
      return {
        ...conn,
        serverName: server ? server.name : '',
        host: server ? server.host : '',
        username: server ? server.username : ''
      }
    })
    
    res.json(result)
  } catch (error) {
    handleError(error, '获取连接列表失败')
    res.status(401).json({ error: (error as Error).message })
  }
})

// 错误处理中间件
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  handleError(err, '服务器错误')
  res.status(500).json({ error: '服务器内部错误' })
})

// 启动服务器
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
}) 