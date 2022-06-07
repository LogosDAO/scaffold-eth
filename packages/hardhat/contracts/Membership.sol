// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "erc721a/contracts/extensions/ERC721ABurnable.sol";

contract CloneFactory {
    // implementation of eip-1167 - see https://eips.ethereum.org/EIPS/eip-1167
    function createClone(address target) internal returns (address result) {
        bytes20 targetBytes = bytes20(target);
        assembly {
            let clone := mload(0x40)
            mstore(
                clone,
                0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
            )
            mstore(add(clone, 0x14), targetBytes)
            mstore(
                add(clone, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
            result := create(0, clone, 0x37)
        }
    }
}

error MaxSupplyExceeded();
error PurchaseLimitExceeded();
error PurchasesDisabled();
error InsufficientValue();
error RoundLimitExceeded();
error FailedToSendETH();

// TODO whitelist
// TODO reserve mint
// TODO track & limit mints per wallet

/// @title Membership NFT
/// @notice Membership contract with public sale
contract Membership is ERC721ABurnable, Ownable, Initializable {
    using Strings for uint256; /*String library allows for token URI concatenation*/

    string public contractURI; /*contractURI contract metadata json*/
    string public baseURI; /*baseURI_ String to prepend to token IDs*/
    string private _name; /*Token name override*/
    string private _symbol; /*Token symbol override*/

    address payable public ethSink; /*recipient for ETH*/
    uint256 public maxSupply;
    uint256 public price;
    uint256 public limitPerPurchase; /*Max amount of tokens someone can buy in one transaction*/

    bool public purchasesEnabled;

    /// @notice constructor configures template contract metadata
    constructor() ERC721A("TEMPLATE", "DEAD") initializer {
        _transferOwnership(address(0xdead)); /*Disable template*/
    }

    /// @notice setup configures interfaces and production metadata
    /// @param name_ Token name
    /// @param symbol_ Token symbol
    /// @param _contractURI Metadata location for contract
    /// @param baseURI_ Metadata location for tokens
    /// @param _maxSupply Max supply for this token
    function setUp(
        string memory name_,
        string memory symbol_,
        string memory _contractURI,
        string memory baseURI_,
        address _owner,
        uint256 _price,
        uint256 _limitPerPurchase,
        uint256 _maxSupply,
        address payable _sink
    ) public initializer {
        _name = name_;
        _symbol = symbol_;
        _setBaseURI(baseURI_); /*Base URI for token ID resolution*/
        contractURI = _contractURI; /*Contract URI for marketplace metadata*/
        _currentIndex = _startTokenId();
        maxSupply = _maxSupply;
        price = _price;
        limitPerPurchase = _limitPerPurchase;
        ethSink = _sink; /*Set address to send ETH to*/
        _transferOwnership(_owner);
    }

    function _startTokenId() internal view override(ERC721A) returns (uint256) {
        return 1;
    }

    /// @notice Mint by anyone
    /// @dev Sale must be enabled
    /// @param _qty How many tokens to buy
    function purchase(uint256 _qty) external payable {
        if (purchasesEnabled) revert PurchasesDisabled();

        if (_qty > limitPerPurchase) revert PurchaseLimitExceeded();
        if (msg.value != (price * _qty)) revert InsufficientValue();

        (bool _success, ) = ethSink.call{value: msg.value}(""); /*Send ETH to sink first*/
        if (!_success) revert FailedToSendETH();

        _safeMint(msg.sender, _qty); /*Send token to new recipient*/
    }

    /*****************
    CONFIG FUNCTIONS
    *****************/
    /// @notice Set new base URI for token IDs
    /// @param baseURI_ String to prepend to token IDs
    function setBaseURI(string memory baseURI_) external onlyOwner {
        _setBaseURI(baseURI_);
    }

    /// @notice internal helper to update token URI
    /// @param baseURI_ String to prepend to token IDs
    function _setBaseURI(string memory baseURI_) internal {
        baseURI = baseURI_;
    }

    /// @notice Set new contract URI
    /// @param _contractURI Contract metadata json
    function setContractURI(string memory _contractURI) external onlyOwner {
        contractURI = _contractURI;
    }

    /*****************
    Public interfaces
    *****************/
    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json"))
                : "";
    }

    ///@dev Support interfaces for Access Control and ERC721
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721A)
        returns (bool)
    {
        return
            interfaceId == type(IERC721).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}

/// @title Membership NFT Summoner
/// @notice Clone factory for new memberships
contract MembershipSummoner is CloneFactory{
    address public template; /*Template contract to clone*/

    constructor(address _template) public {
        template = _template;
    }
    
    event SummonComplete(
        address indexed newContract,
        string name,
        string symbol,
        address summoner
    );

    /// @notice Public interface for owner to create new membership tiers
    /// @param name_ Token name
    /// @param symbol_ Token symbol
    /// @param _contractURI Metadata for contract
    /// @param baseURI_ Metadata for tokens
    /// @param _maxSupply Max amount of this token that can be minted
    function summonMembership(
        string memory name_,
        string memory symbol_,
        string memory _contractURI,
        string memory baseURI_,
        uint256 _price,
        uint256 _limitPerPurchase,
        uint256 _maxSupply,
        address payable _sink
    ) external returns (address) {
        Membership membership = Membership(createClone(template)); /*Create a new clone of the template*/

        /*Set up the external interfaces*/
        membership.setUp(
            name_,
            symbol_,
            _contractURI,
            baseURI_,
            msg.sender,
            _price,
            _limitPerPurchase,
            _maxSupply,
            _sink
        );

        emit SummonComplete(address(membership), name_, symbol_, msg.sender);
        
        return address(membership);
    }
}
