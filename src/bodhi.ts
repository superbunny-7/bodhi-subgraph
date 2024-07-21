import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  Create as CreateEvent,
  Remove as RemoveEvent,
  Trade as TradeEvent,
  TransferBatch as TransferBatchEvent,
  TransferSingle as TransferSingleEvent,
} from "../generated/Bodhi/Bodhi";
import {
  ADDRESS_ZERO,
  BD_WAD,
  BD_ZERO,
  BI_ONE,
  BI_ZERO,
  fromWei,
  TRADERHELPER,
} from "./number";
import {
  newCreate,
  newRemove,
  newTrade,
  newTransferFromSingle,
  newTransferFromBatch,
  getOrCreateUserAsset,
  getOrCreateUser,
  getOrCreateAsset,
} from "./store";
import { Asset, User } from "../generated/schema";

export function handleCreate(event: CreateEvent): void {

  if (event.params.isContract == false) {
    newCreate(event);

    let user = getOrCreateUser(event.params.sender, event.params.isContract);
    user.totalAssets = user.totalAssets.plus(BI_ONE);
    user.save();

    const asset = getOrCreateAsset(event.params.assetId);
    asset.assetId = event.params.assetId;
    asset.arTxId = event.params.arTxId;
    asset.creator = event.params.sender.toHexString();
    asset.save();

    const userAsset = getOrCreateUserAsset(user, asset);
    userAsset.amount = BigDecimal.fromString("1");
    userAsset.save();
  }

}

export function handleRemove(event: RemoveEvent): void {
  let asset = Asset.load(event.params.assetId.toString());
  if (asset) {
    asset.isDelete = true;
    asset.save();

    const creator = getOrCreateUser(Address.fromString(asset.creator!), false);
    creator.totalAssets = creator.totalAssets.minus(BI_ONE);
    creator.save();
    
    newRemove(event);
  }
}

export function handleTrade(event: TradeEvent): void {
  const trader = getOrCreateUser(event.params.sender, event.params.isContract);
  newTrade(event, trader);

  const asset = getOrCreateAsset(event.params.assetId);

  const deltaAmount = fromWei(event.params.tokenAmount);
  const creatorFee = fromWei(event.params.creatorFee);
  const platformFee = fromWei(event.params.platformFee);
  const ethAmount = fromWei(event.params.ethAmount);


  // if (asset) {

  // if (event.params.isContract == false) {
  //   const trader = User.load(event.params.sender.toHexString());
  //   if (trader == null) {
  //     let user = getOrCreateUser(event.params.sender, false);
  //     user.totalAssets = user.totalAssets.plus(BI_ONE);
  //     user.save();

  //     const userAsset = getOrCreateUserAsset(event.params.sender.toHexString(), asset);
  //     userAsset.amount = BigDecimal.fromString("1");
  //     userAsset.save();
  //   }
  // }


  if (event.params.tradeType == 0) {
    //MINT 
    asset.totalSupply = deltaAmount;
    asset.save();
    trader.save();
    return;
  }

  if (event.params.tradeType == 1) {
    //Buy
    asset.totalTrades = asset.totalTrades.plus(BI_ONE);
    asset.totalSupply = asset.totalSupply.plus(deltaAmount);
  } else {
    //Sell
    asset.totalTrades = asset.totalTrades.plus(BI_ONE);
    asset.totalSupply = asset.totalSupply.minus(deltaAmount);
  }
  asset.totalFees = asset.totalFees.plus(creatorFee); //.plus(platformFee);
  // asset.totalVolume = asset.totalVolume.plus(ethAmount);
  asset.totalTradValue = asset.totalTradValue.plus(ethAmount);
  asset.totalTradVolume = asset.totalTradVolume.plus(deltaAmount);
  asset.save();

  const creator = getOrCreateUser(Address.fromString(asset.creator!), false);

  // if (creator) {
  creator.totalTrades = creator.totalTrades.plus(BI_ONE);
  creator.totalFees = creator.totalFees.plus(creatorFee);
  creator.totalTradValue = creator.totalTradValue.plus(ethAmount);
  creator.totalTradVolume = creator.totalTradVolume.plus(deltaAmount);
  creator.save();
  // }


  // if (event.params.tradeType == 1) {
  //   // if (event.params.isContract == false) {
  //   const cost = creatorFee.plus(platformFee).plus(ethAmount);

  //   const traderAsset = getOrCreateUserAsset(trader, asset);
  //   traderAsset.avgPrice = traderAsset.amount
  //     .minus(deltaAmount)
  //     .times(traderAsset.avgPrice)
  //     .plus(cost)
  //     .div(traderAsset.amount);
  //   traderAsset.save();

  //   // }
  // }

  // }

}

export function handleTransferBatch(event: TransferBatchEvent): void {
  for (let i = 0; i < event.params.ids.length; i++) {
    const id = event.params.ids[i];
    const amount = event.params.amounts[i];
    handleTransfer(id, event.params.from, event.params.to, amount);
    newTransferFromBatch(event, i);
  }
}

export function handleTransferSingle(event: TransferSingleEvent): void {
  handleTransfer(
    event.params.id,
    event.params.from,
    event.params.to,
    event.params.amount
  );
  newTransferFromSingle(event);
}

function handleTransfer(
  id: BigInt,
  from: Address,
  to: Address,
  amount: BigInt
): void {
  const asset = getOrCreateAsset(id);
  const amountBd = fromWei(amount);
  let assetChanged = false;

  if (asset.creator) {
    const creator = getOrCreateUser(Address.fromString(asset.creator!), false);

    if (from.toHexString() != ADDRESS_ZERO) {

      //Sell
      const isContract=from.toHexString()==TRADERHELPER;
      const fromUser = getOrCreateUser(from, isContract);
      const userAsset = getOrCreateUserAsset(fromUser, asset);
      userAsset.amount = userAsset.amount.minus(amountBd);

      if (userAsset.amount.equals(BD_ZERO)) {
        asset.totalHolders = asset.totalHolders.minus(BI_ONE);
        creator.totalHolders = creator.totalHolders.minus(BI_ONE);
        assetChanged = true;
      }
      userAsset.save();
    }

    if (to.toHexString() != ADDRESS_ZERO) {
      //Buy
      const isContract=to.toHexString()==TRADERHELPER;
      const toUser = getOrCreateUser(to, isContract);
      const userAsset = getOrCreateUserAsset(toUser, asset);
      if (userAsset.amount.equals(BD_ZERO) && amountBd.gt(BD_ZERO)) {
        asset.totalHolders = asset.totalHolders.plus(BI_ONE);
        creator.totalHolders = creator.totalHolders.plus(BI_ONE);
        assetChanged = true;
      }
      userAsset.amount = userAsset.amount.plus(amountBd);
      userAsset.save();
    }

    if (assetChanged) {
      asset.save();
      creator.save();
    }
  }
}

