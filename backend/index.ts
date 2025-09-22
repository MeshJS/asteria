import { Server, Socket } from "socket.io";
import { createServer } from "http";
import express from "express";
import { createShip } from "../offchain/src/user/create-ship.js";
import { gatherFuel } from "../offchain/src/user/gather-fuel.js";
import { mineAsteria } from "../offchain/src/user/mine-asteria.js";
import { moveShip } from "../offchain/src/user/move-ship.js";
import { quit as quitShip } from "../offchain/src/user/quit.js";
import { writeFile, readFile } from "fs/promises";
import { readPelletsCsvFile } from "../offchain/src/admin/pellet/utils.js";
import { HydraProvider } from "@meshsdk/hydra";

interface Ship {
  id: number;
  x: number;
  y: number;
}

interface Pellet {
  id: number;
  x: number;
  y: number;
  fuel: number;
}

interface GameState {
  ships: { [username: string]: Ship[] };
  pellets: Pellet[];
  connectedClients: Set<string>;
}

interface ClientSession {
  username?: string;
  shipTxHash?: string;
  lastActivity: number;
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const gameState: GameState = {
  ships: {},
  pellets: [],
  connectedClients: new Set(),
};

const clientSessions: Map<string, ClientSession> = new Map();

// Load pellets once at startup
let pelletFromCsv: any[];
(async () => {
  pelletFromCsv = await readPelletsCsvFile();
  gameState.pellets = pelletFromCsv.map((pellet, index) => ({
    id: index,
    x: pellet.posX,
    y: pellet.posY,
    fuel: parseInt(pellet.fuel, 10),
  }));
  console.log("Pellets loaded:", gameState.pellets.length);
})();

// Helper function to handle errors consistently
const handleError = (socket: Socket, error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  const message = error instanceof Error ? error.message : String(error);
  socket.emit("error", { message: `${context}: ${message}` });
};

// Helper function to update client session
const updateClientSession = (socketId: string, updates: Partial<ClientSession>) => {
  const session = clientSessions.get(socketId) || { lastActivity: Date.now() };
  clientSessions.set(socketId, { ...session, ...updates, lastActivity: Date.now() });
};

// Helper function to get client session
const getClientSession = (socketId: string): ClientSession | undefined => {
  return clientSessions.get(socketId);
};

io.on("connection", (socket: Socket) => {
  console.log("New client connected:", socket.id);

  // Add client to connected clients
  gameState.connectedClients.add(socket.id);
  updateClientSession(socket.id, {});

  // Emit pellets immediately on connection
  socket.emit("pellets-coordinates", { pelletsCoordinates: gameState.pellets });

  // Handle state recovery request
  socket.on("request-state-recovery", (data: { username: string }) => {
    try {
      console.log(`State recovery requested for ${data.username}`);
      
      if (!data.username || typeof data.username !== "string") {
        handleError(socket, new Error("Invalid username"), "request-state-recovery");
        return;
      }

      const userShips = gameState.ships[data.username];
      if (userShips && userShips.length > 0) {
        console.log(`Restoring state for ${data.username}:`, userShips);
        socket.emit("createship-coordinates", { coordinatesArray: userShips });
        
        updateClientSession(socket.id, { username: data.username });
      } else {
        console.log(`No persistent state found for ${data.username}`);
        socket.emit("no-persistent-state", { username: data.username });
      }
    } catch (err) {
      handleError(socket, err, "request-state-recovery");
    }
  });

  socket.on(
    "initial-shipCoordinates",
    async (data: { shipProperty: { username: string; ships: Ship[] } }) => {
      try {
        console.log("Received initial-shipCoordinates:", data);
        const { username, ships } = data.shipProperty;

        if (!username || typeof username !== "string") {
          handleError(socket, new Error("Invalid username"), "initial-shipCoordinates");
          return;
        }

        if (!Array.isArray(ships) || ships.length !== 1) {
          handleError(socket, new Error("Expected exactly one ship"), "initial-shipCoordinates");
          return;
        }

        const ship = ships[0];
        if (!ship || typeof ship.x !== "number" || typeof ship.y !== "number") {
          handleError(socket, new Error("Invalid ship coordinates"), "initial-shipCoordinates");
          return;
        }

        // Check if username already exists
        if (gameState.ships[username]) {
          handleError(socket, new Error("Username already in use"), "initial-shipCoordinates");
          return;
        }

        // Call createShip function
        let txHash: string | undefined;
        try {
          txHash = await createShip(ship.x, ship.y);
        } catch (err) {
          handleError(socket, err, "initial-shipCoordinates (createShip)");
          return;
        }
        if (!txHash) {
          handleError(socket, new Error(`Failed to create ship at (${ship.x}, ${ship.y})`), "initial-shipCoordinates");
          return;
        }

        console.log("Ship txHash:", txHash);
        await writeFile(
          "./backend/user-hash/ships.json",
          JSON.stringify({ txHash })
        );

        gameState.ships[username] = ships;
        updateClientSession(socket.id, { username, shipTxHash: txHash });

        io.emit("createship-coordinates", { coordinatesArray: ships });
        console.log(`Ship created for ${username} at (${ship.x}, ${ship.y})`);
      } catch (err) {
        handleError(socket, err, "initial-shipCoordinates");
      }
    }
  );

  socket.on(
    "ship-moved",
    async (data: { id: number; dx: number; dy: number }) => {
      try {
        console.log("Received ship-moved:", data);
        const { id, dx, dy } = data;

        // Validate input
        if (typeof id !== "number" || typeof dx !== "number" || typeof dy !== "number") {
          handleError(socket, new Error("Invalid movement data"), "ship-moved");
          return;
        }

        // Get client session
        const session = getClientSession(socket.id);
        if (!session?.username || !session?.shipTxHash) {
          handleError(socket, new Error("No active session found"), "ship-moved");
          return;
        }

        const username = session.username;
        const shipTxHash = session.shipTxHash;

        // Find ship in game state
        const userShips = gameState.ships[username];
        if (!userShips) {
          handleError(socket, new Error("No ships found for user"), "ship-moved");
          return;
        }

        const shipIndex = userShips.findIndex((s) => s.id === id);
        if (shipIndex === -1) {
          handleError(socket, new Error(`Ship not found for ID ${id}`), "ship-moved");
          return;
        }

        const ship = { ...userShips[shipIndex] };
        const newX = Math.max(-50, Math.min(50, ship.x + dx));
        const newY = Math.max(-50, Math.min(50, ship.y + dy));

        if (newX === ship.x && newY === ship.y) {
          console.log("Ship movement blocked by boundary");
          return;
        }

        // Update ship position
        ship.x = newX;
        ship.y = newY;
        gameState.ships[username][shipIndex] = ship;

        // Emit movement to all clients
        io.emit("ship-moved", { ship });

        // Call moveShip function
        let moveTxHash: string | undefined;
        try {
          moveTxHash = await moveShip(dx, dy, shipTxHash);
        } catch (err) {
          handleError(socket, err, "ship-moved (moveShip)");
          return;
        }
        if (!moveTxHash) {
          handleError(socket, new Error(`Failed to move ship ${id}`), "ship-moved");
          return;
        }

        await writeFile("./backend/user-hash/ships.json", JSON.stringify({ txHash: moveTxHash }));
        updateClientSession(socket.id, { shipTxHash: moveTxHash });

        // Pellet collision check
        const pelletIndex = gameState.pellets.findIndex((p) => p.x === ship.x && p.y === ship.y);
        if (pelletIndex !== -1) {
          const collectedPellet = gameState.pellets.splice(pelletIndex, 1)[0];
          let fuelTxHash: string | undefined;
          try {
            fuelTxHash = await gatherFuel(
              moveTxHash,
              " ",
              collectedPellet.id,
              collectedPellet.fuel - 10
            );
          } catch (err) {
            handleError(socket, err, "ship-moved (gatherFuel)");
            return;
          }
          if (fuelTxHash) {
            io.emit("pellet-collected", { pelletId: collectedPellet.id });
            await writeFile("./backend/user-hash/ships.json", JSON.stringify({ txHash: fuelTxHash }));
            updateClientSession(socket.id, { shipTxHash: fuelTxHash });
            console.log(`Pellet ${collectedPellet.id} collected by ${username}`);
          }
        }

        // Asteria check
        if (ship.x === 0 && ship.y === 0) {
          let mineTxHash: string | undefined;
          try {
            mineTxHash = await mineAsteria(moveTxHash);
          } catch (err) {
            handleError(socket, err, "ship-moved (mineAsteria)");
            return;
          }
          if (mineTxHash) {
            await writeFile("./backend/user-hash/ships.json", JSON.stringify({ txHash: mineTxHash }));
            io.emit("asteria-mined", { username });
            gameState.ships = {};
            gameState.pellets = [];
            io.emit("game-cleared", { message: "Game reset due to Asteria mined" });
            console.log(`${username} mined Asteria! Game reset.`);
          }
        }

        console.log(`Ship ${id} moved to (${ship.x}, ${ship.y}) by ${username}`);
      } catch (err) {
        handleError(socket, err, "ship-moved");
      }
    }
  );

  socket.on("quit", async (data: { username: string }) => {
    try {
      console.log(`Quit from ${data.username}`);

      if (!data.username || typeof data.username !== "string") {
        handleError(socket, new Error("Invalid username"), "quit");
        return;
      }

      // Get client session
      const session = getClientSession(socket.id);
      if (!session?.shipTxHash) {
        handleError(socket, new Error("No active session found"), "quit");
        return;
      }

      // Call quit function
      let quitTxHash: string | undefined;
      try {
        quitTxHash = await quitShip(session.shipTxHash);
      } catch (err) {
        handleError(socket, err, "quit (quitShip)");
        return;
      }
      if (quitTxHash) {
        await writeFile("./backend/user-hash/ships.json", JSON.stringify({ txHash: quitTxHash }));
      }

      // Clean up game state
      delete gameState.ships[data.username];
      clientSessions.delete(socket.id);

      io.emit("game-cleared", { username: data.username, message: `${data.username} quit` });
      console.log(`${data.username} quit successfully`);
    } catch (err) {
      handleError(socket, err, "quit");
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // Only clean up connection tracking, keep ship state persistent
    const session = getClientSession(socket.id);
    if (session?.username) {
      console.log(`Client ${session.username} disconnected, keeping ship state persistent`);
    }

    gameState.connectedClients.delete(socket.id);
    clientSessions.delete(socket.id);
  });
});

const PORT = Number(process.env.PORT ?? 3002);
httpServer.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));