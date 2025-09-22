import Link from "next/link";

export default function Landing() {
  return (
    <div className="w-full h-screen relative overflow-hidden game-container">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/starfield.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <img 
        src="/rocket.svg" 
        className="pointer-events-none h-[40vh] absolute bottom-0 left-0 opacity-80" 
        alt="Rocket"
      />
      <img 
        src="/ship_3.svg" 
        className="pointer-events-none h-[35vh] absolute top-10 right-6 opacity-70" 
        alt="Ship"
      />
      
      <div className="relative z-10 min-h-screen flex flex-col justify-center items-center text-center px-6">
        <div className="mb-8">
          <img 
            src="/hydra.svg" 
            className="pointer-events-none h-[17vh]" 
            alt="Hydra Logo"
          />
          <div className="flex flex-row justify-center items-center mb-6">
            <img 
              src="/logo-mesh-white-300x300.png" 
              className="h-[50px] mr-4" 
              alt="Mesh Logo"
            />
            <span className="font-orbitron text-xl text-blue-100 font-medium">By Mesh</span>
          </div>
        </div>

        <div className="mb-12 max-w-4xl">
          <h2 className="font-orbitron text-xl md:text-2xl text-cyan-300 mb-8 leading-relaxed">
            A <span className="font-bold">Cardano bot challenge</span> to showcase the capabilities<br/> 
            of the <span className="font-bold">eUTxO model</span> and 
            <span className="font-bold"> Hydra L2 scaling solution</span>.
          </h2>
          <p className="font-share-tech text-lg text-gray-400 mb-8">
            Navigate your fleet through space, collect fuel, and mine Asteria!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <Link href="/start">
            <button className="game-button px-8 py-4 text-xl font-orbitron font-bold rounded-lg transform hover:scale-105 transition-all duration-300">
             LAUNCH GAME
            </button>
          </Link>
          <Link href="/how-to-play">
            <button className="px-8 py-4 text-xl font-orbitron font-bold rounded-lg border-2 border-gray-400 text-gray-400 hover:bg-gray-400 hover:text-black transition-all duration-300 transform hover:scale-105 ">
             HOW TO PLAY
            </button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-400 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4"></div>
            <h3 className="font-orbitron text-lg text-gray-200 mb-2">Real-time Game Transactions</h3>
            <p className="font-share-tech text-sm text-gray-400">Players can interact with the blockchain in real-time by making transactions</p>
          </div>
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-400 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4"></div>
            <h3 className="font-orbitron text-lg text-gray-200 mb-2">Hydra L2 Scaling</h3>
            <p className="font-share-tech text-sm text-gray-400">Experience Cardano's Hydra layer 2 scaling solution</p>
          </div>
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-400 rounded-lg p-6 text-center">
            <div className="text-4xl mb-4"></div>
            <h3 className="font-orbitron text-lg text-gray-200 mb-2">eUTxO Model</h3>
            <p className="font-share-tech text-sm text-gray-400">Showcase the unique capabilities of Cardano's eUTxO model</p>
          </div>
        </div>
      </div>
    </div>
  );
}

Landing.showNavBar = true;