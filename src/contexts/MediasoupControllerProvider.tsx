import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import { Device } from "mediasoup-client";
import { useSocket } from "./SocketProvider";
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters";
import { Transport } from "mediasoup-client/lib/Transport";
import { ProducerOptions } from "mediasoup-client/lib/Producer";

export interface IMediasoupController {
  localStream: MediaStream
  remoteStream: MediaStream
  isConnected: boolean
  isPublishing: boolean
  isSubscribed: boolean
  publish(isWebcam: boolean): Promise<void>
  subscribe(): void
}

export interface IMediasoupControllerProviderInput {
  children?: any;
}

const MediasoupControllerContext = React.createContext<
  IMediasoupController | undefined
>(undefined);

export function useMediasoupController() {
  return {...useContext(MediasoupControllerContext)}
}

export function MediasoupControllerProvider({children}: IMediasoupControllerProviderInput) {
  const socket = useSocket();

  const [localStream, setLocalStream] = useState<any>()
  const [remoteStream, setRemoteStream] = useState<any>()
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isPublishing, setIsPublishing] = useState<boolean>(false)
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)

  const [device, setDevice] = useState<Device>();

  const loadDevice = async (routerRtpCapabilities: RtpCapabilities) => {
    try {
      const newDevice = new Device();
      // Load the device with the router RTP capabilities.
      await newDevice.load({ routerRtpCapabilities });
      setDevice(newDevice);
    } catch (error) {
      if (error.name === "UnsupportedError") {
        console.error("browser not supported");
      } else {
        console.log(error);
      }
    }
  };

  const publish = useCallback(
    async (isWebcam: boolean) => {
      if (socket == null || device == null) return;

      const data = await socket.request("createProducerTransport", {
        forceTcp: false,
        rtpCapabilities: device.rtpCapabilities,
      });

      if (data.error) {
        console.error(data.error);
        return;
      }

      const transport = device.createSendTransport(data); 

      transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        socket
          .request("connectProducerTransport", { dtlsParameters })
          .then(callback)
          .catch(errback);
      });

      transport.on(
        "produce",
        async ({ kind, rtpParameters }, callback, errback) => {
          try {
            const { id } = await socket.request("produce", {
              transportId: transport.id,
              kind,
              rtpParameters,
            });
            callback({ id });
          } catch (err) {
            errback(err);
          }
        }
      );

      transport.on("connectionstatechange", (state) => {
        switch (state) {
          case "connecting":
            console.log("connecting");
            break;

          case "connected":
            console.log("connected");
            break;

          case "failed":
            console.log("failed");
            transport.close();
            break;

          default:
            break;
        }
      });
      const stream = await getUserMedia(transport, isWebcam);

      if (stream == null) {
        console.log("Get user media failed");
        setIsPublishing(false)
        return;
      }
    setLocalStream(stream)
    setIsPublishing(true)
    },
    [socket, device]
  );

  const getUserMedia = useCallback(
    async (
      transport: Transport,
      isWebcam: boolean
    ): Promise<MediaStream | undefined> => {
      if (device == null) return;

      if (!device.canProduce("video")) {
        console.error("Cannot produce video");
        return;
      }

      let stream: MediaStream;
      try {
        stream = isWebcam
          ? await navigator.mediaDevices.getUserMedia({ video: true })
          : await (navigator.mediaDevices as any).getDisplayMedia({
              video: true,
            });
      } catch (error) {
        console.error("starting webcam failed,", error.message);
        setIsPublishing(false)
        throw error;
      }

      const track = stream.getVideoTracks()[0];
      const params: ProducerOptions = { track };
      const useSimulcast = true;
      if (useSimulcast) {
        params.encodings = [
          { maxBitrate: 100000 },
          { maxBitrate: 300000 },
          { maxBitrate: 900000 },
        ];
        params.codecOptions = {
          videoGoogleStartBitrate: 1000,
        };
      }
      await transport.produce(params);
      return stream;
    },
    [device]
  );

  const subscribe = useCallback(async () => {
    if (socket == null || device == null) return;

    const data = await socket.request("createConsumerTransport", {
      forceTcp: false,
      rtpCapabilities: device.rtpCapabilities,
    });

    if (data.error) {
        console.error(data.error);
        setIsSubscribed(false)
        return  
    }

    const transport = await device.createRecvTransport(data);
    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      socket
        .request("connectConsumerTransport", {
          transportId: transport.id,
          dtlsParameters,
        })
        .then(callback)
        .catch(errback);
    });

    transport.on("connectionstatechange", (state) => {
      switch (state) {
        case "connecting":
          console.log("connecting");
          break;

        case "connected":
          console.log("connected");
          break;

        case "failed":
          console.log("failed");
          transport.close();
          break;

        default:
          break;
      }
    });

    const stream = await consume(transport);

    if (stream == null) {
      console.log("Get user media failed");
      setRemoteStream(null)
      setIsSubscribed(false)
      return;
    }
    setRemoteStream(stream)
    setIsSubscribed(true)
    socket.request("resume");
  }, [socket, device]);

  const consume = useCallback(
    async (transport: Transport) => {
      if (socket == null || device == null) return;

      const { rtpCapabilities } = device;
      const data = await socket.request("consume", { rtpCapabilities });

      const { producerId, id, kind, rtpParameters } = data;

    //   let codecOptions = {}
      const consumer = await transport.consume({
          id,
          producerId,
          kind,
          rtpParameters,
          // codecOptions
      })

      const stream = new MediaStream()
      stream.addTrack(consumer.track)
      return stream
    },
    [socket, device]
  );

  const join = useCallback(async () => {
    if (socket == null || socket.emit == null) return
    await socket.request('join')
  }, [socket])

  useEffect(() => {
    if (!isConnected && join != null) join()
    console.log(isConnected)
}, [isConnected, join])

  useEffect(() => {
    if (socket == null || socket.on == null) return;

    socket.on("join-accepted", async () => {
        console.log('join accepted')

      // Communicate with our server app to retrieve router RTP capabilities.
      const routerRtpCapabilities = await socket.request(
        "getRouterRtpCapabilities"
      );
      await loadDevice(routerRtpCapabilities);
      setIsConnected(true)
    });

    socket.on("connect_error", (error: any) => {
      console.log("Connection Error: ");
      console.log(error);
      setIsConnected(false)
    });

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('newProducer', () => {
        console.log('New Producer')
    })

    return () => {
      socket.off('join-accepted');
      socket.off('connect_error');
      socket.off('newProducer');
    };
  }, [socket, loadDevice]);

  return (
    <MediasoupControllerContext.Provider value={{ localStream, remoteStream, isConnected, isPublishing, isSubscribed, publish, subscribe}}>
      {children}
    </MediasoupControllerContext.Provider>
  );
}
