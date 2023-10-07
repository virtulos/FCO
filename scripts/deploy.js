const { utils, BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { promises: { writeFile } } = require("fs");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
// npx hardhat run --network hardhat scripts/deploy_upg.js
// npx hardhat run --network goerli scripts/deploy_upg.js
// npx hardhat run --network mainnet scripts/deploy_upg.js
// npx hardhat run --network polygonMumbai scripts/deploy_upg.js
// npx hardhat run --network local scripts/deploy_upg.js
// npx hardhat run --network vps scripts/deploy_upg.js


const bcConfig = require('../bcConfig.json');

async function main() {
    const chainIdHex = await network.provider.send('eth_chainId');
    const [deployer] = await ethers.getSigners();	
    const startBlock = await ethers.provider.getBlockNumber();

    const testers = [
        '0xb57624fAB624b4A7A6B46217d56D7faBC4d37f38',
        '0x1df2674903208dfa0590B7664Fa3B25da5009194',
        '0x434E7a149631553b61F757f9e425A8003C67ddb3',
        '0x1335453a46af7de08DB1F951B80C527F4eC05229',
        '0x492B65E856Dda06CcfbC232623E559cEA953d788',
        '0xac3a8be2D2AA85dC7AB4ca1cFB906eACdB708300',
        '0x242B39E000A1F6B509DAe48965D27eb93464F970',
        '0xb34A2dd7af31D9b26226A6eE380f34704FEd454F',
        '0xEE726BB6F45e27fffCa69c315d2653A919cF53EB',
        '0x0E5bc6c960184Dfa1a64768d240a8f9AdEb785Ab',
        '0x55c2AfB45089836a770025BE1A2099775ee9df23',        
        '0x2Cc75cA6D8198e2ad4930dCA721739E74660e9f5',
        '0xBC0f4f9f7C226D142263bb8e5C422fee69818e1e',
    ]

    //for (let i = 0; i < testers.length; i++) {
    //    const address = testers[i];
    //    await helpers.setBalance(address, utils.parseEther('10'));
    //}
    //return
    
    if (!bcConfig[chainIdHex]) bcConfig[chainIdHex] = {}

	console.log("--------------------------------DEPLOY----------------------------------")

    const Authority = await ethers.getContractFactory("Authority");       
    const authority = await upgrades.deployProxy(Authority)
    await authority.deployed();
    console.log('Authority: ', authority.address)
    bcConfig[chainIdHex].authority = {
		address: authority.address,
        abi: authority.interface.format(),
		startBlock,        
	}

    const EventEmitterHub = await ethers.getContractFactory("EventEmitterHub");    
    const eventEmitterHub = await upgrades.deployProxy(EventEmitterHub, [
        authority.address
    ])    
    await eventEmitterHub.deployed(); 
    console.log('EventEmitterHub: ', eventEmitterHub.address)
    bcConfig[chainIdHex].eventEmitterHub = {
		address: eventEmitterHub.address,
        abi: eventEmitterHub.interface.format(),
		startBlock
	}
    

    //const fco = await ethers.getContractAt("FCO", bcConfig[chainIdHex].fco.address, deployer);
    const signUpReward = utils.parseUnits('3', 18)
    const epochReward = utils.parseUnits('1', 18)
    const epochDuration = 60 * 60; 
    const lockDuration = epochDuration * 3;
    const FCO = await ethers.getContractFactory("FCOToken");    
    const fco = await upgrades.deployProxy(FCO, [
        authority.address,
        eventEmitterHub.address,
        'Fanatico', 
        'FCO', 
        signUpReward,
        epochReward,
        epochDuration,
        lockDuration,
    ]);
    await fco.deployed(); 
    console.log('FCO: ', fco.address)
    bcConfig[chainIdHex].fco = {
		address: fco.address,
        abi: fco.interface.format(),
		startBlock,
        config: {
            signUpReward: signUpReward.toString(),
            epochReward: epochReward.toString(),
            epochDuration,
            lockDuration
        }
	}
	
	const PublicationHub = await ethers.getContractFactory("PublicationHub");
	const fanaticoHub = await upgrades.deployProxy(PublicationHub, [
        authority.address,
        eventEmitterHub.address,
        deployer.address, 
		deployer.address,		
        'https://fanatico.virtulos.net/api/metadata/{id}',
        fco.address,
    ]);
	await fanaticoHub.deployed(); 
	console.log('FanaticoHub:   ', fanaticoHub.address)

    bcConfig[chainIdHex].fanaticoHub = {
		address: fanaticoHub.address,
        abi: fanaticoHub.interface.format(),
        startBlock,
        paymentTokens: [
            {
                address: ethers.constants.AddressZero,
                abi: null,
                symbol: 'ETH',
                decimals: 18,                
            },
            {
                address: fco.address,
                abi: fco.interface.format(),
                symbol: 'FCO',
                decimals: 18,                
            },
        ],
	}

    const DataAggregator = await ethers.getContractFactory("DataAggregator");
	const dataAggregator = await DataAggregator.deploy(
        fco.address,
        fanaticoHub.address
    );
	await dataAggregator.deployed(); 
	console.log('DataAggregator:   ', dataAggregator.address)
    bcConfig[chainIdHex].dataAggregator = {
		address: dataAggregator.address,
        abi: dataAggregator.interface.format()		
	}    

    
    await writeFile(`../bcConfig.json`, JSON.stringify(bcConfig, null, 4));
    
    
    await fco.mintBatch(testers, testers.map(() => utils.parseUnits('1000', 18)))
    console.log('FCO MINT')

    
    return
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
