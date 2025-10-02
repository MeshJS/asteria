import { hydraWallet, hydraProvider } from "../../utils.js";
import {
  conStr1,
  conStr3,
  deserializeDatum,
  MeshTxBuilder,
  stringToHex,
  UTxO,
} from "@meshsdk/core";
import {
  pelletCbor,
  pelletScripthash,
  spacetimeCbor,
  spacetimeScriptHash,
} from "../admin/deploy/hydra-deploy.js";

async function quit(ship_tx_hash: string) {
  hydraProvider.connect();
  const changeAddress = await hydraWallet.getChangeAddress();
  const collateral: UTxO = (await hydraWallet.getCollateral())[0]!;
  const utxos = await hydraWallet.getUtxos();
  const fuelTokenName = stringToHex("FUEL");

  const shipUtxos = await hydraProvider.fetchUTxOs(ship_tx_hash, 1);

  const ship = shipUtxos[0];
  if (!ship?.output.plutusData) {
    throw new Error("ship datum not found");
  }
  const shipInputFuel = ship?.output.amount.find(
    (Asset) => Asset.unit == pelletScripthash + fuelTokenName
  );
  if (!shipInputFuel) {
    throw new Error("ship input Fuel not found");
  }

  const shipInputData = ship.output.plutusData;
  const shipInputDatum = deserializeDatum(shipInputData!).fields;
  const shipFuel = shipInputFuel?.quantity;

  const ship_datum_PosX: number = shipInputDatum[0].int;
  const ship_datum_PosY: number = shipInputDatum[1].int;
  const ship_datum_ShipTokenName: string = shipInputDatum[2].bytes;
  const ship_datum_PilotTokenName: string = shipInputDatum[3].bytes;

  const burnShipRedeemer = conStr1([]);
  const burnfuelRedeemer = conStr1([]);
  const quitRedeemer = conStr3([]);

  const txbuilder = new MeshTxBuilder({
    submitter: hydraProvider,
    fetcher: hydraProvider,
    verbose: true,
  });
  console.log("ship fuel", shipFuel);
  const unsignedTx = await txbuilder
    .spendingPlutusScriptV3()
    .txIn(ship.input.txHash, ship.input.outputIndex)
    .txInRedeemerValue(quitRedeemer, "JSON")
    .txInInlineDatumPresent()
    .txInScript(spacetimeCbor)

    .mintPlutusScriptV3()
    .mint("-1", spacetimeScriptHash!, ship_datum_ShipTokenName)
    .mintingScript(spacetimeCbor)
    .mintRedeemerValue(burnShipRedeemer, "JSON")
    .mintPlutusScriptV3()
    .mint("-" + shipFuel, pelletScripthash!, fuelTokenName)
    .mintingScript(pelletCbor)
    .mintRedeemerValue(burnfuelRedeemer, "JSON")

    .txOut(hydraWallet.addresses.baseAddressBech32!, [
      {
        unit: spacetimeScriptHash + ship_datum_PilotTokenName,
        quantity: "1",
      },
    ])
    .txInCollateral(collateral.input.txHash, collateral.input.outputIndex)
    .changeAddress(changeAddress)
    .selectUtxosFrom(utxos)
    .setNetwork("preprod")
    .complete();

  const signedTx = await hydraWallet.signTx(unsignedTx);
  const txhash = await hydraWallet.submitTx(signedTx);
  return txhash;
}

export { quit };
