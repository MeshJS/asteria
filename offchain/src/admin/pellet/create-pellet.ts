import {
  conStr0,
  integer,
  MeshTxBuilder,
  scriptHash,
  stringToHex,
  UTxO,
} from "@meshsdk/core";
import { hydraProvider, hydraWallet } from "../../../utils.js";
import { admintoken } from "../../../config.js";
import {
  pelletCbor,
  pelletScriptAddress,
  pelletScripthash,
  spacetimeScriptHash,
} from "../deploy/hydra-deploy.js";

const changeAddress = await hydraWallet.getChangeAddress();
const collateral: UTxO = (await hydraWallet.getCollateral())[0]!;
const utxos = await hydraWallet.getUtxos();

export async function createPellet(
  pelletProperty: { posX: number; posY: number; fuel: string }[],
  totalFuelMint: string
) {
  await hydraProvider.connect();
  const fueltokenNameHex = stringToHex("FUEL");
  const fuelReedemer = conStr0([]);

  const txBuilder = new MeshTxBuilder({
    fetcher: hydraProvider,
    submitter: hydraProvider,
    verbose: true,
  });
  txBuilder
    .mintPlutusScriptV3()
    .mint(totalFuelMint, pelletScripthash, fueltokenNameHex)
    .mintingScript(pelletCbor)
    .mintRedeemerValue(fuelReedemer, "JSON");

  for (const pellet of pelletProperty) {
    const pelletDatum = conStr0([
      integer(pellet.posX),
      integer(pellet.posY),
      scriptHash(spacetimeScriptHash),
    ]);

    txBuilder
      .txOut(pelletScriptAddress, [
        {
          unit: pelletScripthash + fueltokenNameHex,
          quantity: pellet.fuel,
        },
        {
          unit: admintoken.policyid + admintoken.name,
          quantity: "1",
        },
      ])
      .txOutInlineDatumValue(pelletDatum, "JSON");
  }
  txBuilder
    .txInCollateral(collateral.input.txHash, collateral.input.outputIndex)
    .changeAddress(changeAddress)
    .selectUtxosFrom(utxos)
    .setNetwork("preprod");

  const unsignedTx = await txBuilder.complete();
  const signedTx = await hydraWallet.signTx(unsignedTx);
  const pelletTxhash = await hydraProvider.submitTx(signedTx);
  return pelletTxhash;
}
