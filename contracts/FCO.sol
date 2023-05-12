// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";


contract FANATICO is ERC20, ERC20Burnable, AccessControl {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialMintAmount
    ) ERC20(_name, _symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);

        mintUnlocked(msg.sender, _initialMintAmount);
    }

    struct LockedToken {
        uint192 amount;
        uint64 releaseTime;
    }

    mapping(address => LockedToken[]) _lockedTokens;
    mapping(address => uint) public unlockedBalanceOf;

    bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint64 public constant LOCK_DURATION = 10 minutes;
    uint public constant MAX_TRANSFER_PER_TRANSACTION = 10**(18 + 6); // 1 million tokens max per transaction

    error InsufficientBalance(uint _amount);
    error InsufficientUnlocked();
    error ZeroValueNotAllowed();

    event TokensLocked(address indexed _owner, uint indexed _amount, uint indexed _lockedUntil);
    event TokensUnlocked(address indexed _owner, uint indexed _amount);

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
        _mint(account,amount);
        unlockedBalanceOf[account] += amount;
    }

    function mintLocked(address account, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(account, amount);
        _lockTokens(account, amount);
    }

    function _attemptUnlock(address account, uint desiredAmount) private {
        ensureBalanceEnough(account, desiredAmount);

        uint unlocked = unlockedBalanceOf[account];

        LockedToken[] storage lockedTokens = _lockedTokens[account];
        for (uint i = lockedTokens.length; i > 0 ; i--) {
            if (lockedTokens[i - 1].releaseTime <= block.timestamp) {
                unlocked += lockedTokens[i - 1].amount;
                lockedTokens.pop(); //locked amounts are located sequentially
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
}
