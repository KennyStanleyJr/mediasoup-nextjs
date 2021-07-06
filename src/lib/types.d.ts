export interface IConfig {
    listenIp: string
    listenPort: number
    sslCrt: string
    sslKey: string
    mediasoup: {
        worker: {
            rtcMinPort: number
            rtcMaxPort: number
            logLevel: mediasoup.types.WorkerLogLevel
            logTags: mediasoup.types.WorkerLogTag[]
        }
        router: {
            mediaCodecs: any
        }
        webRtcTransport: {
            listenIps: {
                ip: string | mediasoup.types.TransportListenIp
                announcedIp: string | mediasoup.types.TransportListenIp | null
            }[]
            maxIncomingBitrate: number
            initialAvailableOutgoingBitrate: number
        }
    }
}