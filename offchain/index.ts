import { deployAsteria } from "./src/admin/deploy/asteria.js";
import { deployPellet } from "./src/admin/deploy/pellet.js";
import { deploySpacetime } from "./src/admin/deploy/spacetime.js";
import { createAsteria } from "./src/admin/asteria/create-asteria.js";
import { createPellet } from "./src/admin/pellet/create-pellet";
import { createPelletTest } from "./src/admin/pellet/create-pellet-test.js";
import { createShip } from "./src/user/create-ship.js";
import { moveShip } from "./src/user/move-ship.js";
import { gatherFuel } from "./src/user/gather-fuel.js";
import { mineAsteria } from "./src/user/mine-asteria.js";

//const txHash = await gatherFuel("22321f99e5725b4a5538359b81916b520daaf2687e5ef9d9ce6b0d15ef5d1852","93b4f3fd721c1169c969a8a8ad5345604bb6dd13e8c9c3b8f650ef786fd30ff2",10,50);

const txHash = await moveShip(-1,0,"f7f645eafadcdb4d6124711741427daf6f7f0b9e912a8e5ceef644f18f752b58")
console.log(txHash);