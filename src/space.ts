import { SpaceFactory, Space, SpaceCount, Asset, User } from "../generated/schema";
import { Create as FactoryCreate, SpaceNameUpdated, AvatarUpdated } from "../generated/SpaceFactory/SpaceFactory";
import { Create as SpaceCreate, Remove as SpaceRemove, RemoveBodhi } from "../generated/templates/Space/Space";
import { Space as SpaceTemplate } from "../generated/templates";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";


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
    entity.spaceName = event.params.spaceName;
    entity.avatarArTxId = ""; // or null
    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash;

    const asset = Asset.load(event.params.assetId.toString());
    if (asset) {
        entity.spaceAsset = asset.id;
    }
    const user = User.load(creator);
    if (user) {
        entity.spaceUser = user.id;
    }
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

    // let entity = new Space(
    //     event.transaction.hash
    //         .concat(Bytes.fromUTF8("-"))
    //         .concatI32(event.logIndex.toI32())
    // ); 
    // const id = event.params.parentId.toString() + '-' + event.params.assetId.toString()
    const id = event.params.parentId.toString().concat("-").concat(event.params.assetId.toString());
    let entity = new Space(id);
    entity.sender = event.params.sender;
    entity.parentId = event.params.parentId;
    entity.assetId = event.params.assetId;
    entity.arTxId = event.params.arTxId;
    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash;
    entity.isDelete = false;
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

export function handleRemoveBodhi(event: RemoveBodhi): void {
    const id = event.params.parentId.toString().concat("-").concat(event.params.assetId.toString());
    let entity = Space.load(id);
    if (entity) {
        entity.isDelete = true;
        entity.save();
    }
}

