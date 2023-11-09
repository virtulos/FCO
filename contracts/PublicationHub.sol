// SPDX-License-Identifier: none
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import { IFCOToken } from "./FCOToken.sol";
import { AccessControl } from "./AccessControl.sol";
import { EventEmitter } from "./EventEmitter.sol";

interface IPublicationHub {
    struct RoyaltyTier {
        uint128 copies;
        uint16 fee;
    }        
    struct Publication {
        address author; 
        address owner; 
        string contentUri; 
        uint128 copies;
        RoyaltyTier[] royaltyTiers;
    }
    
    struct PaymentToken {
        bool enabled; 
        uint16 serviceFee; 
    }

    struct PaymentTokenData {
        bool enabled; 
        uint16 serviceFee; 
        uint256 balance;           
    }

    struct MintData {
        uint256 chainId;
        address author;
        string contentUri;        
        uint128 price;
        address paymentToken;
        RoyaltyTier[] royaltyTiers;
    }

    struct CollectData {
        uint256 chainId;
        address owner; 
        uint256 tokenId;
        uint256 price; 
        address paymentToken;
    } 
    
    struct AggregateData {
        PaymentTokenData[] paymentTokens;
    }
    function aggregate(address account, address[] memory tokens) external view returns (AggregateData memory data);
}

contract PublicationHub is IPublicationHub, ERC1155Upgradeable, AccessControl, EventEmitter {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    uint256 public constant feeBase = 1000;    
    address public serviceWallet;           
    address public signerWallet;
    IFCOToken public fco;
       
    mapping(uint256 => Publication) public publications;
    mapping(address => PaymentToken) public paymentTokens; 
            
    // --------------------- CONSTRUCT ---------------------    
    function initialize(
        address authority_, 
        address eventEmitter_, 
        address serviceWallet_,  
        address signerWallet_,        
        string memory uri_,
        IFCOToken fco_         
    ) public initializer {
        __AccessControl_init(authority_);
        __ERC1155_init(uri_);
        __EventEmitter_init(eventEmitter_);
        
        serviceWallet = serviceWallet_;
        signerWallet = signerWallet_;
        
        paymentTokens[address(0)] = PaymentToken(true, 50);
        paymentTokens[address(fco_)] = PaymentToken(true, 50);
                   
        fco = fco_;        
    }
    
    function aggregate(address account, address[] memory tokens) public view returns (AggregateData memory data) {        
        data.paymentTokens = new PaymentTokenData[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            address tokenAddress = tokens[i];
            PaymentToken memory paymentToken = paymentTokens[tokenAddress]; 

            data.paymentTokens[i] = PaymentTokenData({
                enabled: paymentToken.enabled,
                serviceFee: paymentToken.serviceFee,
                balance: tokenAddress == address(0) ? account.balance : IERC20Upgradeable(tokenAddress).balanceOf(account)
            });            
        }
	}

    function canRead(address account_, uint256 tokenId_) public view returns (bool) {
        uint256 encryptedId = getEncryptedId(tokenId_);
        Publication memory publication = publications[encryptedId];
        if (publication.author == account_) return true; // author can always read        
        if (publication.copies == 0) return false; // if not decrypted no one can read except author
        if (publication.owner == account_) return true; // if decrypted current owner can read            
        if (balanceOf(account_, encryptedId + 1) == 1) return true; // holder of decrypted can read   
        return false;
    }

    function setServiceWallet(address serviceWallet_) public onlyAdmin {
        serviceWallet = serviceWallet_;
        emitEvent("HUB_SERVICE_WALLET", abi.encode(serviceWallet_));
    }
    
    function setSignerWallet(address signerWallet_) public onlyAdmin {
        signerWallet = signerWallet_;
        emitEvent("HUB_SIGNER_WALLET", abi.encode(signerWallet_));
    }

    function setPaymentToken(address addess_, PaymentToken memory paymentToken_) public onlyAdmin {
        paymentTokens[addess_] = paymentToken_;
        emitEvent("HUB_PAYMENT_TOKEN", abi.encode(addess_, paymentToken_));
    }
    
    function isEncrypted(uint256 tokenId_) public pure returns (bool) {
		return tokenId_ % 2 != 0;
	}
    
    function getEncryptedId(uint256 tokenId_) public pure returns (uint256) {
        require(tokenId_ != 0, 'Wrong token id');        
        return isEncrypted(tokenId_) ? tokenId_ : tokenId_ - 1;
    }

    function ownerOf(uint256 tokenId_) public view returns (address) {
        return publications[getEncryptedId(tokenId_)].owner;
    }

    function getPublication(uint256 tokenId_) public view returns (Publication memory) {
        return publications[getEncryptedId(tokenId_)];
    }
   
    function mint(
        MintData calldata mintData_, 
        uint256 tokenId_, 
        uint256 deadline_, 
        bytes calldata authorSignature_, 
        bytes calldata serviceSignature_, 
        IFCOToken.ApproveWithSignData calldata approveWithSignData, 
        IFCOToken.RewardsData calldata processRewardsData
        ) payable public {
        require(mintData_.chainId == authority.chainId(), "Bad chain");
        require(_isSignatureValid(keccak256(abi.encode(mintData_, tokenId_, deadline_)), serviceSignature_, signerWallet), "Bad service signature");
        require(_isSignatureValid(keccak256(abi.encode(mintData_)), authorSignature_, mintData_.author), "Bad author signature");
                
        uint256 encryptedId = getEncryptedId(tokenId_);
        
        Publication storage publication = publications[encryptedId];        
        require(publication.author == address(0), "Already minted");
        require(deadline_ > block.timestamp, "Transaction expired");
        
        publication.author = mintData_.author;
        publication.owner = msg.sender;
        publication.contentUri = mintData_.contentUri;
        if (encryptedId != tokenId_) publication.copies ++;

        _addRoyalty(mintData_.royaltyTiers, encryptedId);
                       
        _mint(msg.sender, tokenId_, 1, "");
        emitEvent("HUB_MINT", abi.encode(tokenId_, mintData_, msg.sender)); 

        uint256 price = mintData_.price;
        address paymentToken = mintData_.paymentToken;
        
        _payout(publication, paymentToken, price, approveWithSignData, processRewardsData, true);       
    }

    function _addRoyalty(RoyaltyTier[] memory royaltyTiers, uint256 encryptedId) internal {
        uint256 rolyaltyTiersLength = royaltyTiers.length;
        require(rolyaltyTiersLength != 0, "No royalty tiers"); 
        require(rolyaltyTiersLength <= 5, "Too much reward tiers");  
     
        // prevRewardTier for checking each next tier has higher values
        RoyaltyTier memory prevRoyaltyTier; 
        bool accending;
        for (uint256 i = 0; i < rolyaltyTiersLength;) {
            RoyaltyTier memory royaltyTier = royaltyTiers[i];            
            require(royaltyTier.fee <= 900, "Wrong max tier fee value"); 
            if (i == 0) { // if first tier                
                require(royaltyTier.copies != 0, "Wrong first tier copies"); // First reward tier bad decrypted
            } else { // if next
                require(royaltyTier.copies > prevRoyaltyTier.copies, "Wrong tier copies number"); // Next reward tier bad decrypted
                if (i == 1 && royaltyTier.fee > prevRoyaltyTier.fee) { // determine fee order
                    accending = true;
                } 
                if (accending) {
                    require(royaltyTier.fee > prevRoyaltyTier.fee, "Wrong tier fee value"); // Next reward tier bad fee
                } else {
                    require(royaltyTier.fee < prevRoyaltyTier.fee, "Wrong tier fee value"); // Next reward tier bad fee
                }                
            } 
            prevRoyaltyTier = royaltyTier;
            publications[encryptedId].royaltyTiers.push(royaltyTier);   
            unchecked { i++; }
        }
    }

    function _payout(
        Publication memory publication, 
        address paymentTokenAddress, 
        uint256 price, 
        IFCOToken.ApproveWithSignData calldata approveWithSignData, 
        IFCOToken.RewardsData calldata processRewardsData, 
        bool minting
    ) internal {
        PaymentToken memory paymentToken = paymentTokens[paymentTokenAddress];  
        require(paymentToken.enabled, "Payment token not supported");
        require(price >= feeBase, "Price too low");                                            
        
        uint256 serviceAmount = price * paymentToken.serviceFee / feeBase;
        uint256 authorAmount;
        uint256 ownerAmount;

        if (minting) {
            authorAmount = price - serviceAmount;
        } else {
            uint256 royaltyTiersLength = publication.royaltyTiers.length;                        
            for (uint256 i = 0; i < royaltyTiersLength;) {
                RoyaltyTier memory rolyaltyTier = publication.royaltyTiers[i];            
                if (publication.copies < (rolyaltyTier.copies - 1) || i == (royaltyTiersLength - 1)) {
                    authorAmount = price * rolyaltyTier.fee / feeBase;
                    break;
                } 
                unchecked { i++; }
            }
            ownerAmount = price - authorAmount - serviceAmount;
        }
        
        if (paymentTokenAddress == address(0)) {
            require(msg.value == price, "Wrong native token amount");
            if (authorAmount != 0) {
                (bool authorSuccess, ) = payable(publication.author).call{value: authorAmount }("");
                require(authorSuccess, "Author payment error");
            }
            if (ownerAmount != 0) {
                (bool ownerSuccess, ) = payable(publication.owner).call{ value: ownerAmount }("");
                require(ownerSuccess, "Owner payment error");
            }             
            (bool serviceSuccess, ) = payable(serviceWallet).call{value: serviceAmount }("");
            require(serviceSuccess, "Service payment error");    
        } else {
            require(msg.value == 0, "Not accept native token");
            if (paymentTokenAddress == address(fco)) {
                require(approveWithSignData.data.amount == price, "Approve FCO wrong amount");      
                require(address(this) == approveWithSignData.data.spender, "Approve FCO wrong spender"); 
                fco.approveWithSign(approveWithSignData);          
                fco.processRewards(processRewardsData);
            }            
            if (authorAmount != 0) {
                IERC20Upgradeable(paymentTokenAddress).safeTransferFrom(msg.sender, publication.author, authorAmount);
            }
            if (ownerAmount != 0) {
                IERC20Upgradeable(paymentTokenAddress).safeTransferFrom(msg.sender, publication.owner, ownerAmount);
            }
            IERC20Upgradeable(paymentTokenAddress).safeTransferFrom(msg.sender, serviceWallet, serviceAmount);
        }
    }
   
    function transferOwner(uint256 tokenId_, address newOwner_) public { 
        uint256 encryptedId = getEncryptedId(tokenId_);        
        Publication storage publication = publications[encryptedId];
        require(publication.owner == msg.sender, "Not owner");

        if (balanceOf(publication.owner, encryptedId) == 1) {
            _safeTransferFrom(publication.owner, newOwner_, encryptedId, 1, ""); 
        } else {
            publication.owner = newOwner_;
            emitEvent("HUB_OWNER", abi.encode(encryptedId, msg.sender, newOwner_));
        } 
    }
    
    function decrypt(uint256 tokenId_) public {   
        uint256 encryptedId = getEncryptedId(tokenId_);
        Publication storage publication = publications[encryptedId];
        publication.copies ++;   
        _burn(msg.sender, encryptedId, 1);        
        _mint(msg.sender, encryptedId + 1, 1, "");     
    }
     
    function collect(
        CollectData calldata collectData_, 
        uint256 deadline_, 
        bytes calldata ownerSignature_, 
        bytes calldata serviceSignature_, 
        bool decrypt_,         
        IFCOToken.ApproveWithSignData calldata approveWithSignData, 
        IFCOToken.RewardsData calldata processRewardsData
    ) payable public {
        require(collectData_.chainId == authority.chainId(), "Bad chain");
        require(_isSignatureValid(keccak256(abi.encode(collectData_, deadline_)), serviceSignature_, signerWallet), "Bad service signature");
        require(_isSignatureValid(keccak256(abi.encode(collectData_)), ownerSignature_, collectData_.owner), "Bad author signature");               
        require(deadline_ > block.timestamp, "Transaction expired");

        CollectData memory collectDataCp = collectData_;
        address owner = collectDataCp.owner;
        uint256 encryptedId = getEncryptedId(collectDataCp.tokenId);
        uint256 decryptedId = encryptedId + 1;

        Publication storage publication = publications[encryptedId];        
        require(owner == publication.owner, "Not owner");  
          
        _payout(publication, collectDataCp.paymentToken, collectDataCp.price, approveWithSignData, processRewardsData, false);
             
        if (collectDataCp.tokenId == encryptedId) { // if collecting ownership
            if (balanceOf(owner, encryptedId) == 1) { // if owner hold encrypted (publication encrypted)                
                if (decrypt_) { // if new owner want decrypt
                    publication.copies ++;
                    publication.owner = msg.sender;
                    _burn(owner, encryptedId, 1);
                    _mint(msg.sender, decryptedId, 1, "");
                } else {
                    _safeTransferFrom(publication.owner, msg.sender, encryptedId, 1, "");
                }
            } else { // if owner not hold encrypted (publication decrypted)
                publication.owner = msg.sender;
                if (balanceOf(msg.sender, decryptedId) == 0) { // new owner receive decrypted token if not hold one
                    publication.copies ++;
                    _mint(msg.sender, decryptedId, 1, "");
                }
            }            
        } else {  // if collecting decrypted
            publication.copies ++;
            _mint(msg.sender, decryptedId, 1, "");
        }
        
        emitEvent("HUB_COLLECT", abi.encode(collectDataCp, msg.sender, decrypt_, publication.copies));
    }

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) internal override {
        for (uint256 i = 0; i < ids.length;) {
            uint256 tokenId = ids[i]; 
            if (to != address(0)) {
                require(balanceOf(to, tokenId) == 0, "Already holds");
                if (isEncrypted(tokenId) && from != address(0)) {                     
                    publications[tokenId].owner = to;  
                } 
            } 
            emitEvent("HUB_TRANSFER", abi.encode(tokenId, from, to));           
            unchecked { i++; }
        }
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function _isSignatureValid(bytes32 dataHash_, bytes calldata signature_, address signer_) internal pure returns (bool) {
		return ECDSAUpgradeable.recover(ECDSAUpgradeable.toEthSignedMessageHash(dataHash_), signature_) == signer_;
	}

    uint256[50] private __gap;   
}
