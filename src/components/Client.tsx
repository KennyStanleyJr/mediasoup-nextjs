import StatusLight from './StatusLight'

import { useMediasoupController } from '../contexts/MediasoupControllerProvider'

const Client = () => {
    const {
        localStream,
        remoteStream,
        isConnected,
        isPublishing,
        isSubscribed,
        publish,
        subscribe,
    } = useMediasoupController()

    return (
        <>
            <div className="mt-12 flex items-center justify-around max-w-4xl mt-6 sm:w-full">
                <div>
                    <div className="bg-gray-200 flex items-center ml-4 pr-4 rounded-lg w-max">
                        <h3 className="pl-4 pr-3 py-1 text-xl">Local Video</h3>
                        <StatusLight status={isPublishing!} />
                    </div>

                    <video
                        ref={video => {
                            if (localStream == null || video == null) return
                            video.srcObject = localStream
                        }}
                        autoPlay
                        controls
                        className="border m-4 mt-0 max-w-lg rounded-lg"
                    ></video>
                </div>
                <div>
                    <div className="bg-gray-200 flex items-center ml-4 pr-4 rounded-lg w-max">
                        <h3 className="pl-4 pr-3 py-1 text-xl">Remote Video</h3>
                        <StatusLight status={isSubscribed!} />
                    </div>
                    <video
                        ref={video => {
                            if (remoteStream == null || video == null) return
                            video.srcObject = remoteStream
                        }}
                        autoPlay
                        controls
                        className="border m-4 mt-0 max-w-lg rounded-lg"
                    ></video>
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-around max-w-lg mt-6 sm:w-full">
                <button
                    onClick={() => {
                        if (publish != null) publish(true)
                    }}
                    id="btn_webcam"
                    className="bg-gray-700 cursor-pointer hover:bg-gray-500 px-4 py-2 rounded-full text-white"
                >
                    Webcam
                </button>
                <button
                    onClick={() => {
                        if (publish != null) publish(false)
                    }}
                    className="bg-gray-700 cursor-pointer hover:bg-gray-500 px-4 py-2 rounded-full text-white"
                >
                    Screenshare
                </button>
                <button
                    onClick={subscribe}
                    className="bg-gray-700 cursor-pointer hover:bg-gray-500 px-4 py-2 rounded-full text-white"
                >
                    Subscribe
                </button>
            </div>

            <div className="mt-12">
                <button
                    // onClick={join}
                    className="flex items-center bg-gray-300 hover:bg-gray-200 px-6 py-1 rounded-full text-black"
                >
                    <h3 className="mr-3">Connect</h3>
                    <StatusLight status={isConnected!} />
                </button>
            </div>
        </>
    )
}

export default Client
