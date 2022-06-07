import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers } from 'hardhat'
import { Membership, Membership__factory } from '../typechain'
import { ContractTransaction } from 'ethers'
import signWhitelist from '../util/signWhitelist'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

chai.use(solidity)
const { expect } = chai

const config = {
    contractUri: 'placeholder.json',
    baseUri: 'placeholder.json',
    name: 'Tier 1',
    symbol: 'T1',
    price: ethers.utils.parseEther('1'),
    limitPerPurchase: 1,
    limitPerAddress: 2,
    maxSupply: 50,
}

const errorMessages = {
    maxSupply: 'MaxSupplyExceeded()',
    claimLimit: 'ClaimLimitExceeded()',
    allowListDisabled: 'AllowlistDisabled()',
    publicDisabled: 'PublicDisabled()',
    notOwner: 'Ownable: caller is not the owner',
    invalidSig: 'Invalid Signature',
}

const zeroAddress = '0x0000000000000000000000000000000000000000'

describe('Membership', function () {
    let accounts: SignerWithAddress[]

    let passContract: Membership
    let passFactory: Membership__factory

    let chainId: number

    this.beforeAll(async function () {
        accounts = await ethers.getSigners()
        const network = await ethers.provider.getNetwork()
        chainId = network.chainId
        passFactory = (await ethers.getContractFactory('Membership', accounts[0])) as Membership__factory
    })

    beforeEach(async function () {
        passContract = await passFactory.deploy(
            config.name,
            config.symbol,
            config.contractUri,
            config.baseUri,
            config.limitPerPurchase,
            config.limitPerAddress,
            config.maxSupply
        )
    })

    describe('setup', function () {
        it('Sets metadata', async function () {
            expect(await passContract.name()).to.equal(config.name)
            expect(await passContract.symbol()).to.equal(config.symbol)
            expect(await passContract.baseURI()).to.equal(config.baseUri)
            expect(await passContract.contractURI()).to.equal(config.contractUri)
            expect(await passContract.limitPerAddress()).to.equal(config.limitPerAddress)
            expect(await passContract.limitPerPurchase()).to.equal(config.limitPerPurchase)
            expect(await passContract.maxSupply()).to.equal(50)
            expect(await passContract.totalSupply()).to.equal(0)
            expect(await passContract.owner()).to.equal(accounts[0].address)
            expect(await passContract.publicEnabled()).to.equal(false)
            expect(await passContract.allowlistEnabled()).to.equal(false)
        })
    })

    describe('Minting reserve', function () {
        it('Allows owner to mint unlimited tokens under max supply', async function () {
            await passContract.mintReserve(10, accounts[1].address)
            expect(await passContract.totalSupply()).to.equal(10)
            expect(await passContract.balanceOf(accounts[1].address)).to.equal(10)
        })

        it('Does not allow owner to mint over max supply', async function () {
            await expect(passContract.mintReserve(51, accounts[1].address)).to.be.revertedWith(errorMessages.maxSupply)
        })

        it('Does not allow anyone else to mint reserve', async function () {
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintReserve(1, accounts[1].address)).to.be.revertedWith(errorMessages.notOwner)
        })
    })

    describe('Minting allow list', function () {
        this.beforeEach(async function () {
            await passContract.setClaimState(true, false)
        })
        it('Allows anyone to mint if on allowlist', async function () {
            const auth = await signWhitelist(config.name, chainId, passContract.address, accounts[0], accounts[1].address, 101)
            passContract = await passContract.connect(accounts[1])
            await passContract.mintAllowList(1, 101, auth)
            expect(await passContract.totalSupply()).to.equal(1)
            expect(await passContract.ownerOf(0)).to.equal(accounts[1].address)
        })

        it('Fails if submitted by someone else', async function () {
            const auth = await signWhitelist(config.name, chainId, passContract.address, accounts[0], accounts[1].address, 101)
            passContract = await passContract.connect(accounts[2])
            await expect(passContract.mintAllowList(1, 101, auth)).to.be.revertedWith(errorMessages.invalidSig)
        })
    })

    describe('Minting public', function () {
        this.beforeEach(async function () {
            await passContract.setClaimState(false, true)
        })
        it('Allows anyone to mint if public enabled', async function () {
            passContract = await passContract.connect(accounts[1])
            await passContract.mintPublic(1)
            expect(await passContract.totalSupply()).to.equal(1)
            expect(await passContract.ownerOf(0)).to.equal(accounts[1].address)
        })
    })

    // Supports interface
})
