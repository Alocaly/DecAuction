
import Web3 from 'web3'
import { newKitFromWeb3 } from '@celo/contractkit'
import BigNumber from "bignumber.js"

import AuctionPlaceAbi from '../contract/AuctionPlace.abi.json'
import erc20Abi from "../contract/erc20.abi.json"

const ERC20_DECIMALS = 18
const AuctionContractAddress = "0x862f0543E34Da2c5328b4512665255c7A33955C2"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"

let kit
let contract
let OpenAuctions = []

const connectCeloWallet = async function () {
    if (window.celo) {
      notification("⚠️ Please approve this DApp to use it.")
      try {
        await window.celo.enable()
        notificationOff()
  
        const web3 = new Web3(window.celo)
        kit = newKitFromWeb3(web3)
  
        const accounts = await kit.web3.eth.getAccounts()
        kit.defaultAccount = accounts[0]
        contract = new kit.web3.eth.Contract(AuctionPlaceAbi, AuctionContractAddress)
  
      } catch (error) {
        notification(`⚠️ ${error}.`)
      }
    } else {
      notification("⚠️ Please install the CeloExtensionWallet.")
    }
  }

  const updateBalance = async function () {
    const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
    const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
    document.querySelector("#balance").textContent = cUSDBalance
  }
  
  const updateUnsuccessfulBids = async function () {
    const unsuccessfulBidsAmount = await contract.methods.getUnsuccessfulBidAmount().call()
    const bidsAmount_BN = BigNumber( unsuccessfulBidsAmount )
    const cBidsAmount = bidsAmount_BN.shiftedBy(-ERC20_DECIMALS).toFixed(2)
    document.querySelector("#unsuccessful_bids").textContent = cBidsAmount
    document.querySelector("#claim_bids").textContent = ""
    if ( unsuccessfulBidsAmount > 0)
      document.querySelector("#claim_bids").textContent = " (claim)"
  }


  async function approve(_price) {
    const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)
  
    const result = await cUSDContract.methods
      .approve(AuctionContractAddress, _price)
      .send({ from: kit.defaultAccount })
    return result
  }


  function renderAuctions() {
    document.getElementById("myOpenAuctions").innerHTML = ""
    document.getElementById("OpenAuctions").innerHTML = ""

    let currentUser = kit.defaultAccount
    
    OpenAuctions.forEach((_auction) => {
      const newDiv = document.createElement("div")
      newDiv.className = "col-md-4"
      let isOwner = _auction.owner == currentUser
      let isHigestBidder = ( _auction.highestBidder == currentUser )
      newDiv.innerHTML = auctionTemplate(_auction, isOwner, isHigestBidder)
      if ( isOwner )
        document.getElementById("myOpenAuctions").appendChild(newDiv)
      else
        document.getElementById("OpenAuctions").appendChild(newDiv)
    })
  }

  const getAuctions = async function() {
    const _auctionLength = await contract.methods.getOpenAuctionNb().call()
    const _openAuctions = []
    for (let i = 0; i < _auctionLength; i++) {
        let _auction = new Promise(async (resolve, reject) => {
          let req1 = await contract.methods.getItemDescFromAuctionNum(i).call()
          let req2 = await contract.methods.getItemBidFromAuctionNum(i).call()
          resolve({
            index: i,
            owner: req2[0],
            name: req1[0],
            image: req1[1],
            description: req1[2],
            location: req1[3],
            currentBid: new BigNumber(Math.max( req2[1], req2[2])),
            highestBidder:req2[3],
            endDate:req2[4]
          })
        })
        _openAuctions.push(_auction)
      }
      OpenAuctions = await Promise.all(_openAuctions)
      renderAuctions()
    }

    function auctionTemplate(_auction, _isOwner, _isHigestBidder) {
      let endDate = new Date()
      endDate.setTime(_auction.endDate*1000)    // from seconds to milliseconds
      let auctionDone = ( endDate.getTime() < Date.now() )

      let endDateStr = endDate.toDateString()

      let actionFooter = ""
      if ( _isOwner )
      {
        if ( auctionDone )
        {
          actionFooter = `<div class="d-grid gap-2">
            <a class="btn btn-lg btn-outline-dark closeAuction bg-danger fs-6 p-3" id=${_auction.index}>
              Item sent, close the auction !
            </a>
          </div>`
        }
        else
        {
          actionFooter = `<div class="d-grid gap-2">
            <a class="btn btn-lg btn-outline-dark closeAuction fs-6 p-3" id=${_auction.index}>
              Auction OnGoing
            </a>
          </div>`          
        }
      }
      else
      {
        if ( auctionDone )
        {
          actionFooter = `<div class="d-grid gap-2">
            <a class="btn btn-lg bg-danger btn-outline-dark fs-6 p-3">
              Auction expired !
            </a>
          </div>`
        }
        else
        {
          if ( _isHigestBidder )
          {
            actionFooter = `<div class="d-grid gap-2">
                <a class="btn btn-lg btn-outline-dark fs-6 p-3">
                  You are winning this auction !
                </a>
              </div>`
          }
          else
          {
            actionFooter = `<div class="d-grid gap-2">
                <a class="btn btn-lg btn-outline-dark addBid fs-6 p-3" id=${_auction.index}>
                  Make a higher bid
                </a>
              </div>`
          }
        }
      }

      return `
        <div class="card mb-4">
          <img class="card-img-top" src="${_auction.image}" alt="...">
          <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
            End Date : ${endDateStr}
          </div>
          <div class="card-body text-left p-4 position-relative">
            <div class="translate-middle-y position-absolute top-0">
            ${identiconTemplate(_auction.owner)}
            </div>
            <div class="translate-middle-y position-absolute top-0 end-0 px-4">
            ${identiconTemplate(_auction.highestBidder)}
            </div>
            <h2 class="card-title fs-4 fw-bold mt-2">${_auction.name}</h2>
            <p class="card-text mb-4 top-1" style="min-height: 82px">
              ${_auction.description}             
            </p>
            <p class="card-text mt-4">
              <i class="bi bi-geo-alt-fill"></i>
              <span>${_auction.location}</span>
            </p>
            <div class="translate-middle-y position-absolute bg-warning top-1 end-0 px-2 rounded">
            <h2 class="card-title fs-5 fw-bold mt-1">current bid : ${_auction.currentBid.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD</h2>
            </div>
            ${actionFooter}            
          </div>
        </div>
        `
      }


function identiconTemplate(_address) {
    const icon = blockies
      .create({
        seed: _address,
        size: 8,
        scale: 16,
      })
      .toDataURL()
  
    return `
    <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
      <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
          target="_blank">
          <img src="${icon}" width="48" alt="${_address}">
      </a>
    </div>
    `
  }

  function notification(_text) {
    document.querySelector(".alert").style.display = "block"
    document.querySelector("#notification").textContent = _text
  }
  
  function notificationOff() {
    document.querySelector(".alert").style.display = "none"
  }

  window.addEventListener("load", async  () => {
    notification("⌛ Loading...")
    await connectCeloWallet()
    await updateBalance()
    await updateUnsuccessfulBids()
    await getAuctions()
    notificationOff()
  })


  document
  .querySelector("#newAuctionBtn")
  .addEventListener("click", async (e) => {
    console.log("New Auction clicked")
    const params = [
      document.getElementById("newProductName").value,
      document.getElementById("newImgUrl").value,
      document.getElementById("newProductDescription").value,
      document.getElementById("newLocation").value,
      new BigNumber(document.getElementById("newInitialBid").value)
      .shiftedBy(ERC20_DECIMALS)
      .toString()
    ]
    notification(`⌛ Adding "${params[0]}"...`)
    try {
        const result = await contract.methods
          .addItem(...params)
          .send({ from: kit.defaultAccount })
      } catch (error) {
        notification(`⚠️ ${error}.`)
      }
      notification(`🎉 You successfully added "${params[0]}".`)
      getAuctions()
    })

    document
  .querySelector("#claim_unsuccessful")
  .addEventListener("click", async (e) => {
    console.log("claim clicked")
    notification(`⌛ Claiming unsuccessful bids ...`)
    const unsuccessfulBidsAmount = await contract.methods.getUnsuccessfulBidAmount().call()
    try {
        const result = await contract.methods
          .claimUnsuccessfullBids()
          .send({ from: kit.defaultAccount })
          notification(`🎉 Claim successfully!`)
      } catch (error) {
        notification(`⚠️ ${error}.`)
      }
      updateBalance()
      updateUnsuccessfulBids()
    })



    document.querySelector("#OpenAuctions").addEventListener("click", async (e) => {
      console.log("clicked")
        if (e.target.className.includes("addBid")) {
          const index = e.target.id
          notification("⌛ Waiting for payment approval...(1/2)")
          // TODO : make a popup to choose the new bid
          let incr = new BigNumber(1).shiftedBy(ERC20_DECIMALS)
          let newValue = OpenAuctions[index].currentBid.plus( incr );
          try {
            await approve( newValue )
          } catch (error) {
            notification(`⚠️ ${error}.`)
          }    
          notification(`⌛ Awaiting payment for "${OpenAuctions[index].name}"...(2/2)`)
          try {
            console.log("approve done")
            const result = await contract.methods
              .addBid(index, newValue)
              .send({ from: kit.defaultAccount })
            console.log("clicked")
            notification(`🎉 You successfully raise the bid for "${OpenAuctions[index].name}".`)
            getAuctions()
            updateBalance()
          } catch (error) {
            notification(`⚠️ ${error}.`)
          }
        }
      })

      document.querySelector("#myOpenAuctions").addEventListener("click", async (e) => {
        console.log("my open auctions clicked")
          if (e.target.className.includes("closeAuction")) {
            const index = e.target.id
            notification("⌛ Closing the Auction...")
            console.log("index: ",index)
            try {
              console.log("closing opne auction", index)
              const result = await contract.methods
                .closeAuctionAndSendItem(index)
                .send({ from: kit.defaultAccount })
              console.log("clicked")
              notification(`🎉 You successfully close the auction for"${OpenAuctions[index].name}".`)
              getAuctions()
              updateBalance()
            } catch (error) {
              notification(`⚠️ ${error}.`)
            }
          }
        })
  
