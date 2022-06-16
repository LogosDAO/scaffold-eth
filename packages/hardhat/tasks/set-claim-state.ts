import '@nomiclabs/hardhat-web3'
import { task } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'
import { Membership, Membership__factory } from 'typechain'

task('set-claim-state', 'Set claim state for contract')
    .addParam<string>('contract', 'Contract Address')
    .addParam<string>('pub', 'pub enabled')
    .addParam<string>('allowlist', 'allowlist enabled')
    .setAction(async (taskArgs, { ethers }) => {
        const factory = (await ethers.getContractFactory('Membership')) as Membership__factory

        const account = (await ethers.getSigners())[0]

        const contract = new ethers.Contract(taskArgs.contract, factory.interface, account) as Membership

        const tx = await contract.connect(account).setClaimState(taskArgs.allowlist === 'true', taskArgs.pub === 'true')

        console.log(`Transaction Hash: ${tx.hash}`)

        await tx.wait(2)
        console.log('Transaction confirmed')
    })
