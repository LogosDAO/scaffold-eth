import { useContractReader } from "eth-hooks";
import { ethers } from "ethers";
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "antd";
import { utils } from "ethers";

const auths = require("../auths.json");

/**
 * web3 props can be passed from '../App.jsx' into your local view component for use
 * @param {*} yourLocalBalance balance on current network
 * @param {*} readContracts contracts from current chain already pre-loaded using ethers contract module. More here https://docs.ethers.io/v5/api/contract/contract/
 * @returns react component
 **/
function Home({ address, yourLocalBalance, readContracts, tx, writeContracts, publicEnabled, allowlistEnabled }) {
  // you can also use hooks locally in your component of choice
  // in this case, let's keep track of 'purpose' variable from our contract

  console.log({ publicEnabled, allowlistEnabled });

  return (
    <div>
      <div style={{ margin: 32 }}>
        <Button
          style={{ marginTop: 8 }}
          disabled={!address || !publicEnabled}
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
        </Button>
        <Button
          style={{ marginTop: 8 }}
          disabled={auths[address] === undefined || !allowlistEnabled}
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
        </Button>
      </div>
    </div>
  );
}

export default Home;
