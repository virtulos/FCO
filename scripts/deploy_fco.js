const { utils } = require("ethers");
const { ethers } = require("hardhat");

// npx hardhat run --network hardhat scripts/deploy_fco.js
// npx hardhat run --network bscTest scripts/deploy_fco.js
// npx hardhat run --network goerli scripts/deploy_fco.js
// npx hardhat run --network polygonMumbai scripts/deploy_fco.js

// config deploy arguments
// token
const name = 'FANATICO'
const symbol = 'FCO'
const ADMIN_MULTISIG_WALLET_ADDRESS = '0xb57624fAB624b4A7A6B46217d56D7faBC4d37f38'

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

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
