// 服务器相关接口定义

// 基础服务器接口
export interface Server {
  id: number
  name: string
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  userId?: number
  createdAt?: string
  updatedAt?: string
}

// 服务器状态类型
export type ServerStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

// 带状态的服务器接口
export interface ServerWithStatus extends Server {
  status?: ServerStatus
}

// 已连接的服务器接口
export interface ConnectedServer extends ServerWithStatus {
  tabKey: string
}

// 服务器表单数据接口
export interface ServerFormData {
  name: string
  host: string
  port: number
  username: string
  password: string
}

// 创建服务器时的数据接口
export type CreateServerData = Omit<Server, 'id' | 'userId' | 'createdAt' | 'updatedAt'>

// 更新服务器时的数据接口
export type UpdateServerData = Partial<Server>