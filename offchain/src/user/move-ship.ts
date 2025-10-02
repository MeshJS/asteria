import {
  Asset,
  byteString,
  conStr0,
  conStr1,
  deserializeDatum,
  integer,
  MeshTxBuilder,
  stringToHex,
  UTxO,
} from "@meshsdk/core";
import { hydraWallet, hydraProvider } from "../../utils.js";
import { fuel_per_step } from "../../config.js";
import {
  pelletCbor,
  pelletScripthash,
  spacetimeCbor,
  spacetimeScriptAddress,
  spacetimeScriptHash,
} from "../admin/deploy/hydra-deploy.js";

async function moveShip(
  delta_X: number,
  delta_Y: number,
  ship_tx_hash: string
) {
  await hydraProvider.connect();
  const changeAddress = await hydraWallet.getChangeAddress();
  const collateral: UTxO = (await hydraWallet.getCollateral())[0]!;
  const utxos = await hydraWallet.getUtxos();

  const shipUtxo = await hydraProvider.fetchUTxOs(ship_tx_hash, 1);
  const ship = shipUtxo[0];
  if (!ship?.output.plutusData) {
    throw Error("Ship Datum is Empty");
  }

  const shipInputFuel = ship.output.amount.find(
    (Asset) => Asset.unit == pelletScripthash + stringToHex("FUEL")
  );
  const shipFuel = shipInputFuel?.quantity;

  const shipInputData = ship.output.plutusData;
  const shipInputDatum = deserializeDatum(shipInputData!).fields;

  const shipDatumPosX: number = shipInputDatum[0].int;
  const shipDatumPosY: number = shipInputDatum[1].int;
  const shipDatumShipTokenName: string = shipInputDatum[2].bytes;
  const shipDatumPilotTokenName: string = shipInputDatum[3].bytes;

  const shipOutputDatum = conStr0([
    integer(Number(shipDatumPosX) + delta_X),
    integer(Number(shipDatumPosY) + delta_Y),
    byteString(shipDatumShipTokenName),
    byteString(shipDatumPilotTokenName),
  ]);

  console.log(shipOutputDatum);

  function distance(delta_X: number, delta_Y: number) {
    return Math.abs(delta_X) + Math.abs(delta_Y);
  }
  function required_fuel(distance: number, fuel_per_step: number) {
    return distance * fuel_per_step;
  }

  const movedDistance = distance(delta_X, delta_Y);
  const spentFuel = required_fuel(movedDistance, fuel_per_step);
  const fuelTokenName = stringToHex("FUEL");

  const assetsToSpacetime: Asset[] = [
    {
      unit: spacetimeScriptHash + shipDatumShipTokenName,
      quantity: "1",
    },
    {
      unit: pelletScripthash + fuelTokenName,
      quantity: (Number(shipFuel) - spentFuel).toString(),
    },
  ];

  const pilotTokenAsset: Asset[] = [
    {
      unit: spacetimeScriptHash + shipDatumPilotTokenName,
      quantity: "1",
    },
  ];

  const moveShipRedeemer = conStr0([integer(delta_X), integer(delta_Y)]);

  const burnfuelRedeemer = conStr1([]);

  const txbuilder = new MeshTxBuilder({
    fetcher: hydraProvider,
    submitter: hydraProvider,
    verbose: true,
  });
  const unsignedTx = await txbuilder
    .spendingPlutusScriptV3()
    .txIn(ship.input.txHash, ship.input.outputIndex)
    .txInRedeemerValue(moveShipRedeemer, "JSON")
    .txInScript(spacetimeCbor)
    .txInInlineDatumPresent()

    .mintPlutusScriptV3()
    .mint((-spentFuel).toString(), pelletScripthash!, fuelTokenName)
    .mintingScript(pelletCbor)
    .mintRedeemerValue(burnfuelRedeemer, "JSON")

    .txOut(hydraWallet.getAddresses().baseAddressBech32!, pilotTokenAsset)
    .txOut(spacetimeScriptAddress, assetsToSpacetime)
    .txOutInlineDatumValue(shipOutputDatum, "JSON")
    .txInCollateral(collateral.input.txHash, collateral.input.outputIndex)
    .changeAddress(changeAddress)
    .selectUtxosFrom(utxos)
    .setNetwork("preprod")
    .complete();

  const signedTx = await hydraWallet.signTx(unsignedTx);
  const moveshipTxhash = await hydraWallet.submitTx(signedTx);
  return moveshipTxhash;
}

export { moveShip };
