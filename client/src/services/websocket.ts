import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { SearchAddon } from 'xterm-addon-search'
import { useAuthStore } from '@/stores/auth'

export class WebSocketService {
  private ws: WebSocket | null = null
  private term: Terminal
  private fitAddon: FitAddon
  private searchAddon: SearchAddon

  constructor() {
    this.term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, monospace'
    })

    this.fitAddon = new FitAddon()
    this.searchAddon = new SearchAddon()

    this.term.loadAddon(this.fitAddon)
    this.term.loadAddon(new WebLinksAddon())
    this.term.loadAddon(this.searchAddon)
  }

  connect(serverId: number, element: HTMLElement) {
    const authStore = useAuthStore()
    this.term.open(element)
    this.fitAddon.fit()

    this.ws = new WebSocket(`ws://localhost:3001?serverId=${serverId}`)
    this.ws.binaryType = 'arraybuffer'

    this.ws.onopen = () => {
      this.term.write('\x1B[1;32mConnected to server\x1B[0m\r\n')
    }

    this.ws.onmessage = (event) => {
      const data = new Uint8Array(event.data)
      this.term.write(data)
    }

    this.ws.onclose = () => {
      this.term.write('\x1B[1;31mDisconnected from server\x1B[0m\r\n')
    }

    this.ws.onerror = (error) => {
      this.term.write(`\x1B[1;31mError: ${error}\x1B[0m\r\n`)
    }

    this.term.onData((data) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(data)
      }
    })

    window.addEventListener('resize', () => {
      this.fitAddon.fit()
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.term.dispose()
  }

  search(text: string) {
    this.searchAddon.findNext(text)
  }
} 