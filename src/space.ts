import { SpaceFactory, Space,SpaceCount } from "../generated/schema";
import { Create as FactoryCreate, SpaceNameUpdated, AvatarUpdated } from "../generated/SpaceFactory/SpaceFactory";
import { Create as SpaceCreate, Remove as SpaceRemove } from "../generated/templates/Space/Space";
import { Space as SpaceTemplate } from "../generated/templates";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { getOrCreateAsset } from "./store";

// Helper function to get or create a SpaceFactory entity
function getOrCreateSpaceFactory(creator: string): SpaceFactory {
    let entity = SpaceFactory.load(creator);
    if (entity == null) {
        entity = new SpaceFactory(creator);
        // entity.user = Bytes.empty(); // Set to empty to ensure it's not null
        // entity.spaceId = BigInt.fromI32(0); // Initialize with default value
        // entity.spaceAddress = Bytes.empty(); // Set to empty to ensure it's not null
        // entity.descriptionAssetId = BigInt.fromI32(0); // Initialize with default value
        // entity.spaceName = ""; // Initialize with default value
        // entity.avatarArTxId = ""; // Initialize with default value
        // entity.blockNumber = BigInt.fromI32(0); // Initialize with default value
        // entity.blockTimestamp = BigInt.fromI32(0); // Initialize with default value
        // entity.transactionHash = Bytes.empty(); // Set to empty to ensure it's not null
    }
    return entity;
}

// Helper function to get or create a SpaceCount entity
function getOrCreateSpaceCount(parentId: BigInt): SpaceCount {
    let id = parentId.toString();
    let entity = SpaceCount.load(id);
    if (entity == null) {
        entity = new SpaceCount(id);
        entity.parentId = parentId;
        entity.count = BigInt.fromI32(0);
    }
    return entity;
}

// export function handleCreateCall(call: createCall): void {
//     // handle function call if needed
// }

export function handleFactoryCreate(event: FactoryCreate): void {
    let creator = event.params.creator.toHexString();
    let entity = getOrCreateSpaceFactory(creator);

    entity.user = event.params.creator;
    entity.spaceId = event.params.spaceId;
    entity.spaceAddress = event.params.spaceAddress;
    entity.descriptionAssetId = event.params.assetId;
    entity.spaceName =  event.params.spaceName;
    entity.avatarArTxId = ""; // or null
    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash;

    const asset = getOrCreateAsset(event.params.assetId);
    entity.asset=asset.id;
    entity.save();

    // Create a new Space template instance for the dynamically created Space contract
    SpaceTemplate.create(event.params.spaceAddress);
}

export function handleSpaceNameUpdated(event: SpaceNameUpdated): void {
    let user = event.params.sender.toHexString();
    let entity = getOrCreateSpaceFactory(user);

    entity.spaceName = event.params.newSpaceName;
    entity.save();
}

export function handleAvatarUpdated(event: AvatarUpdated): void {
    let user = event.params.sender.toHexString();
    let entity = getOrCreateSpaceFactory(user);

    entity.avatarArTxId = event.params.arTxId;
    entity.save();
}

export function handleSpaceCreate(event: SpaceCreate): void {  
    let spaceFactoryEntity = SpaceFactory.load(event.params.sender.toHexString());

    let entity = new Space(
        event.transaction.hash
            .concat(Bytes.fromUTF8("-"))
            .concatI32(event.logIndex.toI32())
    );

    entity.sender = event.params.sender;
    entity.parentId = event.params.parentId;
    entity.assetId = event.params.assetId;
    entity.arTxId = event.params.arTxId;
    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash;
    if (spaceFactoryEntity == null) {
        entity.spaceFactory = "";
    } else {
        entity.spaceFactory = spaceFactoryEntity.id;
    }

    entity.save();

     // Update SpaceCount
     let spaceCountEntity = getOrCreateSpaceCount(event.params.parentId);
     spaceCountEntity.count = spaceCountEntity.count.plus(BigInt.fromI32(1));
     spaceCountEntity.save();
}