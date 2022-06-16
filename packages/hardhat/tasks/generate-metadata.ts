import '@nomiclabs/hardhat-web3'
import { task } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'
const fs = require('fs')

const saveMetadata = (outputdir: string, _metadata: any, edition: string) => {
    fs.writeFileSync(`${outputdir}/${edition}.json`, JSON.stringify(_metadata))
}
task('generate-metadata', 'Generate metadata files')
    .addParam<string>('name', 'Token name')
    .addParam<string>('desc', 'Token description')
    .addParam<string>('qty', 'Amount')
    .addParam<string>('start', 'Token ID start')
    .addParam<string>('max', 'Total supply')
    .addParam<string>('output', 'output folder')
    .addParam<string>('image', 'still image')
    .addParam<string>('animation', 'animation')
    .setAction(async (taskArgs, { ethers }) => {
      
        
        
    for (let index = 0; index < taskArgs.qty; index++) {
        const tokenId = parseInt(taskArgs.start) + index
        const metadata = {
            name: taskArgs.name,
            description: taskArgs.desc,
            image: taskArgs.image,
            animation_url: taskArgs.animation,
            // external_url: taskArgs.ws,
            attributes: [
                {
                    trait_type: 'Token Number',
                    value: `${tokenId} of ${taskArgs.max}`
                },
            ],
        }
        
        saveMetadata(taskArgs.output, metadata, tokenId.toString())
    }

    })
