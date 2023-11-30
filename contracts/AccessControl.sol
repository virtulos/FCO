// SPDX-License-Identifier: none
pragma solidity ^0.8.19;

import "./openzeppelin/token/ERC20/IERC20.sol";
import "./openzeppelin/token/ERC20/utils/SafeERC20.sol";

abstract contract AccessControl {  
    using SafeERC20 for IERC20;  
    IAuthority public authority;

    constructor(address authority_) {
        authority = IAuthority(authority_);   
    }
      
    function setAuthority(IAuthority _newAuthority) external onlyAdmin {
        authority = _newAuthority;        
    }

    function recover(
		address token_,
		uint256 amount_,
		address recipient_
	) external onlyAdmin {
        if (token_ != address(0)) {
			IERC20(token_).safeTransfer(recipient_, amount_);
		} else {
			(bool success, ) = recipient_.call{ value: amount_ }("");
			require(success, "Can't send ETH");
		}
	}

    modifier onlyAdmin() {
        require(msg.sender == authority.admin(), "Admin!");
        _;
    }

    modifier onlyOperator() {
        require(authority.operators(msg.sender), "Operator!");
        _;
    }
}

interface IAuthority {
    function admin() external view returns (address);
    function operators(address operator) external view returns (bool);
    function chainId() external view returns (uint256);
}

contract Authority is IAuthority, AccessControl {
	address public override admin;
    mapping(address => bool) public override operators; 
    uint256 public chainId;
    
    constructor(uint256 chainId_) AccessControl(address(this)) {
        admin = tx.origin;
        chainId = chainId_; 
        //operators[tx.origin] = true; 
    }
	
	function setAdmin(address account) public onlyAdmin {		
		admin = account;        
	}	

    function setOperator(address account, bool state) public onlyAdmin {		
		operators[account] = state;         
	}
}
