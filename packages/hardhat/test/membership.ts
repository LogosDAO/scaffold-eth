import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Membership, Membership__factory } from '../typechain'
import signWhitelist from '../util/signWhitelist'
import { makeInterfaceId } from '@openzeppelin/test-helpers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

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
    sigUsed: 'signature used',
    tokenDNE: 'URIQueryForNonexistentToken()',
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

        it('Fails if exceeds max supply', async function () {
            const auth = await signWhitelist(config.name, chainId, passContract.address, accounts[0], accounts[1].address, 101)
            await passContract.mintReserve(config.maxSupply, accounts[1].address)
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintAllowList(1, 101, auth)).to.be.revertedWith(errorMessages.maxSupply)
        })

        it('Fails if exceeds max per transaction', async function () {
            const auth = await signWhitelist(config.name, chainId, passContract.address, accounts[0], accounts[1].address, 101)
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintAllowList(2, 101, auth)).to.be.revertedWith(errorMessages.claimLimit)
        })

        it('Fails if exceeds max per address', async function () {
            const auth = await signWhitelist(config.name, chainId, passContract.address, accounts[0], accounts[1].address, 101)
            const auth2 = await signWhitelist(config.name, chainId, passContract.address, accounts[0], accounts[1].address, 102)
            const auth3 = await signWhitelist(config.name, chainId, passContract.address, accounts[0], accounts[1].address, 103)
            passContract = await passContract.connect(accounts[1])
            await passContract.mintAllowList(1, 101, auth)
            await passContract.mintAllowList(1, 102, auth2)
            await expect(passContract.mintAllowList(1, 103, auth3)).to.be.revertedWith(errorMessages.claimLimit)
        })

        it('Fails if submitted by someone else', async function () {
            const auth = await signWhitelist(config.name, chainId, passContract.address, accounts[0], accounts[1].address, 101)
            passContract = await passContract.connect(accounts[2])
            await expect(passContract.mintAllowList(1, 101, auth)).to.be.revertedWith(errorMessages.invalidSig)
        })

        it('Fails if invalid name', async function () {
            const auth = await signWhitelist('invalid', chainId, passContract.address, accounts[0], accounts[1].address, 101)
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintAllowList(1, 101, auth)).to.be.revertedWith(errorMessages.invalidSig)
        })

        it('Fails if invalid chain Id', async function () {
            const auth = await signWhitelist(config.name, 1, passContract.address, accounts[0], accounts[1].address, 101)
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintAllowList(1, 101, auth)).to.be.revertedWith(errorMessages.invalidSig)
        })

        it('Fails if invalid contract address', async function () {
            const auth = await signWhitelist(config.name, chainId, accounts[0].address, accounts[0], accounts[1].address, 101)
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintAllowList(1, 101, auth)).to.be.revertedWith(errorMessages.invalidSig)
        })

        it('Fails if invalid nonce', async function () {
            const auth = await signWhitelist(config.name, chainId, passContract.address, accounts[0], accounts[1].address, 102)
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintAllowList(1, 101, auth)).to.be.revertedWith(errorMessages.invalidSig)
        })

        it('Fails if unauthorized signer', async function () {
            const auth = await signWhitelist(config.name, chainId, passContract.address, accounts[1], accounts[1].address, 101)
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintAllowList(1, 101, auth)).to.be.revertedWith(errorMessages.invalidSig)
        })

        it('Fails if signature reused', async function () {
            const auth = await signWhitelist(config.name, chainId, passContract.address, accounts[0], accounts[1].address, 101)
            passContract = await passContract.connect(accounts[1])
            await passContract.mintAllowList(1, 101, auth)
            await expect(passContract.mintAllowList(1, 101, auth)).to.be.revertedWith(errorMessages.sigUsed)
        })

        it('Fails if allow list disabled', async function () {
            await passContract.setClaimState(false, false)
            const auth = await signWhitelist(config.name, chainId, passContract.address, accounts[0], accounts[1].address, 101)
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintAllowList(1, 101, auth)).to.be.revertedWith(errorMessages.allowListDisabled)
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

        it('Fails if exceeds max supply', async function () {
            await passContract.mintReserve(config.maxSupply, accounts[1].address)
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintPublic(1)).to.be.revertedWith(errorMessages.maxSupply)
        })

        it('Fails if exceeds max per transaction', async function () {
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintPublic(2)).to.be.revertedWith(errorMessages.claimLimit)
        })

        it('Fails if exceeds max per address', async function () {
            passContract = await passContract.connect(accounts[1])
            await passContract.mintPublic(1)
            await passContract.mintPublic(1)
            await expect(passContract.mintPublic(1)).to.be.revertedWith(errorMessages.claimLimit)
        })

        it('Fails if pub mint disabled', async function () {
            await passContract.setClaimState(false, false)
            passContract = await passContract.connect(accounts[1])
            await expect(passContract.mintPublic(1)).to.be.revertedWith(errorMessages.publicDisabled)
        })
    })

    describe('View functions', function () {
        this.beforeEach(async function () {
            await passContract.setClaimState(false, true)
        })
        it('Exposes name and symbol', async function () {
            expect(await passContract.name()).to.equal(config.name)
            expect(await passContract.symbol()).to.equal(config.symbol)
        })
        it('Exposes total supply', async function () {
            expect((await passContract.totalSupply()).toNumber()).to.equal(0)
            await passContract.mintPublic(1)
            await passContract.mintPublic(1)

            expect((await passContract.totalSupply()).toNumber()).to.equal(2)
        })

        it('Formats URI properly with concatenation', async function () {
            await passContract.mintPublic(1)
            await passContract.mintPublic(1)

            expect(await passContract.tokenURI(0)).to.equal(config.baseUri + '0.json')
            expect(await passContract.tokenURI(1)).to.equal(config.baseUri + '1.json')
        })

        it('Does not return URI for non existent token', async function () {
            await expect(passContract.tokenURI(1)).to.be.revertedWith(errorMessages.tokenDNE)
        })
        it('Supports interface', async function () {
            const erc721InterfaceId = makeInterfaceId.ERC165([
                'balanceOf(address)',
                'ownerOf(uint256)',
                'safeTransferFrom(address,address,uint256)',
                'transferFrom(address,address,uint256)',
                'approve(address,uint256)',
                'getApproved(uint256)',
                'setApprovalForAll(address,bool)',
                'isApprovedForAll(address,address)',
                'safeTransferFrom(address,address,uint256,bytes)',
            ])
            expect(await passContract.supportsInterface(erc721InterfaceId)).to.equal(true)
        })
        it('Fails if interface is wrong', async function () {
            const erc721InterfaceId = makeInterfaceId.ERC165([
                'ownerOf(uint256)',
                'safeTransferFrom(address,address,uint256)',
                'transferFrom(address,address,uint256)',
                'approve(address,uint256)',
                'getApproved(uint256)',
                'setApprovalForAll(address,bool)',
                'isApprovedForAll(address,address)',
                'safeTransferFrom(address,address,uint256,bytes)',
            ])
            expect(await passContract.supportsInterface(erc721InterfaceId)).to.equal(false)
        })
    })

    describe('Admin config', function () {
        it('Allows owner to set the base URI', async function () {
            expect(await passContract.baseURI()).to.equal(config.baseUri)
            await passContract.setBaseURI('somethingelse')
            expect(await passContract.baseURI()).to.equal('somethingelse')
        })

        it('Does not allow anyone else to set base URI', async function () {
            passContract = passContract.connect(accounts[1])
            await expect(passContract.setBaseURI('somethingelse')).to.be.revertedWith(errorMessages.notOwner)
        })

        it('Allows owner to set the contract URI', async function () {
            expect(await passContract.contractURI()).to.equal(config.contractUri)
            await passContract.setContractURI('somethingelse')
            expect(await passContract.contractURI()).to.equal('somethingelse')
        })

        it('Does not allow anyone else to set contract URI', async function () {
            passContract = passContract.connect(accounts[1])
            await expect(passContract.setContractURI('somethingelse')).to.be.revertedWith(errorMessages.notOwner)
        })

        it('Allows owner to set the limit per address', async function () {
            expect(await passContract.limitPerAddress()).to.equal(config.limitPerAddress)
            await passContract.setLimitPerAddress(3)
            expect(await passContract.limitPerAddress()).to.equal(3)
        })

        it('Does not allow anyone else to set limit per address', async function () {
            passContract = passContract.connect(accounts[1])
            await expect(passContract.setLimitPerAddress(3)).to.be.revertedWith(errorMessages.notOwner)
        })

        it('Allows owner to set the claim state', async function () {
            expect(await passContract.allowlistEnabled()).to.equal(false)
            expect(await passContract.publicEnabled()).to.equal(false)
            await passContract.setClaimState(true, false)
            expect(await passContract.allowlistEnabled()).to.equal(true)
            expect(await passContract.publicEnabled()).to.equal(false)
            await passContract.setClaimState(true, true)
            expect(await passContract.allowlistEnabled()).to.equal(true)
            expect(await passContract.publicEnabled()).to.equal(true)
            await passContract.setClaimState(false, true)
            expect(await passContract.allowlistEnabled()).to.equal(false)
            expect(await passContract.publicEnabled()).to.equal(true)
        })

        it('Does not allow anyone else to set claim state', async function () {
            passContract = passContract.connect(accounts[1])
            await expect(passContract.setClaimState(true, true)).to.be.revertedWith(errorMessages.notOwner)
        })
    })

    // Supports interface
})
