import {
  hydraWallet,
  hydraProvider,
} from "../../../utils.js";
import { admintoken } from "../../../config.js";
import {conStr2, MeshTxBuilder} from "@meshsdk/core";
import { asteriaCbor } from "../deploy/hydra-deploy.js";

const utxos = await hydraWallet.getUtxos();
const changeAddress = await hydraWallet.getChangeAddress();
const collateral = (await hydraWallet.getCollateral())[0]!;

const consumeAsteria = async (asteriaTxHash: string, outputIndex: number) => {
  await hydraProvider.connect();
  const asteriaUtxos = await hydraProvider.fetchUTxOs(asteriaTxHash, outputIndex);
  const asteria = asteriaUtxos[0];

  const adminTokenUnit = admintoken.policyid + admintoken.name;
  const adminUTxOs = await hydraWallet
    .getUtxos()
    .then((us) =>
      us.filter((u) =>
        u.output.amount.find((Asset) => Asset.unit === adminTokenUnit)
      )
    );

  const adminUtxo = adminUTxOs[0];
  const consumeRedeemer = conStr2([]);
  const param = await hydraProvider.fetchProtocolParameters();

  const txBuilder = new MeshTxBuilder({
    provider: hydraProvider,
    fetcher: hydraProvider,
    submitter: hydraProvider,
  });

  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(asteria!.input.txHash, asteria!.input.outputIndex)
    .txInRedeemerValue(consumeRedeemer, "JSON")
    .txInInlineDatumPresent()
    .txInScript(asteriaCbor)

    .txIn(adminUtxo!.input.txHash, adminUtxo!.input.outputIndex)
    .txInCollateral(collateral.input.txHash, collateral.input.outputIndex)
    .selectUtxosFrom(utxos)
    .setNetwork("preprod")
    .changeAddress(changeAddress)
    .complete();

  const signedTx = await hydraWallet.signTx(unsignedTx);
  console.log("signedTx", signedTx);
  const txHash = await hydraProvider.submitTx(signedTx);
  return txHash;
};

export { consumeAsteria };
