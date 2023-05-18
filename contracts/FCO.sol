// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract FANATICO is ERC20, ERC20Burnable, ERC20FlashMint, AccessControl, ReentrancyGuard {
    constructor(
        string memory _name,
        string memory _symbol)
    ERC20(_name, _symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
    }

    struct LockedToken {
        uint192 amount;
        uint64 releaseTime;
    }

    mapping(address => LockedToken[]) _lockedTokens;
    mapping(address => uint256) public lockedVotingTokens; // temp voting lock for flash loans
    mapping(address => uint) public unlockedBalanceOf;
    mapping(address => bool) public signupBonusClaimed;
    mapping(address => uint) public lastClaimedTime; // last time the user claimed their daily rewards (subject of locking for 24h)

    bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 private constant REWARDS_MANAGER_ROLE = keccak256("REWARDS_MANAGER_ROLE");
    uint64 public constant LOCK_DURATION = 1 hours;
    uint public constant MAX_TRANSFER_PER_TRANSACTION = 10 ** (18 + 6); // 1 million tokens max per transaction

    uint public constant SIGNUP_REWARDS = 3 * 10 ** 18; // 3 token max per signup
    uint public constant DAILY_REWARDS = 1 * 10 ** 18; // 1 token max per day

    address public lubAuctionAddress;

    error InsufficientBalance(uint _amount);
    error InsufficientUnlocked();
    error ZeroValueNotAllowed();

    event TokensLocked(address indexed _owner, uint indexed _amount, uint indexed _lockedUntil);
    event TokensUnlocked(address indexed _owner, uint indexed _amount);
    event SignupBonusClaimed(address indexed _owner, uint indexed _amount);
    event DailyRewardsClaimed(address indexed _owner, uint indexed _amount);
    event LubAuctionAddressChanged(address indexed _oldAddress, address indexed _newAddress);

    function zeroValueCheck(uint _amount) private pure {
        if (_amount == 0) {
            revert ZeroValueNotAllowed();
        }
    }

    function ensureBalanceEnough(address _address, uint _amount) private view {
        zeroValueCheck(_amount);
        if (_amount > balanceOf(_address)) {
            revert InsufficientBalance(_amount);
        }
    }

    function _lockTokens(address account, uint amount) private {
        uint releaseTime = block.timestamp + LOCK_DURATION;
        require(amount <= balanceOf(account) - unlockedBalanceOf[account], "Free balance lock exceeded");
        _lockedTokens[account].push(LockedToken(uint192(amount), uint64(releaseTime)));
        emit TokensLocked(account, amount, releaseTime);
    }

    function mintUnlocked(address account, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(account, amount);
        unlockedBalanceOf[account] += amount;
    }

    function mintLocked(address account, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(account, amount);
        _lockTokens(account, amount);
    }

    // Override flashMint function to add voting lock
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) public override returns (bool) {
        lockedVotingTokens[address(receiver)] += amount;
        lockedVotingTokens[msg.sender] += amount;
        bool result = super.flashLoan(receiver, token, amount, data);

        lockedVotingTokens[address(receiver)] = 0;
        lockedVotingTokens[msg.sender] = 0;

        return result;
    }


    function signupBonus(address account) public onlyRole(REWARDS_MANAGER_ROLE) nonReentrant {
        require(!signupBonusClaimed[account], "Signup bonus already claimed");

        _mint(account, SIGNUP_REWARDS);
        _lockTokens(account, SIGNUP_REWARDS);

        signupBonusClaimed[account] = true;
        lastClaimedTime[account] = block.timestamp;
        emit SignupBonusClaimed(account, SIGNUP_REWARDS);
    }

    function dailyBonus(address account) public onlyRole(REWARDS_MANAGER_ROLE) nonReentrant {
        require(signupBonusClaimed[account], "Signup bonus not claimed yet");
        require(block.timestamp - lastClaimedTime[account] >= 10 minutes, "Daily bonus already claimed today");

        _mint(account, DAILY_REWARDS);
        _lockTokens(account, DAILY_REWARDS);

        lastClaimedTime[account] = block.timestamp;
        emit DailyRewardsClaimed(account, DAILY_REWARDS);
    }

    function _attemptUnlock(address account, uint desiredAmount) private {
        ensureBalanceEnough(account, desiredAmount);

        uint unlocked = unlockedBalanceOf[account];

        LockedToken[] storage lockedTokens = _lockedTokens[account];
        for (uint i = lockedTokens.length; i > 0; i--) {
            if (lockedTokens[i - 1].releaseTime <= block.timestamp) {
                unlocked += lockedTokens[i - 1].amount;
                lockedTokens.pop();
                //locked amounts are located sequentially
                continue;
            }

            break;
        }

        if (desiredAmount > unlocked) {
            revert InsufficientUnlocked();
        }

        unlockedBalanceOf[account] = unlocked;
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        if (from == address(0)) {
            return;
        }

        require(amount <= MAX_TRANSFER_PER_TRANSACTION, "MAX_TRANSFER_PER_TRANSACTION");
        if (amount > unlockedBalanceOf[from]) {
            _attemptUnlock(from, amount);
        }

        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override {
        if (from == address(0)) {
            return;
        }

        unlockedBalanceOf[from] -= amount;
        unlockedBalanceOf[to] += amount;

        super._afterTokenTransfer(from, to, amount);
    }

    function changeLubAuctionAddress(address _lubAuctionAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_lubAuctionAddress != address(0), "Zero address not allowed for LUB auction");

        if (_lubAuctionAddress != lubAuctionAddress) {
            address oldAddress = lubAuctionAddress;
            lubAuctionAddress = _lubAuctionAddress;

            emit LubAuctionAddressChanged(oldAddress, _lubAuctionAddress);
        }
    }
}