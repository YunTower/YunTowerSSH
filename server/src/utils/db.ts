import sqlite3 from 'sqlite3'
import { UserModel } from '@/models/User'
import { ServerModel } from '@/models/Server'

const db = new sqlite3.Database('ssh-client.db')

export const userModel = new UserModel(db)
export const serverModel = new ServerModel(db)

export function closeDb() {
  db.close()
} 