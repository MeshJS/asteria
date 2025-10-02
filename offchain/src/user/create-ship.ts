import {
  Asset,
  assetName,
  conStr0,
  deserializeDatum,
  integer,
  MeshTxBuilder,
  policyId,
  stringToHex,
  UTxO,
} from "@meshsdk/core";
import { hydraProvider, hydraWallet } from "../../utils.js";
import { ship_mint_lovelace_fee, initial_fuel } from "../../config.js";
import { admintoken } from "../../config.js";
import {
  asteriaCbor,
  asteriaScriptAddress,
  pelletCbor,
  pelletScripthash,
  spacetimeCbor,
  spacetimeScriptAddress,
  spacetimeScriptHash,
} from "../admin/deploy/hydra-deploy.js";

async function createShip(posX: number, posY: number) {
  await hydraProvider.connect();
  const changeAddress = await hydraWallet.getChangeAddress();
  const collateral: UTxO = (await hydraWallet.getCollateral())[20]!;
  const utxos = await hydraWallet.getUtxos();
  const asteriaInputUtxos = await hydraProvider.fetchAddressUTxOs(
    asteriaScriptAddress,
    admintoken.policyid + admintoken.name
  );
  const asteria = asteriaInputUtxos[0];
  if (!asteria) {
    throw new Error("create asteria first");
  }
  const asteriaInputAda = asteria.output.amount.find(
    (Asset) => Asset.unit === "lovelace"
  );
  const asteriaInputData = asteria.output.plutusData;
  const asteriaInputDatum = deserializeDatum(asteriaInputData!).fields;

  //datum properties
  const asteriaInputShipcounter = asteriaInputDatum[0].int;
  const asteriaInputShipYardPolicyId = asteriaInputDatum[1].bytes;

  const asteriaOutputDatum = conStr0([
    integer(Number(asteriaInputShipcounter) + 1),
    policyId(asteriaInputShipYardPolicyId),
  ]);

  const fuelTokenName = stringToHex("FUEL");
  const shipTokenName = stringToHex(
    "SHIP" + asteriaInputShipcounter.toString()
  );
  const pilotTokenName = stringToHex(
    "PILOT" + asteriaInputShipcounter.toString()
  );

  const shipDatum = conStr0([
    integer(posX),
    integer(posY),
    assetName(shipTokenName),
    assetName(pilotTokenName),
  ]);

  const assetToSpacetimeAddress: Asset[] = [
    {
      unit: spacetimeScriptHash! + shipTokenName,
      quantity: "1",
    },
    {
      unit: pelletScripthash! + fuelTokenName,
      quantity: initial_fuel,
    },
    {
      unit: "lovelace",
      quantity: "3000000",
    },
  ];
  const totalRewardsAsset: Asset[] = [
    {
      unit: admintoken.policyid + admintoken.name,
      quantity: "1",
    },
    {
      unit: "lovelace",
      quantity: (
        Number(asteriaInputAda?.quantity) + ship_mint_lovelace_fee
      ).toString(),
    },
  ];
  const pilotTokenAsset: Asset[] = [
    {
      unit: spacetimeScriptHash! + pilotTokenName,
      quantity: "1",
    },
    {
      unit: "lovelace",
      quantity: "3000000",
    },
  ];

  const mintShipRedeemer = conStr0([]);
  const addNewshipRedeemer = conStr0([]);
  const mintFuelRedeemer = conStr0([]);

  const txBuilder = new MeshTxBuilder({
    fetcher: hydraProvider,
    submitter: hydraProvider,
    isHydra: true,
    verbose: true,
  });

  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(asteria.input.txHash, asteria.input.outputIndex)
    .txInRedeemerValue(addNewshipRedeemer, "JSON", {
      mem: 1000000,
      steps: 500000000,
    }) //manually evaluate the transaction
    .txInScript(asteriaCbor)
    .txInInlineDatumPresent()
    .txOut(asteriaScriptAddress, totalRewardsAsset)
    .txOutInlineDatumValue(asteriaOutputDatum, "JSON")
    .mintPlutusScriptV3()
    .mint("1", spacetimeScriptHash!, shipTokenName)
    .mintingScript(spacetimeCbor)
    .mintRedeemerValue(mintShipRedeemer, "JSON", {
      mem: 1000000,
      steps: 500000000,
    })
    .mintPlutusScriptV3()
    .mint("1", spacetimeScriptHash!, pilotTokenName)
    .mintingScript(spacetimeCbor)
    .mintRedeemerValue(mintShipRedeemer, "JSON", {
      mem: 1000000,
      steps: 500000000,
    })
    .mintPlutusScriptV3()
    .mint(initial_fuel, pelletScripthash!, fuelTokenName)
    .mintingScript(pelletCbor)
    .mintRedeemerValue(mintFuelRedeemer, "JSON", {
      mem: 1000000,
      steps: 500000000,
    })
    .setFee("6000000")

    .txOut(spacetimeScriptAddress, assetToSpacetimeAddress)
    .txOutInlineDatumValue(shipDatum, "JSON")
    .txOut(hydraWallet.getAddresses().baseAddressBech32!, pilotTokenAsset)
    .txInCollateral(collateral.input.txHash, collateral.input.outputIndex)
    .selectUtxosFrom(utxos)
    .changeAddress(changeAddress)
    .setNetwork("preprod")
    .complete();

  const signedTx = await hydraWallet.signTx(unsignedTx);
  const shiptxHash = await hydraWallet.submitTx(signedTx);
  return shiptxHash;
}
export { createShip };
