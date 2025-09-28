import { MeshWallet, BlockfrostProvider, MaestroProvider} from "@meshsdk/core";
import { writeFile } from "fs/promises";
import { join } from 'path';
import { config } from 'dotenv';
import { HydraProvider } from "@meshsdk/hydra";

config({ path: join(process.cwd(), '.env') });

const seedPhrase  = process.env.SEED_PHRASE?.split(' ');
if(seedPhrase == undefined){
  throw new Error("Enter your seedphrase in an env file")
}
const blockfrost_API = process.env.BLOCKFROST_APIKEY;
if(blockfrost_API == undefined){
  throw new Error("Enter your blockfrost key in an env file")
}
const maestro_API = process.env.MAESTRO_APIKEY;
if(maestro_API == undefined){
  throw new Error("Enter your maestro key in an env file")
}
export const blockchainProvider = new BlockfrostProvider(blockfrost_API);
export const hydra_api_url = process.env.HYDRA_API_URL;
if(hydra_api_url == undefined){
  throw new Error("Enter your hydra api url in an env file")
}
export const hydraProvider = new HydraProvider({
  httpUrl: hydra_api_url,
});

export const myWallet = new MeshWallet({
  networkId: 0,
  fetcher: blockchainProvider,
  submitter: blockchainProvider,
  key: {
    type: 'mnemonic',
    words: seedPhrase,
  },
});

export const hydraWallet = new MeshWallet({
  networkId: 0, 
  fetcher: hydraProvider,
  submitter: hydraProvider,
  key: {
    type: 'mnemonic',
    words: seedPhrase,
  },
});

export const maestroprovider = new MaestroProvider({
  network: "Preprod",
  apiKey: maestro_API,
  turboSubmit:false
});

const __dirname = (process.cwd())
const __filedir = join(__dirname, 'src/offchain/src/admin/deploy/ref-script/');

export const writeScriptRefJson = async (filename: string, txHash: string) => {
  await writeFile(
    __filedir + filename + ".json",
    JSON.stringify({ txHash: txHash })
    );
};