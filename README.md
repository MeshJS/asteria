# hydra-asteria

**Hydra-Asteria** is a real-time space strategy game built on Cardano's Hydra Layer 2.  
It demonstrates the power of the UTxO model and Hydra for running smart contract transactions at scale.  
Inspired by [TxPipe's Asteria](https://github.com/txpipe/asteria) on Cardano L1.



## Gameplay Overview

- **Objective:**  
  Navigate your ships through a 100x100 grid, collect fuel pellets, and be the first to reach the center (0,0) to mine the Asteria crystal and win the game.

- **Multiplayer:**  
  Play in real-time against other players. All actions are synchronized instantly using WebSockets.


## Technical Details

- **Real-time Multiplayer:**  
  Powered by WebSockets for instant action synchronization.
- **Hydra L2 Integration:**  
  Connect your Hydra API URL to experience Cardano's layer 2 scaling and the eUTxO model in action.
- **Grid System:**  
  The game world is a 100x100 grid with the center at (0,0). Ships move in discrete steps.

## 📄 License

MIT License

Enjoy exploring the stars and racing for Asteria!
