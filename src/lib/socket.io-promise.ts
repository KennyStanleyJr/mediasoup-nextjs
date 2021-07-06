// Adds support for Promise to socket.io-client
import { ISocket } from "./types"
export default function promise(socket: ISocket) {
    return function request(type: string, data = {}) {
        return new Promise(resolve => {
            socket.emit(type, data, resolve)
        })
    }
}
