export type HeaderTypes = {
    title: string
    subtitle: string
    path: string
}

const Header = (headerData: HeaderTypes) => {
    return (
        <>
            {' '}
            <h1 className="text-6xl font-bold">
                {headerData.title}{' '}
                <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">😏</a>
            </h1>
            <p className="mt-6 text-2xl">
                {headerData.subtitle}{' '}
                <code className="bg-gray-100 p-2 ml-1 font-mono text-2xl rounded-md">
                    {headerData.path}
                </code>
            </p>
        </>
    )
}

export default Header
