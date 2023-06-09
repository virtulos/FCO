require('dotenv').config({path: __dirname + '/.env'})
const {ethers} = require("hardhat");

// npx hardhat run --network BSCTestnet scripts/deploy.js
// npx hardhat run --network goerli scripts/deploy.js
// npx hardhat run --network polygonMumbai scripts/deploy.js

// config deploy arguments
const name = 'FANATICO'
const symbol = 'FCO'
const ADMIN_MULTISIG_WALLET_ADDRESS = process.env.ADMIN_MULTISIG_WALLET_ADDRESS

async function main() {
    console.log("--------------------------------DEPLOY----------------------------------")

    const FCO = await ethers.getContractFactory("FCO");
    const fco = await FCO.deploy(name, symbol, ADMIN_MULTISIG_WALLET_ADDRESS);
    await fco.deployed();
    console.log('FCO', fco.address)

    // mock
    const LubAuction = await ethers.getContractFactory("LubAuction");
    const auction = await LubAuction.deploy(fco.address);
    await auction.deployed();
    console.log('LubAuction', auction.address)

    // mock
    const FlashBorrower = await ethers.getContractFactory("FlashBorrower");
    const flashBorrower = await FlashBorrower.deploy();
    await flashBorrower.deployed();
    console.log('FlashBorrower', flashBorrower.address)
}

main().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});