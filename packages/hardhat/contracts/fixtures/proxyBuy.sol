pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "../Membership.sol";

contract ProxyBuy is ERC721Holder {
    function claimAsContract(address _membership) public {
        Membership membership_ = Membership(_membership);
        membership_.mintPublic(1);
    }
}
