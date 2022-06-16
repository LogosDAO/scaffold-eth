import '@nomiclabs/hardhat-web3'
import { task } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'
const fs = require('fs')

const saveMetadata = (outputdir: string, _metadata: any, edition: string) => {
    fs.writeFileSync(`${outputdir}/${edition}.json`, JSON.stringify(_metadata))
}
task('generate-metadata', 'Generate metadata files')
    .addParam<string>('qty', 'Amount')
    .addParam<string>('start', 'Token ID start')
    .addParam<string>('max', 'Total supply')
    .addParam<string>('output', 'output folder')
    .setAction(async (taskArgs, { ethers }) => {
        for (let index = 0; index < taskArgs.qty; index++) {
            const tokenId = parseInt(taskArgs.start) + index
            const metadata = {
                name: 'VCA Genesis Membership',
                description: 'VerticalCrypto Art genesis community access token. Members include our resident artists, mentors, collectors, early supporters, advisors, team, friends, like-minded individuals, pioneers of the NFT community and thought-leaders.',
                image: 'ipfs://QmSNgXwdHQ1SwHK42TEaLZM8zVV9zjZxNu3zzcc7Zk7rNr',
                animation_url: 'ipfs://QmYJxtY5jLsS2mrEjYt6Wv99p5XB2PNTsGZvdgEnp87Q2s',
                external_url: 'https://vcamembership.verticalcrypto.art/',
                attributes: [
                    {
                        trait_type: 'Token Number',
                        value: `${tokenId + 1} of ${taskArgs.max}`,
                    },
                    { trait_type: 'Artist', value: 'Linda Dounia' },
                ],
            }

            saveMetadata(taskArgs.output, metadata, tokenId.toString())
        }
    })
