import {
  Asset,
  conStr0,
  conStr1,
  conStr2,
  deserializeDatum,
  integer,
  MeshTxBuilder,
  policyId,
  stringToHex,
  UTxO,
} from "@meshsdk/core";
import { hydraProvider, hydraWallet } from "../../utils.js";
import { admintoken, max_asteria_mining } from "../../config.js";
import {
  asteriaCbor,
  asteriaScriptAddress,
  pelletCbor,
  pelletScripthash,
  spacetimeCbor,
  spacetimeScriptHash,
} from "../admin/deploy/hydra-deploy.js";

async function mineAsteria(ship_tx_hash: string) {
  await hydraProvider.connect();
  const changeAddress = await hydraWallet.getChangeAddress();
  const collateral: UTxO = (await hydraWallet.getCollateral())[0]!;
  const utxos = await hydraWallet.getUtxos();
  const ship_utxo = await hydraProvider.fetchUTxOs(ship_tx_hash, 1);
  const ship = ship_utxo[0];
  if (!ship?.output.plutusData) {
    throw Error("ship datum not found");
  }
  const shipInputFuel = ship?.output.amount.find(
    (Asset) => Asset.unit == pelletScripthash + stringToHex("FUEL")
  );

  const asteria_utxo = await hydraProvider.fetchAddressUTxOs(
    asteriaScriptAddress,
    admintoken.policyid + admintoken.name
  );
  const asteria = asteria_utxo[0];
  if (!asteria?.output.plutusData) {
    throw Error(" Asteria datum not found");
  }
  const rewardAda = asteria?.output.amount.find(
    (Asset) => Asset.unit === "lovelace"
  );

  //get input ship datum
  const shipInputData = ship?.output.plutusData;
  const shipInputDatum = deserializeDatum(shipInputData!).fields;

  //get datum properties
  const ship_datum_posX: number = shipInputDatum[0].int;
  const ship_datum_posY: number = shipInputDatum[1].int;
  const ship_datum_shipTokenName: string = shipInputDatum[2].bytes;
  const ship_datum_pilotTokenName: string = shipInputDatum[3].bytes;

  //get asteria datum
  const asteriaInputdata = asteria.output.plutusData;
  const asteriaInputDatum = deserializeDatum(asteriaInputdata!).fields;

  //get datum properties
  const asteria_datum_shipcounter = asteriaInputDatum[0].int;
  const asteria_datum_shipyard_policy = asteriaInputDatum[1].bytes;

  const asteriaOutputDatum = conStr0([
    integer(asteria_datum_shipcounter),
    policyId(asteria_datum_shipyard_policy),
  ]);

  const shipFuel = shipInputFuel?.quantity;
  const totalReward = rewardAda?.quantity!;

  const minedReward =
    Math.floor(Number(totalReward) * max_asteria_mining) / 100;

  const asteria_address_assets: Asset[] = [
    {
      unit: admintoken.policyid + admintoken.name,
      quantity: "1",
    },
    {
      unit: "lovelace",
      quantity: (Number(totalReward) - minedReward).toString(),
    },
  ];
  const pilotAssets: Asset[] = [
    {
      unit: spacetimeScriptHash + ship_datum_pilotTokenName,
      quantity: "1",
    },
    {
      unit: "lovelace",
      quantity: minedReward.toString(),
    },
  ];

  const shipRedemmer = conStr2([]);
  const asteriaRedeemer = conStr1([]);
  const burnShipRedeemer = conStr1([]);
  const burnfuelRedeemer = conStr1([]);

  const txBuilder = new MeshTxBuilder({
    fetcher: hydraProvider,
    submitter: hydraProvider,
    verbose: true,
  });

  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(asteria.input.txHash, asteria.input.outputIndex)
    .spendingReferenceTxInRedeemerValue(asteriaRedeemer, "JSON", {
      mem: 1000000,
      steps: 500000000,
    })
    .txInScript(asteriaCbor)
    .txInInlineDatumPresent()
    .txOut(asteriaScriptAddress, asteria_address_assets)
    .txOutInlineDatumValue(asteriaOutputDatum, "JSON")

    .spendingPlutusScriptV3()
    .txIn(ship.input.txHash, ship.input.outputIndex)
    .spendingReferenceTxInRedeemerValue(shipRedemmer, "JSON", {
      mem: 1000000,
      steps: 500000000,
    })
    .txInScript(spacetimeCbor)
    .txInInlineDatumPresent()

    .mintPlutusScriptV3()
    .mint("-1", spacetimeScriptHash!, ship_datum_shipTokenName)
    .mintingScript(spacetimeCbor)
    .mintRedeemerValue(burnShipRedeemer, "JSON", {
      mem: 1000000,
      steps: 500000000,
    })

    .mintPlutusScriptV3()
    .mint("-" + shipFuel!, pelletScripthash!, stringToHex("FUEL"))
    .mintingScript(pelletCbor)
    .mintRedeemerValue(burnfuelRedeemer, "JSON", {
      mem: 1000000,
      steps: 500000000,
    })

    .txOut(hydraWallet.getAddresses().baseAddressBech32!, pilotAssets)
    .txInCollateral(collateral.input.txHash, collateral.input.outputIndex)
    .selectUtxosFrom(utxos)
    .changeAddress(changeAddress)
    .setNetwork("preprod")
    .complete();

  const signedTx = await hydraWallet.signTx(unsignedTx);
  const txHash = await hydraWallet.submitTx(signedTx);
  return txHash;
}
export { mineAsteria };
