import '@nomiclabs/hardhat-web3'
import { task } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'
import { randomBytes } from 'crypto'
const fs = require('fs')
import * as csv from '@fast-csv/parse'

import signWhitelist from '../util/signWhitelist'

const saveMetadata = (outputdir: string, auths: any) => {
    fs.writeFileSync(`${outputdir}/auths.json`, JSON.stringify(auths))
}
const generateNonce = async () => {
    const buffer = await randomBytes(4)
    return Number('0x' + buffer.toString('hex'))
}
task('generate-allowlist', 'Generate Allow list signatures')
    .addParam<string>('name', 'Token name')
    .addParam<string>('inputcsv', 'CSV with list of addresses')
    .addParam<string>('contract', 'contract address')
    .addParam<string>('output', 'output dir')
    .setAction(async (taskArgs, hre) => {
        const account = (await hre.ethers.getSigners())[0]

        const addresses: string[] = []
        const myPromise = new Promise((resolve, reject) => {
            fs.createReadStream(taskArgs.inputcsv)
                .pipe(csv.parse({ headers: true }))
                .on('error', (error: any) => console.error(error))
                .on('data', async (row: { [key: string]: string }) => {
                    // console.log({row, act: row.ActID, scene: row.SceneId})
                    const address = row['Addresses']
                    addresses.push(address)
                })
                .on('end', (rowCount: any) => {
                    console.log(`Parsed ${rowCount} rows`)
                    resolve('done')
                })
        })

        await myPromise

        const provider = hre.ethers.provider
        const network = await provider.getNetwork()
        const chainId = network.chainId

        const auths: { [key: string]: any } = {}

        for (let index = 0; index < addresses.length; index++) {
            const address = addresses[index]
            const nonce = await generateNonce()
            const auth = await signWhitelist(taskArgs.name, chainId, taskArgs.contract, account, address, nonce)
            auths[address] = { signature: auth, nonce }
        }

        saveMetadata(taskArgs.output, auths)
    })
