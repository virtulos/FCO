// SPDX-License-Identifier: none
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IFCO } from "./FCO.sol";

contract FlashBorrower is IERC3156FlashBorrower {   
    function onFlashLoan(address, address token,
        uint256 amount,
        uint256,
        bytes calldata
    ) external override returns (bytes32) {
        // do some stuff with tokens
        IERC20(token).approve(msg.sender, amount);
        require(IFCO(token).votingLocked(tx.origin) == amount, "User voting not locked");
        require(IFCO(token).votingLocked(address(this)) == amount, "Borrower voting not locked");
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}