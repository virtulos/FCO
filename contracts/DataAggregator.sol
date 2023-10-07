// SPDX-License-Identifier: none
pragma solidity ^0.8.19;

import { IFCOToken } from "./FCOToken.sol";
import { IPublicationHub } from "./PublicationHub.sol";

contract DataAggregator {	
    IFCOToken public fco;
    IPublicationHub public hub;

    constructor (
        IFCOToken fco_,
        IPublicationHub hub_
    ) {
        fco = fco_;
        hub = hub_;
    }
	
	function aggregate(address account) public view returns (       
        IFCOToken.AggregateData memory fcoData,
        IPublicationHub.AggregateData memory hubData
	) {
        fcoData = fco.aggregate(account);
        hubData = hub.aggregate(account);
    }	
}
