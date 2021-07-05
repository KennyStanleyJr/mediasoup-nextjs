import Image from 'next/image'

const Footer = () => {
    return (
        <footer className="flex items-center justify-center w-full h-24 border-t">
            <a
                href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
                target="_blank"
                rel="noopener noreferrer"
            >
                Powered by{' '}
                <span className="h-4 ml-2">
                    <Image
                        src="/vercel.svg"
                        alt="Vercel Logo"
                        width={72}
                        height={16}
                    />
                </span>
            </a>
        </footer>
    )
}

export default Footer
