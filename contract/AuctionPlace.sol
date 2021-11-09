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
        address payable highestBidder;
        string name;
        string image;
        string description;
        string location;
        uint initialPrice;
        uint highestBid;
        uint endDate;
        bool isOpen;
    }

    mapping (uint => Item) internal items;
    
    mapping( address => uint ) internal unsuccessfullBidValue;
    
    modifier isOpen (uint index){
        // ensures that an auction is still open
        
        require(items[index].isOpen, "invalid open auctionn Id");
        _;
    
    }
    
    modifier ensureHigherBid (uint _index, uint _newPrice){
        // ensures that a new bid is hiogher than existing ones
        require( _newPrice > items[_index].initialPrice, "need a higher bid");
        require( _newPrice > items[_index].highestBid, "need a higher bid");
        _;
    }
    
    function addItem(
        string memory _name,
        string memory _image,
        string memory _description, 
        string memory _location, 
        uint _initialPrice
    ) public {
        items[nbItems] = Item(
            payable(msg.sender),
            payable(msg.sender),
            _name,
            _image,
            _description,
            _location,
            _initialPrice,
            0,
            block.timestamp + 7 days,
            true
        );
  
        nbItems++;
    }
    
    function closeAuctionAndSendItem( uint _index) isOpen(_index) public
    {
        
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
        items[_index].isOpen = false;
    }
    
    
    function isAuctionOpen(uint _index) public view returns (bool){
        return items[_index].isOpen;
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
    
    function getItemLength() public view returns (uint){
        return nbItems;
    }

    function addBid(uint _index, uint _newPrice) public payable isOpen(_index) ensureHigherBid(_index, _newPrice) {
      
        
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
    
    
    // function getItemDescFromAuctionNum( uint _auctionNum ) public view returns (
    //     string memory, 
    //     string memory, 
    //     string memory, 
    //     string memory 
    // )
    // {
    //     return getItemDesc( openAuctions[ _auctionNum ] );
    // }
    // function getItemBidFromAuctionNum( uint _auctionNum ) public view returns (
    //     address payable,
    //     uint,
    //     uint,
    //     address payable,
    //     uint)
    // {
    //     return getItemBid( openAuctions[ _auctionNum ] );
    // }
}
