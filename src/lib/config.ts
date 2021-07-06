import { IConfig } from "./types"
import path from "path"

const config: IConfig = {
    listenIp: '192.168.68.84',
    listenPort: 3000,
    sslCrt: path.join(__dirname, '../../cert/cert.pem'),
    sslKey: path.join(__dirname, '../../cert/key.pem'),
    mediasoup: {
        worker: {
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
            logLevel: 'warn',
            logTags: [
                'info',
                'ice',
                'dtls',
                'rtp',
                'srtp',
                'rtcp',
                // 'rtx',
                // 'bwe',
                // 'score',
                // 'simulcast',
                // 'svc'
            ]
        },
        router: {
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000,
                    },
                },
            ],
        },
        webRtcTransport: {
            listenIps: [
                {
                    ip: '192.168.68.84',
                    announcedIp: null,
                }
            ],
            maxIncomingBitrate: 1500000,
            initialAvailableOutgoingBitrate: 1000000,
        }
    }

}

export default config