import {
  Asset,
  conStr0,
  integer,
  MeshTxBuilder,
  policyId,
} from "@meshsdk/core";
import { hydraWallet, hydraProvider } from "../../../utils.js";
import { admintoken } from "../../../config.js";
import {
  asteriaScriptAddress,
  spacetimeScriptHash,
} from "../deploy/hydra-deploy.js";

const utxos = await hydraWallet.getUtxos();
const changeAddress = await hydraWallet.getChangeAddress();

export async function createAsteria() {
  await hydraProvider.connect();

  const asteriaDatum = conStr0([integer(0), policyId(spacetimeScriptHash!)]);
  const totalRewardsAsset: Asset[] = [
    {
      unit: "lovelace",
      quantity: "100000000",
    },
    {
      unit: admintoken.policyid + admintoken.name,
      quantity: "1",
    },
  ];

  const txBuilder = new MeshTxBuilder({
    fetcher: hydraProvider,
    submitter: hydraProvider,
    verbose: true,
  });

  const unsignedTx = await txBuilder
    .txOut(asteriaScriptAddress, totalRewardsAsset)
    .txOutInlineDatumValue(asteriaDatum, "JSON")
    .selectUtxosFrom(utxos)
    .changeAddress(changeAddress)
    .setNetwork("preprod")
    .complete();

  const signedTx = await hydraWallet.signTx(unsignedTx);
  const asteriaTxhash = await hydraWallet.submitTx(signedTx);
  return asteriaTxhash;
}
