import * as mediasoup from 'mediasoup-client'
import config from '../lib/config'
import { useSocket } from '../contexts/SocketProvider'

import { useRef, useEffect, useCallback, useReducer } from 'react'

function reducer(state: any, action: any) {
    switch (action.type) {
        case 'connect': {
            return {
                ...state,
                isLoading: true,
            }
        }
        case 'connected': {
            return {
                ...state,
                isConnected: true,
                isLoading: false,
            }
        }
        case 'disconnect': {
            return {
                ...state,
                isConnected: false,
            }
        }
        case 'publish': {
            return {
                ...state,
                isPublishing: true,
            }
        }
        case 'subscribe': {
            return {
                ...state,
                isSubscribed: true,
            }
        }
        case 'newProducer': {
            return {
                ...state,
                subscribeIsDisabled: false,
            }
        }
        case 'error': {
            return {
                ...state,
                error: 'Error',
            }
        }
    }
}

const initialState = {
    isLoading: false,
    isConnected: false,
    isPublishing: false,
    isSubscribed: false,
    subscribeIsDisabled: true,
}

const Client = (clientData: any) => {
    const [state, dispatch] = useReducer(reducer, initialState)

    const socket = useSocket()
    let device: mediasoup.types.Device
    let producer

    const fsPublish = useRef<HTMLFieldSetElement>(null)
    const fsSubscribe = useRef<HTMLFieldSetElement>(null)
    const btnWebcam = useRef<HTMLButtonElement>(null)
    const btnScreen = useRef<HTMLButtonElement>(null)
    const btnSubscribe = useRef<HTMLButtonElement>(null)
    const chkSimulcast = useRef<HTMLInputElement>(null)
    const txtConnection = useRef<HTMLElement>(null)
    const txtWebcam = useRef<HTMLElement>(null)
    const txtScreen = useRef<HTMLElement>(null)
    const txtSubscription = useRef<HTMLElement>(null)
    const txtPublish = useRef<HTMLElement>(null)

    const localVideo = useRef<HTMLVideoElement>(null)
    const remoteVideo = useRef<HTMLVideoElement>(null)

    const connect = useCallback(async () => {
        dispatch({ type: 'connect' })
        if (txtConnection.current != null)
            txtConnection.current.innerHTML = 'Connecting'

        const opts = {
            path: '/server',
            transports: ['websocket'],
        }
        const serverUrl = `https://${config.listenIp}:${config.listenPort}`
        try {
            if (socket == null) return

            socket.on('joined', async () => {
                if (txtConnection.current != null)
                    txtConnection.current.innerHTML = 'Connected'

                if (fsPublish.current != null)
                    fsPublish.current.disabled = false
                if (fsSubscribe.current != null)
                    fsSubscribe.current.disabled = false

                const data = await socket.request('getRouterRtpCapabilities')
                await loadDevice(data)
                dispatch({ type: 'connected' })
            })

            socket.on('disconnect', () => {
                dispatch({ type: 'disconnect' })

                if (txtConnection.current != null)
                    txtConnection.current.innerHTML = 'Disconnected'
                if (fsPublish.current != null) fsPublish.current.disabled = true
                if (fsSubscribe.current != null)
                    fsSubscribe.current.disabled = true
            })

            socket.on('connect_error', error => {
                dispatch({ type: 'error' })

                console.error(
                    'could not connect to %s%s (%s)',
                    serverUrl,
                    opts.path,
                    error.message
                )
                if (txtConnection.current != null)
                    txtConnection.current.innerHTML = 'Connection failed'
            })

            socket.on('newProducer', () => {
                dispatch({ type: 'newProducer' })

                if (fsSubscribe.current != null)
                    fsSubscribe.current.disabled = false
            })

            await socket.request('join')
        } catch (error) {
            dispatch({ type: 'error' })
        }
    }, [socket])

    async function loadDevice(routerRtpCapabilities: any) {
        console.log('loadDevice')

        try {
            device = new mediasoup.Device()
        } catch (error) {
            if (error.name === 'UnsupportedError') {
                console.error('browser not supported')
            }
        }
        await device.load({ routerRtpCapabilities })
        console.log('loadDevice-done')
    }

    const publish = useCallback(
        async (e: any) => {
            console.log(e.target)
            let isWebcam = false
            if (e.target != null && e.target.id != null) {
                isWebcam = e.target.id === 'btn_webcam'
            }

            if (socket == null) return

            const data = await socket.request('createProducerTransport', {
                forceTcp: false,
                rtpCapabilities: device.rtpCapabilities,
            })
            if (data.error) {
                console.error(data.error)
                return
            }

            const transport = device.createSendTransport(data)
            transport.on(
                'connect',
                async ({ dtlsParameters }, callback, errback) => {
                    socket
                        .request('connectProducerTransport', { dtlsParameters })
                        .then(callback)
                        .catch(errback)
                }
            )

            transport.on(
                'produce',
                async ({ kind, rtpParameters }, callback, errback) => {
                    try {
                        const { id } = await socket.request('produce', {
                            transportId: transport.id,
                            kind,
                            rtpParameters,
                        })
                        callback({ id })
                    } catch (err) {
                        errback(err)
                    }
                }
            )

            transport.on('connectionstatechange', async state => {
                switch (state) {
                    case 'connecting':
                        if (txtPublish.current != null)
                            txtPublish.current.innerHTML = 'publishing...'
                        if (fsPublish.current != null)
                            fsPublish.current.disabled = true
                        if (fsSubscribe.current != null)
                            fsSubscribe.current.disabled = true
                        break

                    case 'connected':
                        if (localVideo.current != null)
                            localVideo.current.srcObject =
                                (await stream) as MediaProvider
                        if (txtPublish.current != null)
                            txtPublish.current.innerHTML = 'published'
                        if (fsPublish.current != null)
                            fsPublish.current.disabled = true
                        if (fsSubscribe.current != null)
                            fsSubscribe.current.disabled = false
                        break

                    case 'failed':
                        transport.close()
                        if (txtPublish.current != null)
                            txtPublish.current.innerHTML = 'failed'
                        if (fsPublish.current != null)
                            fsPublish.current.disabled = false
                        if (fsSubscribe.current != null)
                            fsSubscribe.current.disabled = true
                        break

                    default:
                        break
                }
            })

            let stream: MediaStream
            try {
                stream = await getUserMedia(transport, isWebcam)
                const track = stream.getVideoTracks()[0]
                type params = {
                    track: MediaStreamTrack
                    encodings?: { maxBitrate: number }[]
                    codecOptions?: { videoGoogleStartBitrate: number }
                }
                const params: params = { track }
                if (
                    chkSimulcast.current != null &&
                    chkSimulcast.current.checked
                ) {
                    params.encodings = [
                        { maxBitrate: 100000 },
                        { maxBitrate: 300000 },
                        { maxBitrate: 900000 },
                    ]
                    params.codecOptions = {
                        videoGoogleStartBitrate: 1000,
                    }
                }
                producer = await transport.produce(params)
                dispatch({ type: 'publish' })
            } catch (err) {
                if (txtPublish.current != null)
                    txtPublish.current.innerHTML = 'failed'
            }
        },
        [socket]
    )

    async function getUserMedia(
        transport: mediasoup.types.Transport,
        isWebcam: boolean
    ) {
        console.log('getUserMedia')

        if (!device.canProduce('video')) {
            console.error('cannot produce video')
            return
        }

        let stream
        try {
            stream = isWebcam
                ? await navigator.mediaDevices.getUserMedia({ video: true })
                : // @ts-ignore      | getDisplayMedia is not defined in typescript yet
                  await navigator.mediaDevices.getDisplayMedia({ video: true })
        } catch (err) {
            console.error('getUserMedia() failed:', err.message)
            throw err
        }
        console.log('getUserMedia-done')

        return stream
    }

    const subscribe = useCallback(async () => {
        console.log('subscribe')

        if (socket == null) return
        const data = await socket.request('createConsumerTransport', {
            forceTcp: false,
        })
        if (data.error) {
            console.error(data.error)
            return
        }

        const transport = device.createRecvTransport(data)
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            socket
                .request('connectConsumerTransport', {
                    transportId: transport.id,
                    dtlsParameters,
                })
                .then(callback)
                .catch(errback)
        })

        transport.on('connectionstatechange', async state => {
            switch (state) {
                case 'connecting':
                    if (txtSubscription.current != null)
                        txtSubscription.current.innerHTML = 'subscribing...'
                    if (fsSubscribe.current != null)
                        fsSubscribe.current.disabled = true
                    break

                case 'connected':
                    dispatch({ type: 'subscribe' })
                    if (remoteVideo.current != null)
                        remoteVideo.current.srcObject =
                            (await stream) as MediaProvider
                    await socket.request('resume')
                    if (txtSubscription.current != null)
                        txtSubscription.current.innerHTML = 'subscribed'
                    if (fsSubscribe.current != null)
                        fsSubscribe.current.disabled = true
                    break

                case 'failed':
                    transport.close()
                    if (txtSubscription.current != null)
                        txtSubscription.current.innerHTML = 'failed'
                    if (fsSubscribe.current != null)
                        fsSubscribe.current.disabled = false
                    break

                default:
                    break
            }
        })

        const stream = consume(transport)
    }, [socket])

    const consume = useCallback(
        async (transport: any) => {
            console.log('consume')

            const { rtpCapabilities } = device
            if (socket == null) return
            const data = await socket.request('consume', { rtpCapabilities })
            const { producerId, id, kind, rtpParameters } = data

            let codecOptions = {}
            const consumer = await transport.consume({
                id,
                producerId,
                kind,
                rtpParameters,
                codecOptions,
            })
            const stream = new MediaStream()
            stream.addTrack(consumer.track)
            console.log('consume-done')

            return stream
        },
        [socket]
    )

    useEffect(() => {
        connect()
    }, [socket])

    return (
        <>
            <div className="mt-12 flex items-center justify-around max-w-4xl mt-6 sm:w-full">
                <div>
                    <div className="bg-gray-200 flex items-center ml-4 rounded-lg w-max">
                        <h3 className="pl-4 pr-3 py-1 text-xl">Local Video</h3>
                        <div
                            className={
                                state.isPublishing
                                    ? 'bg-green-600 w-3 h-3 mr-4 rounded-full'
                                    : 'bg-red-600 w-3 h-3 mr-4 rounded-full'
                            }
                        ></div>
                    </div>

                    <video
                        ref={localVideo}
                        autoPlay
                        controls
                        className="border m-4 mt-0 max-w-lg rounded-lg"
                    ></video>
                </div>
                <div>
                    <div className="bg-gray-200 flex items-center ml-4 rounded-lg w-max">
                        <h3 className="pl-4 pr-3 py-1 text-xl">Remote Video</h3>
                        <div
                            className={
                                state.isSubscribed
                                    ? 'bg-green-600 w-3 h-3 mr-4 rounded-full'
                                    : 'bg-red-600 w-3 h-3 mr-4 rounded-full'
                            }
                        ></div>
                    </div>
                    <video
                        ref={remoteVideo}
                        autoPlay
                        controls
                        className="border m-4 mt-0 max-w-lg rounded-lg"
                    ></video>
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-around max-w-lg mt-6 sm:w-full">
                <button
                    ref={btnWebcam}
                    onClick={publish}
                    id="btn_webcam"
                    className="bg-gray-700 cursor-pointer hover:bg-gray-500 px-4 py-2 rounded-full text-white"
                >
                    Webcam
                </button>
                <button
                    ref={btnScreen}
                    onClick={publish}
                    className="bg-gray-700 cursor-pointer hover:bg-gray-500 px-4 py-2 rounded-full text-white"
                >
                    Screenshare
                </button>
                <button
                    ref={btnSubscribe}
                    onClick={subscribe}
                    className="bg-gray-700 cursor-pointer hover:bg-gray-500 px-4 py-2 rounded-full text-white"
                >
                    Subscribe
                </button>
            </div>

            <div className="mt-12">
                <span
                    ref={txtConnection}
                    className={
                        state.isConnected
                            ? 'bg-green-600 px-6 py-1 rounded-full text-white'
                            : 'bg-red-600 px-6 py-1 rounded-full text-white'
                    }
                ></span>
            </div>

            {/* <div className="mt-12">
                <h4>Status: </h4>
                <p>
                    Connection: <span ref={txtConnection}></span>
                </p>
                <p>
                    Publish: <span ref={txtPublish}></span>
                </p>
                <p>
                    Subscribe: <span ref={txtSubscription}></span>
                </p>
            </div> */}
        </>
    )
}

export default Client
