import React, { useContext, useEffect, useState, useCallback } from 'react'
import { useSocket } from './SocketProvider'

export interface IUser {
    id: string
    type: 'admin' | 'participant'
    isConnected: boolean
    attr: {}
}

export interface IUserProviderInput {
    id: string
    type: 'admin' | 'participant'
    setIdFromShow: any
    children?: any
}

const UserContext = React.createContext<IUser | undefined>(undefined)

export function useUser() {
    return useContext(UserContext)
}

export function UserProvider({
    id,
    type,
    setIdFromShow,
    children,
}: IUserProviderInput) {
    const [user, setUser] = useState<IUser>({
        id: id,
        type: type,
        isConnected: false,
        attr: {},
    })

    const socket = useSocket()

    const setUserId = (id: string) => {
        setUser(user => {
            return { ...user, id: id }
        })
    }

    const setIsConnected = (isConnected: boolean) => {
        setUser(user => {
            return { ...user, isConnected: isConnected }
        })
    }

    const requestConnection = useCallback(() => {
        if (user.isConnected) return
        socket?.emit('request-connection', user)
    }, [socket, user])

    useEffect(() => {
        if (socket == null) return
        if (socket.on == null) return

        requestConnection()

        socket.on('invalid-token', () => {
            console.log('Invalid Token')
        })

        socket.on('connected', newUser => {
            console.log(`Connected to Server with ID: ${newUser.id}`)
            // if (user === newUser)
            setUser(newUser)
            console.log(newUser)
            setIdFromShow(newUser.id)
        })

        socket.on('disconnect', () => {
            setIsConnected(false)
            socket.disconnect()
        })

        return () => {
            socket.off('connected')
            socket.off('disconnected')
            socket.off('invalid-token')
        }
    }, [socket, id])

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}
