// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract AuctionPlace {

    uint internal nbItems = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    struct Item {
        address payable owner;
        string name;
        string image;
        string description;
        string location;
        uint initialPrice;
        uint highestBid;
        address payable highestBidder;
        uint endDate;
    }

    mapping (uint => Item) internal items;
    
    uint[] internal openAuctions;

    mapping( address => uint ) internal unsuccessfullBidValue;

    function addItem(
        string memory _name,
        string memory _image,
        string memory _description, 
        string memory _location, 
        uint _initialPrice
    ) public {
        items[nbItems] = Item(
            payable(msg.sender),
            _name,
            _image,
            _description,
            _location,
            _initialPrice,
            0,
            payable(msg.sender),
            block.timestamp + 7 days
        );
        openAuctions.push( nbItems );
        nbItems++;
    }
    
    function closeAuctionAndSendItem( uint _auctionNum) public
    {
        require( _auctionNum < openAuctions.length, "invalid open auctionn Id");
        uint _index = openAuctions[ _auctionNum ];
        require( msg.sender == items[_index].owner, "only the owner can close the auction");
        require(block.timestamp > items[_index].endDate, "This auction is not ended yet");
        
        // only if the auction has a highestBidder
        if ( items[_index].highestBidder != items[_index].owner)
        {
            require(
                      IERC20Token(cUsdTokenAddress).transfer(
                        msg.sender,
                        items[_index].highestBid
                      ),
                      "Transfer failed."
                    );
        }
        
        // remove the auction from the open ones :
        openAuctions[ _auctionNum ] = openAuctions[ openAuctions.length - 1 ];
        openAuctions.pop();
    }

    function getItemDesc(uint _index) public view returns (
        string memory, 
        string memory, 
        string memory, 
        string memory 
    ) {
        return (
            items[_index].name, 
            items[_index].image, 
            items[_index].description, 
            items[_index].location
        );
    }
    function getItemBid(uint _index) public view returns (
        address payable,
        uint,
        uint,
        address payable,
        uint)
    {
        return (
            items[_index].owner,
            items[_index].initialPrice,
            items[_index].highestBid,
            items[_index].highestBidder,
            items[_index].endDate
            );
    }

    function addBid(uint _auctionNum, uint _newPrice) public payable  {
        require( _auctionNum < openAuctions.length, "invalid open auctionn Id");
        uint _index = openAuctions[ _auctionNum ];
        require( _newPrice > items[_index].initialPrice, "need a higher bid");
        require( _newPrice > items[_index].highestBid, "need a higher bid");
        require( msg.sender != items[_index].owner, "can't bid for your own auction");
        require( msg.sender != items[_index].highestBidder, "already the biggest bid");
        require(block.timestamp < items[_index].endDate, "This auction is done");
        require(
          IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            address(this),
            _newPrice
          ),
          "Transfer failed."
        );
        
        if ( items[_index].highestBidder != items[_index].owner)
            unsuccessfullBidValue[ items[_index].highestBidder ] += items[_index].highestBid;
        
        items[_index].highestBid = _newPrice;
        items[_index].highestBidder = payable(msg.sender);
    }
    
    function getOpenAuctionNb() public view returns (uint) {
        return openAuctions.length;
    }
    function getItemDescFromAuctionNum( uint _auctionNum ) public view returns (
        string memory, 
        string memory, 
        string memory, 
        string memory 
    )
    {
        return getItemDesc( openAuctions[ _auctionNum ] );
    }
    function getItemBidFromAuctionNum( uint _auctionNum ) public view returns (
        address payable,
        uint,
        uint,
        address payable,
        uint)
    {
        return getItemBid( openAuctions[ _auctionNum ] );
    }
    function getUnsuccessfulBidAmount() public view returns(uint)
    {
        return unsuccessfullBidValue[ msg.sender];
    }
    function claimUnsuccessfullBids() public
    {
        require( unsuccessfullBidValue[msg.sender] > 0, "no unsuccessfull Bids");
        require(
          IERC20Token(cUsdTokenAddress).transfer(
            msg.sender,
            unsuccessfullBidValue[msg.sender]
          ),
          "Transfer failed."
        );
        unsuccessfullBidValue[msg.sender] = 0;
    }
}