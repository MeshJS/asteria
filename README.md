
# Hydra-Asteria 🚀

Hydra-Asteria is a real-time space strategy game built on Cardano’s Hydra Layer 2.
It demonstrates how the eUTxO model and Hydra heads can be used to handle high-throughput, low-latency smart contract transactions in a live gaming environment.

Inspired by [TxPipe's Asteria](https://github.com/txpipe/asteria)


## ⚙️ Technical Details

Real-time Multiplayer
Powered by WebSockets for instant synchronization.

- Hydra Layer 2 Integration

- Hydra head operations (open, commit, close) manage fast transaction throughput.

- Asteria game actions (ship placement, movement, pellet collection, mining) are executed as Hydra transactions.

- Connect your Hydra API URL to interact with the game in Hydra.

- Grid System
The world is a 100x100 Cartesian grid with the center at (0,0). Ships move in discrete steps.

## Prerequisites

- Hydra node and cardano node
 [check tutorial](https://meshjs.dev/hydra/tutorial)

 