// npx hardhat run --network bscTest scripts/verify_fco.js
// npx hardhat run --network goerli scripts/verify_fco.js
// npx hardhat run --network polygonMumbai scripts/verify_fco.js

// put same arguments as for deploy !!!
const name = 'FANATICO'
const symbol = 'FCO'
const ADMIN_MULTISIG_WALLET_ADDRESS = '0xb57624fAB624b4A7A6B46217d56D7faBC4d37f38'
const FCO_ADDRESS = '0xBC932A7dB7F672610e3AF7268113aDB991F53534'
const LUB_AUCTION_ADDRESS = '0xed91eC514bfa4D25beA93aE37d6C3c251C4967A8'

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

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });