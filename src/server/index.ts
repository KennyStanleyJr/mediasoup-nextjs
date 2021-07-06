import * as mediasoup from 'mediasoup';
import io from 'socket.io'
import next from 'next'
import { createServer, Server } from 'https'
import { parse } from 'url'
import fs from 'fs'
import config from '../lib/config';

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// Global variables
let worker: mediasoup.types.Worker
let webServer: Server
let socketServer: io.Server
let producer: mediasoup.types.Producer
let consumer: mediasoup.types.Consumer
let producerTransport: mediasoup.types.WebRtcTransport
let consumerTransport: mediasoup.types.WebRtcTransport
let mediasoupRouter: mediasoup.types.Router

(async () => {
    try {
        await runWebServer();
        await runSocketServer();
        await runMediasoupWorker();
    } catch (err) {
        console.error(err);
    }
})();

async function runWebServer() {
    const { sslKey, sslCrt } = config;
    if (!fs.existsSync(sslKey) || !fs.existsSync(sslCrt)) {
        console.error('SSL files are not found. check your config.js file');
        process.exit(0);
    }
    const tls = {
        cert: fs.readFileSync(sslCrt),
        key: fs.readFileSync(sslKey),
    };

    await app.prepare().then(() => {
        webServer = createServer(tls, (req, res) => {
            const parsedUrl = parse(req.url!, true);
            handle(req, res, parsedUrl);
        });
    })

    webServer.on('error', (err: Error) => {
        console.error('starting web server failed:', err.message);
    });

    await new Promise<void>((resolve) => {
        const { listenIp, listenPort } = config;
        webServer.listen(listenPort, listenIp, () => {
            const listenIps = config.mediasoup.webRtcTransport.listenIps[0];
            const ip = listenIps.announcedIp || listenIps.ip;
            console.log('server is running');
            console.log(`open https://${ip}:${listenPort} in your web browser`);
            resolve();
        });
        // webServer.listen(listenPort, () => {
        //     console.log('server is running');
        //     console.log(`open https://localhost:${listenPort} in your web browser`);
        //     resolve();
        // });
    });
}

async function runSocketServer() {
    socketServer = new io.Server(webServer, {
        serveClient: false,
        path: '/server',
        //log: false, //It seems not recognized for socketIO Typings. Maybe are outdated?
    })

    socketServer.on('connection', (socket: io.Socket) => {
        console.log('client connected');

        // inform the client about existence of producer
        if (producer) {
            socket.emit('newProducer');
        }

        socket.on('join', () => {
            socket.emit('joined')
        })

        socket.on('disconnect', () => {
            console.log('client disconnected');
        });

        socket.on('connect_error', (err) => {
            console.error('client connection error', err);
        });

        socket.on('getRouterRtpCapabilities', (data, callback) => {
            callback(mediasoupRouter.rtpCapabilities);
        });

        socket.on('createProducerTransport', async (data, callback) => {
            try {
                const { transport, params } = await createWebRtcTransport();
                producerTransport = transport;
                callback(params);
            } catch (err) {
                console.error(err);
                callback({ error: err.message });
            }
        });

        socket.on('createConsumerTransport', async (data, callback) => {
            try {
                const { transport, params } = await createWebRtcTransport();
                consumerTransport = transport;
                callback(params);
            } catch (err) {
                console.error(err);
                callback({ error: err.message });
            }
        });

        socket.on('connectProducerTransport', async (data, callback) => {
            await producerTransport.connect({ dtlsParameters: data.dtlsParameters });
            callback();
        });

        socket.on('connectConsumerTransport', async (data, callback) => {
            await consumerTransport.connect({ dtlsParameters: data.dtlsParameters });
            callback();
        });

        socket.on('produce', async (data, callback) => {
            const { kind, rtpParameters } = data;
            producer = await producerTransport.produce({ kind, rtpParameters });
            callback({ id: producer.id });

            // inform clients about new producer
            socket.broadcast.emit('newProducer');
        });

        socket.on('consume', async (data, callback) => {
            callback(await createConsumer(producer, data.rtpCapabilities));
        });

        socket.on('resume', async (data, callback) => {
            await consumer.resume();
            callback();
        });
    });
}


async function runMediasoupWorker() {
    worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel,
        logTags: config.mediasoup.worker.logTags,
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
    });

    worker.on('died', () => {
        console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
        setTimeout(() => process.exit(1), 2000);
    });

    const mediaCodecs = config.mediasoup.router.mediaCodecs;
    mediasoupRouter = await worker.createRouter({ mediaCodecs });
}

async function createWebRtcTransport() {
    const {
        maxIncomingBitrate,
        initialAvailableOutgoingBitrate
    } = config.mediasoup.webRtcTransport;

    const transport = await mediasoupRouter.createWebRtcTransport({
        listenIps: config.mediasoup.webRtcTransport.listenIps as (string | mediasoup.types.TransportListenIp)[],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate,
    });
    if (maxIncomingBitrate) {
        try {
            await transport.setMaxIncomingBitrate(maxIncomingBitrate);
        } catch (error) {
        }
    }
    return {
        transport,
        params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
        },
    };
}

async function createConsumer(producer: { id: any; kind?: any; }, rtpCapabilities: any) {
    if (!mediasoupRouter.canConsume(
        {
            producerId: producer.id,
            rtpCapabilities,
        })
    ) {
        console.error('can not consume');
        return;
    }
    try {
        consumer = await consumerTransport.consume({
            producerId: producer.id,
            rtpCapabilities,
            paused: producer.kind === 'video',
        });
    } catch (error) {
        console.error('consume failed', error);
        return;
    }

    if (consumer.type === 'simulcast') {
        await consumer.setPreferredLayers({ spatialLayer: 2, temporalLayer: 2 });
    }

    return {
        producerId: producer.id,
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused
    };
}
