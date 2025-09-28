import React, { useEffect, useRef, useState } from "react";
import getSocket from "../../../apis/connection";
import GameSetup from "@/components/setup";

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

const GameStart: React.FC = () => {
  const gridSize = 100;
  const moveStep = 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const [ships, setShips] = useState<Ship[]>([]);
  const [pellets, setPellets] = useState<Pellet[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [username, setUsername] = useState<string>("");
  const socket = getSocket();

  useEffect(() => {
    const initialState = localStorage.getItem("initialGameState");
    if (initialState) {
      const parsed = JSON.parse(initialState);
      setShips(parsed.ships || []);
      setPellets(parsed.pellets || []);
      setUsername(parsed.username || "Player");
      if (parsed.ships && parsed.ships.length > 0) {
        setShowSetup(false);
      }
    }

    socket.on("pellets-coordinates", (data: { pelletsCoordinates: Pellet[] }) => {
      setPellets(data.pelletsCoordinates || []);
    });

    socket.on("createship-coordinates", (data: { coordinatesArray: Ship[] }) => {
      setShips(data.coordinatesArray);
      setShowSetup(false);
    });

    socket.on("ship-moved", (data: { ship: Ship }) => {
      setShips((prev) => prev.map((s) => (s.id === data.ship.id ? data.ship : s)));
    });

    socket.on("pellet-collected", (data: { pelletId: number }) => {
      setPellets((prev) => prev.filter((p) => p.id !== data.pelletId));
    });

    socket.on("asteria-mined", (data: { username: string }) => {
      alert(`${data.username} has mined Asteria! Game Over!`);
    });

    socket.on("game-cleared", (data: { username: string; message: string }) => {
      setShips([]);
      setPellets([]);
      setSelectedIndex(null);
      alert(data.message);
    });

    socket.on("error", (data: { message: string }) => {
      alert(`Error: ${data.message}`);
    });

    return () => {
      socket.off("pellets-coordinates");
      socket.off("createship-coordinates");
      socket.off("ship-moved");
      socket.off("pellet-collected");
      socket.off("asteria-mined");
      socket.off("game-cleared");
      socket.off("error");
    };
  }, [socket]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null || selectedIndex < 0 || selectedIndex >= ships.length) {
        return;
      }

      const ship = ships[selectedIndex];
      if (!ship) return;

      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case "ArrowUp":
          dy = -moveStep;
          break;
        case "ArrowDown":
          dy = moveStep;
          break;
        case "ArrowLeft":
          dx = -moveStep;
          break;
        case "ArrowRight":
          dx = moveStep;
          break;
        default:
          return;
      }

      socket.emit("ship-moved", { id: ship.id, dx, dy });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, ships, socket]);

  const handleShipClick = (index: number) => {
    setSelectedIndex(index);
    containerRef.current?.focus();
  };

  const handleQuit = () => {
    const storedUsername = JSON.parse(localStorage.getItem("initialGameState") || "{}").username || "currentUser";
    socket.emit("quit", { username: storedUsername });
    localStorage.removeItem("initialGameState");
  };

  const toPercent = (val: number) => `${((val + 50) / 100) * 100}%`;

  const pelletToPercent = (val: number) => `${((val + 50) / 100) * 100}%`;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative w-full h-screen flex items-center justify-center overflow-hidden outline-none"
      style={{
        backgroundImage: "url('/starfield.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {pellets.map((node) => (
        <div
          key={node.id}
          className="absolute group"
          style={{
            left: pelletToPercent(node.x),
            top: pelletToPercent(node.y),
            transform: "translate(-50%, -50%)",
          }}
        >
          <img src="/fuel.svg" alt="pellet" className="w-6 h-6" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-black bg-opacity-70 text-white text-xs rounded-md border border-gray-300 px-2 py-1 whitespace-nowrap z-50">
            ID: {node.id}, Fuel: {node.fuel}
            <br />
            ({node.x}, {node.y})
          </div>
        </div>
      ))}
      <img
        src="/asteria-light.png"
        alt="asteria"
        className="absolute w-20 h-20"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
        }}
      />
      {ships.map((s, index) => (
        <div
          key={s.id}
          className="absolute group"
          style={{
            left: toPercent(s.x),
            top: toPercent(s.y),
            transform: "translate(-50%, -50%)",
            zIndex: index === selectedIndex ? 10 : 1,
          }}
        >
          <img
            src="/landing-ship-1.svg"
            alt="ship"
            className={`w-6 h-6 cursor-pointer ${
              index === selectedIndex ? "ring-2 ring-yellow-400" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleShipClick(index);
            }}
          />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-black bg-opacity-70 text-white text-xs rounded-md border border-gray-300 px-2 py-1 whitespace-nowrap z-50">
            ID: {s.id}
            <br />
            ({s.x}, {s.y})
          </div>
        </div>
      ))}
      <div
        className="absolute border-2 border-gray-400 bg-transparent pointer-events-none"
        style={{
          width: "1%",
          height: "1%",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 3,
        }}
      >
        <span
          className="absolute text-green-400 text-xs"
          style={{ top: "100%", left: "50%", transform: "translateX(-50%)" }}
        >
          (0, 0)
        </span>
      </div>
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white py-2 px-4 rounded-md text-lg">
        {username} - Ships: {ships.length}
      </div>
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white py-2 px-4 rounded-md text-lg">
        <button
          type="button"
          className="text-white font-monocraft-regular bg-black bg-opacity-70 py-2 px-4 rounded-full disabled:opacity-10"
          onClick={handleQuit}
        >
          quit
        </button>
      </div>
      {showSetup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            width: "100vw",
            height: "100vh",
            background: "inherit",
          }}
        >
          <GameSetup />
        </div>
      )}
    </div>
  );
};

export default GameStart;