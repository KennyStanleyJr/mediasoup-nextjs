import { cardType } from '../Cards'

const Card = (data: cardType) => {
    return (
        <a
            key={data.heading}
            href={data.href}
            className="p-6 mt-6 text-left border w-96 rounded-xl hover:text-blue-600 focus:text-blue-600"
        >
            <h3 className="text-2xl font-bold">{data.heading} &rarr;</h3>
            <p className="mt-4 text-xl">{data.subHeading}</p>
        </a>
    )
}

export default Card
