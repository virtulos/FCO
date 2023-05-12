const {utils} = require("ethers");
const {ethers} = require("hardhat");


// config deploy arguments
const name = 'FANATICO'
const symbol = 'FCO'
const initialMint = utils.parseEther('10')

async function main() {
    console.log("--------------------------------DEPLOY----------------------------------")

    const contractFactory = await ethers.getContractFactory("FANATICO");
    const token = await contractFactory.deploy(name, symbol, initialMint);
    await token.deployed();

    console.log('Deployed at: ', token.address)
}

main().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});