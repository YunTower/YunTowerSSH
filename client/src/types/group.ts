// 分组相关接口定义
import { Server, ServerWithStatus } from './server'

// 基础分组接口
export interface Group {
  id: number
  name: string
  servers?: Server[]
}

// 带服务器的分组接口
export interface GroupWithServers extends Group {
  servers: ServerWithStatus[]
}

// 分组表单数据接口
export interface GroupFormData {
  name: string
}

// 创建分组时的数据接口
export type CreateGroupData = Omit<Group, 'id' | 'servers'>

// 更新分组时的数据接口
export type UpdateGroupData = Partial<Group>