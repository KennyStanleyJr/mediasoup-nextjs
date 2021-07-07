const StatusLight = ({ status }: { status: boolean }) => {
    return (
        <>
            <div
                className={
                    status
                        ? 'bg-green-600 w-3 h-3 rounded-full'
                        : 'bg-red-600 w-3 h-3 rounded-full'
                }
            ></div>
        </>
    )
}
export default StatusLight
