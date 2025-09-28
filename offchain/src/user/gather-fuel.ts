import {
  Asset,
  byteString,
  conStr,
  conStr0,
  deserializeDatum,
  integer,
  MeshTxBuilder,
  policyId,
  stringToHex,
  UTxO,
} from "@meshsdk/core";
import { hydraProvider, hydraWallet } from "../../utils.js";
import { admintoken } from "../../config.js";
import {
  pelletCbor,
  pelletScriptAddress,
  pelletScripthash,
  spacetimeCbor,
  spacetimeScriptAddress,
  spacetimeScriptHash,
} from "../admin/deploy/hydra-deploy.js";

const changeAddress = await hydraWallet.getChangeAddress();
const collateral: UTxO = (await hydraWallet.getCollateral())[0]!;
const utxos = await hydraWallet.getUtxos();

async function gatherFuel(
  ship_tx_hash: string,
  pellet_tx_Hash: string,
  pellet_tx_index: number,
  gather_amount: number
) {
  await hydraProvider.connect();
  const shipUtxo = await hydraProvider.fetchUTxOs(ship_tx_hash, 1);
  const pelletUtxo = await hydraProvider.fetchUTxOs(
    pellet_tx_Hash,
    pellet_tx_index
  );

  const ship = shipUtxo[0];
  if (!ship?.output.plutusData) {
    throw Error("Ship datum is empty");
  }
  const pellet = pelletUtxo[0];
  if (!pellet?.output.plutusData) {
    throw Error("Pellet Datum is Empty");
  }

  const shipInputAda = ship.output.amount.find(
    (asset) => asset.unit === "lovelace"
  );
  console.log("ship input ada", shipInputAda);
  const fueltokenUnit = pelletScripthash + stringToHex("FUEL");

  const shipInputFuel = ship.output.amount.find(
    (asset) => asset.unit === fueltokenUnit
  );

  const pelletInputFuel = pellet.output.amount.find(
    (asset) => asset.unit === fueltokenUnit
  );

  const inputFuel = Number(pelletInputFuel?.quantity);
  if (gather_amount > inputFuel - 30) {
    throw new Error("Gather amount must be at least 30 less than input fuel");
  }

  const pellet_fuel = Number(pelletInputFuel?.quantity);
  console.log("gather amount", gather_amount);
  const shipInputData = ship.output.plutusData;
  const shipInputDatum = deserializeDatum(shipInputData).fields;

  const ShipPosX: number = shipInputDatum[0].int;
  const shipPoxY: number = shipInputDatum[1].int;
  const shipTokenName: string = shipInputDatum[2].bytes;
  const pilotTokenName: string = shipInputDatum[3].bytes;

  const shipOutDatum = conStr0([
    integer(ShipPosX),
    integer(shipPoxY),
    byteString(shipTokenName),
    byteString(pilotTokenName),
  ]);

  const pelletInputData = pellet.output.plutusData;
  const pelletInputDatum = deserializeDatum(pelletInputData).fields;

  const pelletPosX: number = pelletInputDatum[0].int;
  const pelletPosY: number = pelletInputDatum[1].int;
  const pelletInputShipyardPolicy: string = pelletInputDatum[2].bytes;

  const pelletOuputDatum = conStr0([
    integer(pelletPosX),
    integer(pelletPosY),
    policyId(pelletInputShipyardPolicy),
  ]);

  const shipFuel = shipInputFuel?.quantity;
  console.log("ship input ada", shipInputAda);
  const spacetimeOutputAssets: Asset[] = [
    {
      unit: shipInputAda?.unit!,
      quantity: shipInputAda?.quantity!,
    },
    {
      unit: spacetimeScriptHash + shipTokenName,
      quantity: "1",
    },
    {
      unit: pelletInputFuel?.unit!,
      quantity: (Number(shipFuel!) + gather_amount).toString(),
    },
  ];

  const pelletOutputAssets: Asset[] = [
    {
      unit: admintoken.policyid + admintoken.name,
      quantity: "1",
    },
    {
      unit: pelletInputFuel?.unit!,
      quantity: (Number(pellet_fuel) - gather_amount).toString(),
    },
  ];

  const pilot_token_asset: Asset[] = [
    {
      unit: spacetimeScriptHash + pilotTokenName,
      quantity: "1",
    },
  ];

  const shipRedeemer = conStr(1, [integer(gather_amount)]);
  const pelletRedemer = conStr0([integer(gather_amount)]);

  const txBuilder = new MeshTxBuilder({
    fetcher: hydraProvider,
    submitter: hydraProvider,
    verbose: true,
  });

  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(ship.input.txHash, ship.input.outputIndex)
    .txInRedeemerValue(shipRedeemer, "JSON")
    .txInScript(spacetimeCbor)
    .txInInlineDatumPresent()
    .txOut(pelletScriptAddress, pelletOutputAssets)
    .txOutInlineDatumValue(pelletOuputDatum, "JSON")

    .spendingPlutusScriptV3()
    .txIn(pellet.input.txHash, pellet.input.outputIndex)
    .txInRedeemerValue(pelletRedemer, "JSON")
    .txInScript(pelletCbor)
    .txInInlineDatumPresent()
    .txOut(spacetimeScriptAddress, spacetimeOutputAssets)
    .txOutInlineDatumValue(shipOutDatum, "JSON")

    .txOut(hydraWallet.getAddresses().baseAddressBech32!, pilot_token_asset)
    .txInCollateral("5a7bdf5f213bcfcb6369caec434d1506d5802330e0632f15c9acadacbbe0b971",2)
    .selectUtxosFrom(utxos)
    .changeAddress(changeAddress)
    .setNetwork("preprod")
    .complete();

  const signedTx = await hydraWallet.signTx(unsignedTx);
  const txHash = await hydraWallet.submitTx(signedTx);
  return txHash;
}
export { gatherFuel };