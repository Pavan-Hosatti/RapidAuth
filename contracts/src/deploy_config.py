import logging
import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    from smart_contracts.artifacts.placementverify.placement_verify_client import (
        PlacementVerifyFactory,
    )

    # Create Algorand client
    algorand = algokit_utils.AlgorandClient.from_environment()

    # Deployer account
    deployer = algorand.account.from_environment("DEPLOYER")

    # Typed factory for your app
    factory = algorand.client.get_typed_app_factory(
        PlacementVerifyFactory,
        default_sender=deployer.address,
    )

    # Deploy the app
    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )

    logger.info(
        f"Deployment result: {result.operation_performed}, "
        f"App ID: {app_client.app_id}"
    )

    # Fund app account (required)
    algorand.send.payment(
        algokit_utils.PaymentParams(
            sender=deployer.address,
            receiver=app_client.app_address,
            amount=algokit_utils.AlgoAmount(algo=1),
        )
    )

    logger.info("App account funded with 1 ALGO")
