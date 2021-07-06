import React, { useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export interface ISocket extends Socket {
    request?: any
}

function socketPromise(socket: ISocket) {
    return function request(type: string, data = {}) {
        return new Promise(resolve => {
            socket.emit(type, data, resolve)
        })
    }
}

export interface ISocketProviderInput {
    endpoint: string
    token: string
    children?: any
}

const SocketContext = React.createContext<ISocket | undefined>(undefined)

export function useSocket() {
    return useContext(SocketContext)
}

export function SocketProvider({
    endpoint,
    token = 'unset',
    children,
}: ISocketProviderInput) {
    const [socket, setSocket] = useState<ISocket>({} as ISocket)

    useEffect(() => {
        // socket = socketClient(serverUrl, opts)

        const newSocket: ISocket = io(endpoint, {
            transports: ['websocket'],
            path: '/server',
            auth: { token },
            // query: { id, type },
            // reconnection: true,
            // reconnectionDelay: 1000,
            // reconnectionDelayMax: 5000,
            // reconnectionAttempts: Infinity,
        })

        newSocket.request = socketPromise(newSocket)

        setSocket(newSocket)

        return () => {
            newSocket.close()
        }
    }, [token])

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
}
