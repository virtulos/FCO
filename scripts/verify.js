require('dotenv').config({path: __dirname + '/.env'})

// npx hardhat run --network BSCTestnet scripts/verify.js
// npx hardhat run --network goerli scripts/verify.js
// npx hardhat run --network polygonMumbai scripts/verify.js

// put same arguments as for deploy !!!
const name = 'FANATICO'
const symbol = 'FCO'
const ADMIN_MULTISIG_WALLET_ADDRESS = process.env.ADMIN_MULTISIG_WALLET_ADDRESS
const FCO_ADDRESS = '0xBC932A7dB7F672610e3AF7268113aDB991F53534' // use address from deploy !!!
const LUB_AUCTION_ADDRESS = '0xed91eC514bfa4D25beA93aE37d6C3c251C4967A8' // use address from deploy !!!

async function main() {
    console.log("--------------------------------VERIFY----------------------------------")

    console.log("FCO")
    await hre.run("verify:verify", {
        address: FCO_ADDRESS,
        constructorArguments: [
            name,
            symbol,
            ADMIN_MULTISIG_WALLET_ADDRESS
        ],
    });

    console.log("AUCTION")
    await hre.run("verify:verify", {
        address: LUB_AUCTION_ADDRESS,
        constructorArguments: [
            FCO_ADDRESS
        ],
    });
}

main().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});