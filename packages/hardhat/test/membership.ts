import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers } from 'hardhat'
import { Membership, Membership__factory, MembershipSummoner, MembershipSummoner__factory } from '../typechain'
import { ContractTransaction } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers'

chai.use(solidity)
const { expect } = chai

const config = {
    contractUri: 'placeholder.json',
    baseUri: 'placeholder.json',
    name: 'Tier 1',
    symbol: 'T1',
    price: ethers.utils.parseEther('1'),
    limitPerPurchase: 2,
    maxSupply: 50,
}

const zeroAddress = '0x0000000000000000000000000000000000000000'
const sinkAddress = '0x000000000000000000000000000000000000dEaD'

const getNewAddress = async (tx: ContractTransaction): Promise<string> => {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash)
    // console.log({logs: receipt.logs})
    const summonAbi = ['event SummonComplete(address indexed newContract,string name, string symbol, address summoner)']
    const iface = new ethers.utils.Interface(summonAbi)
    const log = iface.parseLog(receipt.logs[receipt.logs.length - 1])
    const { newContract } = log.args
    return newContract
}

describe('Membership', function () {
    let accounts: SignerWithAddress[]

    let summoner: MembershipSummoner
    let passContract: Membership
    let passFactory: Membership__factory

    let chainId: number

    this.beforeAll(async function () {
        accounts = await ethers.getSigners()
        const network = await ethers.provider.getNetwork()
        chainId = network.chainId
        passFactory = (await ethers.getContractFactory('Membership', accounts[0])) as Membership__factory
        const templateContract = await passFactory.deploy()

        const summonerContract = (await ethers.getContractFactory('MembershipSummoner', accounts[0])) as MembershipSummoner__factory
        summoner = await summonerContract.deploy(templateContract.address)
    })

    beforeEach(async function () {
        const tx = await summoner.summonMembership(
            config.name,
            config.symbol,
            config.contractUri,
            config.baseUri,
            config.price,
            config.limitPerPurchase,
            config.maxSupply,
            sinkAddress
        )

        const passContractAddress = await getNewAddress(tx)
        passContract = await passFactory.attach(passContractAddress)
    })

    describe('setup', function () {
        it('Does not allow setup to be called multiple times', async function () {
            await expect(
                passContract.setUp(
                    config.name,
                    config.symbol,
                    config.contractUri,
                    config.baseUri,
                    accounts[1].address,
                    config.price,
                    config.limitPerPurchase,
                    config.maxSupply,
                    sinkAddress
                )
            ).to.be.revertedWith('Initializable: contract is already initialized')
        })

        it('Sets metadata', async function () {
            expect(await passContract.name()).to.equal(config.name)
            expect(await passContract.symbol()).to.equal(config.symbol)
            expect(await passContract.baseURI()).to.equal(config.baseUri)
            expect(await passContract.contractURI()).to.equal(config.contractUri)
            expect(await passContract.ethSink()).to.equal(sinkAddress)
            expect(await passContract.maxSupply()).to.equal(50)
            expect(await passContract.totalSupply()).to.equal(0)
            expect(await passContract.owner()).to.equal(accounts[0].address)
            
            // TODO rest
        })
    })


    // Supports interface
})
