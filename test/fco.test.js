const { utils } = require("ethers");
const chai = require('chai');
const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers"); 

// npx hardhat test test/fco.test.js --grep "Mint"
let deployer, rewarder, acc1, acc2, acc3, acc4, acc5, acc6, acc7, acc8
const DAY = 60 * 60 * 24
const SIGNUP_REWARD = utils.parseEther('3')
const EPOCH_REWARD = utils.parseEther('1')
const MAX_TRANSFER_PER_TRANSACTION = utils.parseEther('1000000')
const EPOCH_DURATION = DAY
const LOCK_DURATION = DAY * 30

describe('FCO', async function () {
    
    before(async function () {
        [deployer, acc0, rewarder, acc1, acc2, acc3, acc4, acc5, acc6, acc7, acc8] = await ethers.getSigners();
    });

  
    beforeEach(async function () {
        const FCO = await ethers.getContractFactory("FCO");
        this.fco = await FCO.deploy('Name', 'Symbol', deployer.address);
        await this.fco.deployed(); 
        
        // mock
        const LubAuction = await ethers.getContractFactory("LubAuction");
        this.auction = await LubAuction.deploy(this.fco.address);
        await this.auction.deployed(); 

        // mock
        const FlashBorrower = await ethers.getContractFactory("FlashBorrower");
        this.flashBorrower = await FlashBorrower.deploy();
        await this.flashBorrower.deployed(); 
        
        await this.fco.grantRole(await this.fco.MINTER_ROLE(), deployer.address);
        await this.fco.grantRole(await this.fco.REWARDS_MANAGER_ROLE(), rewarder.address);
        await this.fco.grantRole(await this.fco.AUCTION_ROLE(), this.auction.address);
    });

    describe('Mint/Transfer/Locks', function() {     
        it('not allow mint for no role', async function() {             
            await expect(this.fco.connect(acc1).mint(acc2.address, '100')).to.be.rejected
        });

        it('allow mint for minter role', async function() {             
            await expect(this.fco.connect(deployer).mint(acc1.address, '100')).to.be.fulfilled
            expect((await this.fco.balanceOf(acc1.address)).eq('100')).to.be.true
        });

        it('allow lock for minter role', async function() {             
            await expect(this.fco.connect(deployer).lock(acc1.address, '100')).to.be.fulfilled
            expect((await this.fco.internalBalance(acc1.address)).locked.eq('100')).to.be.true
        });

        it('not allow unlock before expired and allow after', async function() {             
            await expect(this.fco.connect(deployer).lock(acc1.address, '100')).to.be.fulfilled
            await expect(this.fco.connect(acc1).unlock(0)).to.be.rejectedWith('Nothing to unlock')
            await time.increase(LOCK_DURATION)
            await expect(this.fco.connect(acc1).unlock(0)).to.be.fulfilled               
            expect((await this.fco.internalBalance(acc1.address)).locked.eq(0)).to.be.true
            expect((await this.fco.balanceOf(acc1.address)).eq('100')).to.be.true
        });

        it('unlock at transfer', async function() {             
            await this.fco.connect(deployer).lock(acc1.address, '100')
            await expect(this.fco.connect(acc1).transfer(acc2.address, '100')).to.be.rejected
            await time.increase(LOCK_DURATION)
            await expect(this.fco.connect(acc1).transfer(acc2.address, '100')).to.be.fulfilled
            expect((await this.fco.balanceOf(acc1.address)).eq('0')).to.be.true               
            expect((await this.fco.internalBalance(acc1.address)).locked.eq(0)).to.be.true
            expect((await this.fco.balanceOf(acc2.address)).eq('100')).to.be.true
        });

        it('multiple locks', async function() {    
            for (let i = 0; i < 5; i++) {
                await this.fco.connect(deployer).lock(acc1.address, '100')
                await time.increase(EPOCH_DURATION)
            }             
            expect((await this.fco.aggregate(acc1.address)).locks.length === 5).to.be.true

            await time.increase(EPOCH_DURATION * 25)
           
            expect((await this.fco.internalBalance(acc1.address)).unlocked.eq('100')).to.be.true
            await expect(this.fco.connect(acc1).transfer(acc2.address, '100')).to.be.fulfilled

            await time.increase(EPOCH_DURATION * 5)

            expect((await this.fco.internalBalance(acc1.address)).unlocked.eq('400')).to.be.true
            await expect(this.fco.connect(acc1).transfer(acc2.address, '400')).to.be.fulfilled
        });

        it('max tx transfer', async function() {    
            await expect(this.fco.connect(deployer).mint(acc1.address, MAX_TRANSFER_PER_TRANSACTION + 1)).to.be.rejected
            await expect(this.fco.connect(deployer).mint(acc1.address, MAX_TRANSFER_PER_TRANSACTION)).to.be.fulfilled
            
            await expect(this.fco.connect(acc1).transfer(acc2.address, MAX_TRANSFER_PER_TRANSACTION + 1)).to.be.rejected
            await expect(this.fco.connect(acc1).transfer(acc2.address, MAX_TRANSFER_PER_TRANSACTION)).to.be.fulfilled     
            
            await expect(this.fco.connect(deployer).lock(acc1.address, MAX_TRANSFER_PER_TRANSACTION + 1)).to.be.rejected
        });

    })  

    describe('Rewards', function() {     
        beforeEach(async function () {
            const REWARDS_MANAGER_ROLE = await this.fco.REWARDS_MANAGER_ROLE()
            await this.fco.connect(deployer).grantRole(REWARDS_MANAGER_ROLE, rewarder.address);
        });
        
        it('subscribe user with process rewards', async function() {   
            const rewardItems = [
                { account: acc1.address, mint: '0', lock: '0' }
            ]          
            
            expect((await this.fco.connect(rewarder).callStatic.processRewards(rewardItems))[0] === 1).to.be.true
            await expect(this.fco.connect(rewarder).processRewards(rewardItems)).to.be.fulfilled

            expect((await this.fco.internalBalance(acc1.address)).locked.eq(SIGNUP_REWARD)).to.be.true
        });

        it('subscribe multiple user with process rewards', async function() {   
            const rewardItems = [
                { account: acc1.address, mint: '0', lock: '0' },
                { account: acc2.address, mint: '1', lock: '1' },
                { account: acc3.address, mint: SIGNUP_REWARD, lock: SIGNUP_REWARD }
            ]  
            
            const results = await this.fco.connect(rewarder).callStatic.processRewards(rewardItems)
            
            expect(results[0] === 1).to.be.true
            expect(results[1] === 1).to.be.true
            expect(results[2] === 1).to.be.true
        });

        it('not allow to process twice', async function() {   
            const rewardItems = [
                { account: acc1.address, mint: '0', lock: '0' },
                { account: acc1.address, mint: '1', lock: '1' }
            ]  
            
            const results = await this.fco.connect(rewarder).callStatic.processRewards(rewardItems)
            
            expect(results[0] === 1).to.be.true
            expect(results[1] === 2).to.be.true
        });

        it('allow to process epoch reward', async function() {   
            const rewardItems = [
                { account: acc1.address, mint: '0', lock: '0' },
            ]              
            await expect(this.fco.connect(rewarder).processRewards(rewardItems)).to.be.fulfilled

            await time.increase(EPOCH_DURATION)

            rewardItems[0] = { account: acc1.address, mint: '0', lock: EPOCH_REWARD }

            const results = await this.fco.connect(rewarder).callStatic.processRewards(rewardItems)
            expect(results[0] === 0).to.be.true

            await expect(this.fco.connect(rewarder).processRewards(rewardItems)).to.be.fulfilled           
            expect((await this.fco.internalBalance(acc1.address)).locked.eq(SIGNUP_REWARD.add(EPOCH_REWARD))).to.be.true
        });

        it('not allow to process more than epoch reward', async function() {   
            const rewardItems = [
                { account: acc1.address, mint: '0', lock: '0' },
            ]              
            await expect(this.fco.connect(rewarder).processRewards(rewardItems)).to.be.fulfilled

            await time.increase(EPOCH_DURATION)

            rewardItems[0] = { account: acc1.address, mint: '1', lock: EPOCH_REWARD }

            const results = await this.fco.connect(rewarder).callStatic.processRewards(rewardItems)
            expect(results[0] === 3).to.be.true
        });

        it('allow to process past epochs and check max allowed amounts', async function() {   
            await expect(this.fco.connect(rewarder).processRewards([{ account: acc1.address, mint: '0', lock: '0' }])).to.be.fulfilled
            await time.increase(LOCK_DURATION)
                 
            expect((await this.fco.connect(rewarder).callStatic.processRewards([{ account: acc1.address, mint: '0', lock: EPOCH_REWARD.mul(30) }]))[0] === 0).to.be.true

            expect((await this.fco.connect(rewarder).callStatic.processRewards([{ account: acc1.address, mint: EPOCH_REWARD.mul(30), lock: '0' }]))[0] === 4).to.be.true

            await time.increase(EPOCH_DURATION)
            expect((await this.fco.connect(rewarder).callStatic.processRewards([{ account: acc1.address, mint: EPOCH_REWARD, lock: '0' }]))[0] === 0).to.be.true
        });

        it('allow to process past epochs with mint and lock and check amounts', async function() {   
            await expect(this.fco.connect(rewarder).processRewards([
                { account: acc1.address, mint: '0', lock: '0' },
                { account: acc2.address, mint: '0', lock: '0' },
                { account: acc3.address, mint: '0', lock: '0' },
                { account: acc4.address, mint: '0', lock: '0' },
                { account: acc5.address, mint: '0', lock: '0' },
            ])).to.be.fulfilled
       
            await time.increase(LOCK_DURATION + EPOCH_DURATION)
                   
            const rewardItems = [
                { account: acc1.address, mint: EPOCH_REWARD, lock: EPOCH_REWARD.mul(30) },
                { account: acc2.address, mint: EPOCH_REWARD, lock: EPOCH_REWARD.mul(30) },
                { account: acc3.address, mint: EPOCH_REWARD, lock: EPOCH_REWARD.mul(30).add(1) },
                { account: acc4.address, mint: EPOCH_REWARD.add(1), lock: EPOCH_REWARD.mul(30) },
                { account: acc5.address, mint: EPOCH_REWARD.add(1), lock: EPOCH_REWARD.mul(30).sub(1) },                
            ]
            
            const results = await this.fco.connect(rewarder).callStatic.processRewards(rewardItems)
            
            expect(results[0] === 0).to.be.true
            expect(results[1] === 0).to.be.true
            expect(results[2] === 3).to.be.true
            expect(results[3] === 3).to.be.true
            expect(results[4] === 4).to.be.true

            await expect(this.fco.connect(rewarder).processRewards(rewardItems)).to.be.fulfilled

            await time.increase(EPOCH_DURATION)

            const rewardItems2 = [
                { account: acc3.address, mint: EPOCH_REWARD.mul(2), lock: EPOCH_REWARD.mul(30) },
                { account: acc4.address, mint: EPOCH_REWARD.mul(2), lock: EPOCH_REWARD.mul(30) },
                { account: acc5.address, mint: EPOCH_REWARD.mul(2), lock: EPOCH_REWARD.mul(30) },   
                
                { account: acc1.address, mint: '0', lock: EPOCH_REWARD },
                { account: acc2.address, mint: '0', lock: EPOCH_REWARD },
            ]

            const results2 = await this.fco.connect(rewarder).callStatic.processRewards(rewardItems2)

            expect(results2[0] === 0).to.be.true
            expect(results2[1] === 0).to.be.true
            expect(results2[2] === 0).to.be.true
            expect(results2[3] === 0).to.be.true
            expect(results2[4] === 0).to.be.true

            await expect(this.fco.connect(rewarder).processRewards(rewardItems2)).to.be.fulfilled

            expect((await this.fco.internalBalance(acc1.address)).locked.eq(EPOCH_REWARD.mul(31))).to.be.true
            expect((await this.fco.internalBalance(acc1.address)).unlocked.eq(SIGNUP_REWARD)).to.be.true
            expect((await this.fco.balanceOf(acc1.address)).eq((EPOCH_REWARD))).to.be.true
            
            await time.increase(LOCK_DURATION - EPOCH_DURATION)

            expect((await this.fco.internalBalance(acc1.address)).locked.eq(EPOCH_REWARD)).to.be.true
            expect((await this.fco.internalBalance(acc1.address)).unlocked.eq(SIGNUP_REWARD.add(EPOCH_REWARD.mul(30)))).to.be.true
            expect((await this.fco.balanceOf(acc1.address)).eq((EPOCH_REWARD))).to.be.true

            await time.increase(EPOCH_DURATION)

            expect((await this.fco.internalBalance(acc1.address)).locked.eq('0')).to.be.true

            await expect(this.fco.connect(acc1).unlock(0)).to.be.fulfilled

            expect((await this.fco.internalBalance(acc1.address)).unlocked.eq('0')).to.be.true
            expect((await this.fco.balanceOf(acc1.address)).eq((EPOCH_REWARD.mul(32).add(SIGNUP_REWARD)))).to.be.true
                        
            await expect(this.fco.connect(acc2).transfer(acc8.address, EPOCH_REWARD.mul(32).add(SIGNUP_REWARD))).to.be.fulfilled
               
            expect((await this.fco.balanceOf(acc2.address)).eq('0')).to.be.true
            expect((await this.fco.balanceOf(acc8.address)).eq(EPOCH_REWARD.mul(32).add(SIGNUP_REWARD))).to.be.true
        });

        it('continuous visiting', async function() {   
                               
            for (let i = 0; i < 62; i++) {  
                if (i < 30) {
                    await expect(this.fco.connect(rewarder).processRewards([
                        { account: acc1.address, mint: '0', lock: EPOCH_REWARD },
                    ])).to.be.fulfilled    
                }              
                
                await time.increase(EPOCH_DURATION)

                if ((await this.fco.internalBalance(acc1.address)).unlocked.gt(0)) {
                    await expect(this.fco.connect(acc1).unlock(0)).to.be.fulfilled
                }
            }  
                                       
            expect((await this.fco.balanceOf(acc1.address)).eq(EPOCH_REWARD.mul(29).add(SIGNUP_REWARD))).to.be.true
        });

        it('random visiting', async function() {   
            for (let i = 0; i < 150; i++) {  
                if (i < 120) {
                    if ((await this.fco.connect(rewarder).callStatic.processRewards([{ account: acc1.address, mint: '0', lock: EPOCH_REWARD }]))[0] <= 1) {
                        await this.fco.connect(rewarder).processRewards([
                            { account: acc1.address, mint: '0', lock: EPOCH_REWARD },
                        ])   
                    }
                }      
                
                await time.increase(randInt(DAY / 5, DAY * 3))

                if ((await this.fco.internalBalance(acc1.address)).unlocked.gt(0)) {
                    await expect(this.fco.connect(acc1).unlock(0)).to.be.fulfilled
                }
            }  
            expect((await this.fco.internalBalance(acc1.address)).locked.eq(0)).to.be.true                           
        });

        it('1000 locks', async function() {   
            for (let i = 0; i < 1000; i++) {                
                await expect(this.fco.connect(rewarder).processRewards([
                    { account: acc1.address, mint: '0', lock: EPOCH_REWARD },
                ])).to.be.fulfilled    
                
                await time.increase(EPOCH_DURATION)
            }
            if ((await this.fco.internalBalance(acc1.address)).unlocked.gt(0)) {
                await expect(this.fco.connect(acc1).unlock(0)).to.be.fulfilled
            }
        });

    }) 

    describe('Auction', function() {             
        it('use mixed tokens and lock / withdraw / payout', async function() {   
            await this.fco.lock(acc1.address, '100') 
            await this.fco.mint(acc1.address, '100') 

            await expect(this.auction.connect(acc1).bid('150')).to.be.fulfilled
            expect((await this.fco.aggregate(acc1.address)).balance.eq('50')).to.be.true
            expect((await this.fco.aggregate(acc1.address)).locked.eq('0')).to.be.true
            expect((await this.fco.aggregate(acc1.address)).auction.eq('150')).to.be.true
            
            await expect(this.auction.connect(acc1).withdraw('200')).to.be.rejected

            await expect(this.auction.connect(acc1).withdraw('5')).to.be.fulfilled
            expect((await this.fco.aggregate(acc1.address)).auction.eq('145')).to.be.true
            expect((await this.fco.aggregate(acc1.address)).locked.eq('5')).to.be.true

            await expect(this.auction.connect(acc1).payout('5')).to.be.fulfilled
            expect((await this.fco.aggregate(acc1.address)).auction.eq('140')).to.be.true
            expect((await this.fco.aggregate(acc1.address)).balance.eq('55')).to.be.true
        });

        it('use locked tokens and lock / withdraw / payout', async function() {   
            await this.fco.lock(acc1.address, '100') 

            await expect(this.auction.connect(acc1).bid('50')).to.be.fulfilled
            expect((await this.fco.aggregate(acc1.address)).locked.eq('50')).to.be.true
            expect((await this.fco.aggregate(acc1.address)).auction.eq('50')).to.be.true

            await expect(this.auction.connect(acc1).withdraw('100')).to.be.rejected

            await expect(this.auction.connect(acc1).withdraw('5')).to.be.fulfilled
            expect((await this.fco.aggregate(acc1.address)).auction.eq('45')).to.be.true
            expect((await this.fco.aggregate(acc1.address)).locked.eq('55')).to.be.true

            await expect(this.auction.connect(acc1).payout('5')).to.be.fulfilled
            expect((await this.fco.aggregate(acc1.address)).auction.eq('40')).to.be.true
            expect((await this.fco.aggregate(acc1.address)).balance.eq('5')).to.be.true
        });
               
        it('use minted tokens and lock / withdraw / payout', async function() {  
            await this.fco.mint(acc1.address, '100') 

            await expect(this.auction.connect(acc1).bid('50')).to.be.fulfilled
            expect((await this.fco.balanceOf(acc1.address)).eq('50')).to.be.true
            expect((await this.fco.aggregate(acc1.address)).auction.eq('50')).to.be.true

            await expect(this.auction.connect(acc1).withdraw('100')).to.be.rejected

            await expect(this.auction.connect(acc1).withdraw('5')).to.be.fulfilled
            expect((await this.fco.aggregate(acc1.address)).auction.eq('45')).to.be.true
            expect((await this.fco.aggregate(acc1.address)).locked.eq('5')).to.be.true

            await expect(this.auction.connect(acc1).payout('5')).to.be.fulfilled
            expect((await this.fco.aggregate(acc1.address)).auction.eq('40')).to.be.true
            expect((await this.fco.aggregate(acc1.address)).balance.eq('55')).to.be.true
        });        
    })

    describe('FlashLoan', function() {     
        it('allow to loan', async function() {   
            await expect(this.fco.connect(acc1).flashLoan(
                this.flashBorrower.address,
                ethers.constants.AddressZero, //this.fco.address,
                '100',
                '0x00'
            )).to.be.fulfilled
            
            expect((await this.fco.balanceOf(acc1.address)).eq('0')).to.be.true    
        });

        it('allow to loan max possible amount', async function() {   
            await expect(this.fco.connect(deployer).mint(acc1.address, '100')).to.be.fulfilled

            await expect(this.fco.connect(acc1).flashLoan(
                this.flashBorrower.address,
                ethers.constants.AddressZero, //this.fco.address,
                ethers.constants.MaxUint256.sub('100'),
                '0x00'
            )).to.be.fulfilled                        
        });
    })
});

function randInt(min, max) {
    return parseInt(Math.random() * (max - min) + min);
}