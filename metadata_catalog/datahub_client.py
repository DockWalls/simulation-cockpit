from datahub.emitter.mce_builder import make_dataset_urn, make_tag_urn, make_user_urn
from datahub.emitter.mcp import MetadataChangeProposal
from datahub.emitter.rest_emitter import DatahubRestEmitter
from datahub.metadata.schema_classes import ChangeTypeClass, OwnershipClass, OwnershipTypeClass, TagAssociationClass

# Initialize the DataHub emitter
emitter = DatahubRestEmitter(gms_server="http://localhost:8081")

# Define the dataset
dataset_urn = make_dataset_urn(platform="timescaledb", name="simulation_telemetry")

# Add ownership
ownership_mcp = MetadataChangeProposal(
    entityType="dataset",
    entityUrn=dataset_urn,
    changeType=ChangeTypeClass.UPSERT,
    aspectName="ownership",
    aspect=OwnershipClass(
        owners=[
            {"owner": make_user_urn("jallybean"), "type": OwnershipTypeClass.DATAOWNER}
        ]
    ),
)
emitter.emit_mcp(ownership_mcp)

# Add governance tags
tag_mcp = MetadataChangeProposal(
    entityType="dataset",
    entityUrn=dataset_urn,
    changeType=ChangeTypeClass.UPSERT,
    aspectName="globalTags",
    aspect=TagAssociationClass(tags=[make_tag_urn("sovereign-grid")]),  # Changed from `aspect=TagAssociationClass(tags=[make_tag_urn("sovereign-grid")])` to `aspect=TagAssociationClass(tags=[make_tag_urn("sovereign-grid")])`
)
emitter.emit_mcp(tag_mcp)

print("Successfully populated DataHub with dataset ownership and governance tags.")
