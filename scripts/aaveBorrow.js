
const { getNamedAccounts, ethers } = require("hardhat")
const {getWeth, AMOUNT} = require("../scripts/getWeth.js") 

async function main(){
    // protocol treats everything as an ERC20 token
    await getWeth()
    const {deployer} = await getNamedAccounts()
    //abi, address
    const signer = await ethers.getSigner(deployer)
    const lendingPool = await getLendingPool(signer)
    console.log(`Lending Pool Address ${lendingPool.address}`)
    const contractAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"  
    const daiContractAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"  
    await approve(contractAddress,lendingPool.address, AMOUNT, signer)
    console.log("Approved !!!")
    console.log("Depositing ...")
    await lendingPool.deposit(contractAddress, AMOUNT, deployer, 0)
    console.log("Deposited !!!")
    let {availableBorrowsETH, totalDebtETH} = await getBorrowUserData(lendingPool, deployer)
    const DaiEthPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1/DaiEthPrice.toNumber())
    console.log(`Amount of Dai to Borrow ${amountDaiToBorrow}`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    await borrowDai(lendingPool,daiContractAddress,amountDaiToBorrowWei,deployer)
    await getBorrowUserData(lendingPool, deployer)
    await approve(daiContractAddress, lendingPool.address, amountDaiToBorrowWei, signer)
    await repayDai(lendingPool, daiContractAddress, amountDaiToBorrowWei, deployer)
    await getBorrowUserData(lendingPool, deployer)
}

async function getLendingPool(account){
        const LendingPoolAddressesProviderAddress = "0xb53c1a33016b2dc2ff3653530bff1848a515c8c5"
        const iLendingPoolAddressesProvider = await ethers.getContractAt("ILendingPoolAddressesProvider", LendingPoolAddressesProviderAddress, account)
        const LendingPoolAddress = await iLendingPoolAddressesProvider.getLendingPool()
        const LendingPool = await ethers.getContractAt("ILendingPool", LendingPoolAddress, account)
        return LendingPool
}

async function approve(contractAddress, spenderAddress, amount, account){   
    const erc20 = await ethers.getContractAt("IERC20", contractAddress, account) 
//    console.log(`Amount is ${amount}`)
    const txResponse = await erc20.approve(spenderAddress, amount)
//    console.log("Approved !!!")        
    await txResponse.wait(1)
    console.log("Approved !!!")
}

async function getBorrowUserData(lendingPool, deployer){
        const {totalCollateralETH, totalDebtETH, availableBorrowsETH} = await lendingPool.getUserAccountData(deployer)
        console.log(`Total Collateral is ${totalCollateralETH} ETH`)
        console.log(`Total Debt is ${totalDebtETH} ETH`)
        console.log(`Total Available Borrowable amount is ${availableBorrowsETH} ETH`)
        return {availableBorrowsETH, totalDebtETH}
}

async function getDaiPrice(){
    const DaiEthPriceFeed = await ethers.getContractAt("AggregatorV3Interface", "0x773616E4d11A78F511299002da57A0a94577F1f4")
    const DaiEthPrice = (await DaiEthPriceFeed.latestRoundData())[1]
    console.log(`Dai/ETH price is ${DaiEthPrice}`)
    return DaiEthPrice
}

async function borrowDai(lendingPool, daiAddress, amountDaiToBorrow, account){
    const borrowTx = await lendingPool.borrow(daiAddress,amountDaiToBorrow,1,0,account)
    await borrowTx.wait(1)
    console.log("You have borrowed !!!")
}

async function repayDai(lendingPool, daiAddress, amountDaiToBorrow, account){
    const lendingTx = await lendingPool.repay(daiAddress, amountDaiToBorrow, 1, account )
    await lendingTx.wait(1)
    console.log("We have successfully repaid !!!")
}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error)
    process.exit(1)
})  

