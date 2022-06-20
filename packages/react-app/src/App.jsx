import "antd/dist/antd.css";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import React, { useCallback, useEffect, useState } from "react";
import "./App.css";
import "./bootstrap.min.css";
import heroImage from "./img/header-img-residency-test.png";
import logoVCA from "./img/logo.svg";
import logoTwitter from "./img/twitter.svg";
import logoDiscord from "./img/discord.svg";
import logoEtherscan from "./img/etherscan.svg";
import Accordion from "react-bootstrap/Accordion";
import Container from "react-bootstrap/Container";
import { Account, FaucetHint, NetworkDisplay, NetworkSwitch } from "./components";
import { ALCHEMY_KEY, NETWORKS } from "./constants";
import externalContracts from "./contracts/external_contracts";
// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import { Transactor, Web3ModalSetup } from "./helpers";
import { useStaticJsonRPC } from "./hooks";
import "bootstrap/dist/css/bootstrap.min.css";

import Modal from "./components/Modal/Modal";
import ModalEmail from "./components/Modal/ModalEmail";
import ModalToc from "./components/Modal/ModalToc";

const auths = require("./auths.json");

const { ethers } = require("ethers");
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/scaffold-eth/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Alchemy.com & Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const initialNetwork = NETWORKS.mainnet; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = false;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = false; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

// 🛰 providers
const providers = [
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
  "https://rpc.scaffoldeth.io:48544",
];

function App(props) {
  const [emailAddress, setEmailAddress] = useState("");

  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = [initialNetwork.name, "mainnet", "rinkeby"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);

  const targetNetwork = NETWORKS[selectedNetwork];

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : targetNetwork.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🛰 providers
  if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  // const contractConfig = useContractConfig();

  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);

  console.log({ contractConfig });
  console.log({ writeContracts });

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader(mainnetContracts, "DAI", "balanceOf", [
    "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  ]);

  // keep track of a variable from the contract in the local React state:

  const publicEnabled = useContractReader(readContracts, "Membership", "publicEnabled");
  const allowlistEnabled = useContractReader(readContracts, "Membership", "allowlistEnabled");
  const mintSupply = useContractReader(readContracts, "Membership", "maxSupply");
  const minted = useContractReader(readContracts, "Membership", "totalSupply");
  const connectedUserBalance = useContractReader(readContracts, "Membership", "balanceOf", [
    address || "0x0000000000000000000000000000000000000000",
  ]);
  const connectedUserClaimed = useContractReader(readContracts, "Membership", "claimed", [
    address || "0x0000000000000000000000000000000000000000",
  ]);

  console.log({ mintSupply, minted, connectedUserBalance });

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("💵 yourMainnetDAIBalance", myMainnetDAIBalance);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
    localChainId,
    myMainnetDAIBalance,
  ]);

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  window.localStorage.setItem("theme", "dark");
  const disableAllowlistButton =
    auths[address] === undefined ||
    !allowlistEnabled ||
    connectedUserClaimed >= 1 ||
    (mintSupply && minted && mintSupply.eq(minted));

  const disablePublicButton =
    !address || !publicEnabled || connectedUserClaimed >= 2 || (mintSupply && minted && mintSupply.eq(minted));

  console.log({ disableAllowlistButton, disablePublicButton });

  // Modal
  const [modalOpen, setModalOpen] = useState({
    bool: false,
  });

  const [modalOpenEmail, setModalOpenEmail] = useState({
    bool: false,
  });

  const [OpenModalToc, setOpenModalToc] = useState({
    bool: false,
  });

  // API for newsletter
  const baseURL = "https://api-vca-dev-00.azurewebsites.net/entries";
  // const [postResult, setPostResult] = useState(null);
  // const fortmatResponse = res => {
  //   return JSON.stringify(res, null, 2);
  // };

  async function postData(address) {
    const postData = {
      walletId: address,
      emailAddress: emailAddress,
    };

    try {
      const res = await fetch(`${baseURL}`, {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });
      if (!res.ok) {
        const message = `An error has occured: ${res.status} - ${res.statusText}`;
        alert(message);
      }
      const data = await res.json();

      console.log(data);
      setModalOpenEmail({ bool: true });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <NetworkDisplay
        NETWORKCHECK={NETWORKCHECK}
        localChainId={localChainId}
        selectedChainId={selectedChainId}
        targetNetwork={targetNetwork}
        logoutOfWeb3Modal={logoutOfWeb3Modal}
        USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
      />

      <div className="viewport-header">
        <img className="bg-vid" src={heroImage} alt="" />

        <div className="mint-window">
          <h1>VCA MEMBERSHIP</h1>
          <h2>Mint your membership pass now</h2>
          {address && <h2>{`${address} is ${auths[address] ? "" : "not "} on the allow list`}</h2>}
          <div className="mint-info">
            <div className="mint-supply">
              <h2>Mint Supply</h2>
              <p>{mintSupply ? mintSupply.toString() : "?"}</p>
            </div>

            <div className="mint-supply-remaining">
              <h2>Remaining Supply</h2>
              <p>{mintSupply && minted ? mintSupply.sub(minted).toString() : "?"}</p>
            </div>

            <div className="mint-supply-remaining">
              <h2>Your balance</h2>
              <p>{connectedUserClaimed ? connectedUserClaimed.toString() : "0"}</p>
            </div>
          </div>

          <div className="mint-btns">
            <button
              disabled={disablePublicButton}
              onClick={async () => {
                /* look how you call setPurpose on your contract: */
                /* notice how you pass a call back for tx updates too */
                const result = tx(writeContracts.Membership.mintPublic(1), update => {
                  console.log("📡 Transaction Update:", update);
                  if (update && (update.status === "confirmed" || update.status === 1)) {
                    console.log(" 🍾 Transaction " + update.hash + " finished!");
                    console.log(
                      " ⛽️ " +
                        update.gasUsed +
                        "/" +
                        (update.gasLimit || update.gas) +
                        " @ " +
                        parseFloat(update.gasPrice) / 1000000000 +
                        " gwei",
                    );
                  }
                });
                console.log("awaiting metamask/web3 confirm result...", result);
                console.log(await result);
              }}
            >
              Mint public!
            </button>
            <button
              disabled={disableAllowlistButton}
              onClick={async () => {
                /* look how you call setPurpose on your contract: */
                /* notice how you pass a call back for tx updates too */
                const result = tx(
                  writeContracts.Membership.mintAllowList(1, auths[address].nonce, auths[address].signature),
                  update => {
                    console.log("📡 Transaction Update:", update);
                    if (update && (update.status === "confirmed" || update.status === 1)) {
                      console.log(" 🍾 Transaction " + update.hash + " finished!");
                      console.log(
                        " ⛽️ " +
                          update.gasUsed +
                          "/" +
                          (update.gasLimit || update.gas) +
                          " @ " +
                          parseFloat(update.gasPrice) / 1000000000 +
                          " gwei",
                      );
                    }
                  },
                );
                console.log("awaiting metamask/web3 confirm result...", result);
                console.log(await result);
              }}
            >
              Mint allow list!
            </button>
          </div>

          {/* <button className="testModal" onClick={() => setModalOpen({ bool: true })}>
            Test Modal
          </button> */}
        </div>
      </div>

      {connectedUserBalance && connectedUserBalance.gt(0) && (
        <div className="register-box">
          <h3>Register to receive updates on your membership benefits</h3>

          <input
            id="register-input"
            type="text"
            required
            placeholder="your email@email.com"
            value={emailAddress}
            onChange={e => setEmailAddress(e.target.value)}
          />
          <button onClick={() => postData(address)}>Submit</button>
        </div>
      )}

      <div className="desc-proj">
        <h1>Membership F.A.Q</h1>

        <Container fluid className="faq-container">
          <Accordion>
            <Accordion.Item eventKey="0">
              <Accordion.Header>1. What is VerticalCrypto Art (VCA)?</Accordion.Header>
              <Accordion.Body>
                VerticalCrypto Art is a curatorial studio and platform for NFT art & culture. Founded in May of 2020, we
                curate art, produce exhibitions, have our own auction house supporting Tezos and Ethereum, launched the
                first ever web3 online residency for artists and work with some of the most well-known projects, brands,
                artists and partners whilst furthering the web3 art & culture ecosystem through thoughtful curation,
                content and community.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="1">
              <Accordion.Header>2. What is the VCA Membership Token?</Accordion.Header>
              <Accordion.Body>
                The VCA membership token is an entry to the VCA community. Membership includes access to our private
                Discord, IRL events, early access to auctions & drops, and other exclusive content by the VCA community
                & beyond.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="2">
              <Accordion.Header>3. How can I claim it?</Accordion.Header>
              <Accordion.Body>
                The first claiming period is reserved to a curated list (allowlist) of VCA community members, friends,
                collectors and supporters. These include our resident artists, mentors, collectors, early supporters,
                advisors, team, friends, like-minded individuals, pioneers of the NFT community and thought-leaders. The
                second claiming period will be a public mint for anyone who would like to be a part of the VCA
                community.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="3">
              <Accordion.Header>4. When can I claim it?</Accordion.Header>
              <Accordion.Body>
                Allowlist curated list may claim from Thursday, June 16th at 5 pm BST for 72 hours. Public claiming
                period will start after the first allowlist period.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="4">
              <Accordion.Header>5. How much will it cost?</Accordion.Header>
              <Accordion.Body>This is a free mint (+gas cost).</Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="5">
              <Accordion.Header>6. What is the total supply?</Accordion.Header>
              <Accordion.Body>The genesis series will be capped at 1000 tokens.</Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="6">
              <Accordion.Header>7. How many can I mint?</Accordion.Header>
              <Accordion.Body>
                Each allowlist address can mint one token. Public mint is limited to 2 tokens per wallet, one token per
                transaction.
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="7">
              <Accordion.Header>8. How long is the membership valid for?</Accordion.Header>
              <Accordion.Body>
                The VCA Membership token is valid for a period of one year (1), after the NFTs are first distributed
                (i.e. the start of the mint).
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="8">
              <Accordion.Header>9. How can I access the VCA community?</Accordion.Header>
              <Accordion.Body>
                You can access the <a href="https://discord.gg/RRPdeFhaXc">VCA discord server </a>If you prefer to get
                notified via email you can submit your address in the form above. The email form is visible only after
                you connect your wallet and you hold a VCA Membership Token.
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Container>
      </div>

      <div className="footer">
        <p>2022 VCA Membership by VerticalCrypto Art. All Right Reserved.</p>
        <div className="socials">
          <p onClick={() => setOpenModalToc({ bool: true })}>Terms & Conditions</p>
        </div>
      </div>

      {/* modal */}

      {modalOpen.bool && <Modal setOpenModal={setModalOpen} />}
      {modalOpenEmail.bool && <ModalEmail setOpenModal={setModalOpenEmail} emailAddress={emailAddress} />}

      {OpenModalToc.bool && <ModalToc setOpenModalToc={setOpenModalToc} />}
      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}

      <div className="nav-bar">
        {USE_NETWORK_SELECTOR && (
          <div style={{ marginRight: 20 }}>
            <NetworkSwitch
              networkOptions={networkOptions}
              selectedNetwork={selectedNetwork}
              setSelectedNetwork={setSelectedNetwork}
            />
          </div>
        )}

        <div className="left-nav">
          <img className="logo-vca" src={logoVCA} alt="" />

          <div className="area-logo">
            <a href="https://twitter.com/verticalcrypto" target="_blank">
              <img className="logo-socials" src={logoTwitter} alt="" />
            </a>
            <a href="https://etherscan.io/address/0xf1E654e5cA32Bb4A0878568b2293ed072Fd91805" target="_blank">
              <img className="logo-etherscan" src={logoEtherscan} alt="" />
            </a>
            <a href="https://discord.gg/RRPdeFhaXc" target="_blank">
              <img className="logo-discord" src={logoDiscord} alt="" />
            </a>
          </div>
        </div>

        <Account
          useBurner={USE_BURNER_WALLET}
          address={address}
          localProvider={localProvider}
          userSigner={userSigner}
          mainnetProvider={mainnetProvider}
          price={price}
          web3Modal={web3Modal}
          loadWeb3Modal={loadWeb3Modal}
          logoutOfWeb3Modal={logoutOfWeb3Modal}
          blockExplorer={blockExplorer}
        />
      </div>
      {yourLocalBalance.lte(ethers.BigNumber.from("0")) && (
        <FaucetHint localProvider={localProvider} targetNetwork={targetNetwork} address={address} />
      )}
    </div>
  );
}

export default App;
