import Card from './Card'

export type cardType = {
    heading: string
    subHeading: string
    href: string
}

export type cardsType = cardType[]

const Cards = () => {
    const cardsData: cardsType = [
        {
            heading: 'Documentation',
            subHeading:
                'Find in-depth information about Next.js features and API.',
            href: 'https://nextjs.org/docs',
        },
        {
            heading: 'Learn',
            subHeading:
                'Learn about Next.js in an interactive course with quizzes!',
            href: 'https://nextjs.org/learn',
        },
        {
            heading: 'Examples',
            subHeading:
                'Discover and deploy boilerplate example Next.js projects.',
            href: 'https://github.com/vercel/next.js/tree/master/examples',
        },
        {
            heading: 'Deploy',
            subHeading:
                'Instantly deploy your Next.js site to a public URL with Vercel.',
            href: 'https://vercel.com/new?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app',
        },
    ]

    return (
        <>
            {cardsData.map((data: cardType) => (
                <Card key={data.heading} {...data} />
            ))}
        </>
    )
}

export default Cards
