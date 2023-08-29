// SPDX-License-Identifier: none
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Marketplace  {
    using SafeERC20 for IERC20;
     
    address public fco;           
        
    // --------------------- CONSTRUCT ---------------------    
    constructor (
        address fco_
    ) {
        fco = fco_;
    }
    
    function buy(uint256 price_) public {
        IERC20(fco).safeTransferFrom(msg.sender, address(this), price_);
    }
}
