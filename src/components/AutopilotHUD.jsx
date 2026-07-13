import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

// The Satellite Mesh
function Satellite() {
  const satRef = useRef();

  // Panels and scanner always remain calm/blue
  const panelColor = '#0A1128';
  const scannerColor = '#00F0FF';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    satRef.current.position.y = Math.sin(t) * 0.2;
    satRef.current.rotation.y = t * 0.1;
    satRef.current.rotation.z = Math.sin(t * 0.5) * 0.05;
  });

  return (
    <group ref={satRef}>
      {/* Central Body (Gold/Metal) */}
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 2, 16]} />
        <meshStandardMaterial color="#eeeeee" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Left Solar Panel */}
      <mesh position={[-2, 0, 0]}>
        <boxGeometry args={[3, 0.1, 1.5]} />
        <meshStandardMaterial color={panelColor} metalness={0.9} roughness={0.4} />
      </mesh>
      {/* Right Solar Panel */}
      <mesh position={[2, 0, 0]}>
        <boxGeometry args={[3, 0.1, 1.5]} />
        <meshStandardMaterial color={panelColor} metalness={0.9} roughness={0.4} />
      </mesh>

      {/* The glowing scanner frustum (Cone) */}
      <mesh position={[0, 0, 4]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[3, 8, 32, 1, true]} />
        <meshBasicMaterial color={scannerColor} transparent opacity={0.15} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

// A piece of mock space debris approaching
function Asteroid() {
  const asteroidRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Move debris towards satellite to simulate threat
    const zPos = 15 - (t * 5) % 20; 
    asteroidRef.current.position.z = zPos;
    asteroidRef.current.rotation.x += 0.01;
    asteroidRef.current.rotation.y += 0.02;
    asteroidRef.current.rotation.z += 0.03;
  });

  return (
    <group ref={asteroidRef} position={[2, 1, 15]}>
      <mesh>
        <dodecahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial color="#444444" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Red threat bounding box */}
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color="#FF2A2A" wireframe transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function AIPredictionPath({ decision }) {
  const [opacity, setOpacity] = useState(0);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (decision) {
      // 1. Ghost path appears
      setOpacity(0.2);
      setApproved(false);
      // 2. Solidifies after 1.5 seconds (simulating execution)
      const timer = setTimeout(() => {
        setOpacity(0.8);
        setApproved(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setOpacity(0);
    }
  }, [decision]);

  if (!decision && opacity === 0) return null;

  return (
    <mesh rotation={[Math.PI/2, 0.1, 0]} position={[0, -0.5, 0]}>
       <torusGeometry args={[18, 0.08, 16, 100]} />
       <meshBasicMaterial color="#00ffff" transparent opacity={opacity} />
       
       <Html position={[0, 18, 0]} center>
         <div className={`text-[9px] font-mono px-2 py-1 whitespace-nowrap border transition-all duration-500 ${approved ? 'text-black bg-cyan-400 border-cyan-400' : 'text-cyan-400 bg-blue-900/50 border-neon-blue/50 animate-pulse'}`}>
           {approved ? 'AI PATH APPROVED & EXECUTING' : 'AI RECOMMENDATION'}
         </div>
       </Html>
       
       {/* Timeline Markers only show when approved */}
       {approved && (
         <>
           <Html position={[18 * Math.cos(0.5), 18 * Math.sin(0.5), 0]} center>
             <div className="text-[8px] font-mono text-neon-blue bg-black/50 px-1 border border-neon-blue/30 whitespace-nowrap">T+10m</div>
           </Html>
           <Html position={[18 * Math.cos(1.2), 18 * Math.sin(1.2), 0]} center>
             <div className="text-[8px] font-mono text-neon-blue bg-black/50 px-1 border border-neon-blue/30 whitespace-nowrap">T+30m</div>
           </Html>
           <Html position={[18 * Math.cos(2.0), 18 * Math.sin(2.0), 0]} center>
             <div className="text-[8px] font-mono text-neon-blue bg-black/50 px-1 border border-neon-blue/30 whitespace-nowrap">T+1h</div>
           </Html>
           <Html position={[18 * Math.cos(3.5), 18 * Math.sin(3.5), 0]} center>
             <div className="text-[8px] font-mono text-neon-blue bg-black/50 px-1 border border-neon-blue/30 whitespace-nowrap">T+6h</div>
           </Html>
         </>
       )}
    </mesh>
  );
}

export default function AutopilotHUD({ telemetry, decision, visualState }) {
  const hasThreat = visualState === 'THREAT';

  return (
    <div className="w-full h-full relative">
      {/* Overlay UI */}
      <div className="absolute top-4 left-4 z-10 text-xs font-mono tracking-widest text-neon-blue">
        [ 3D EGO-CENTRIC RADAR ACTIVE ]
      </div>
      
      {/* 3D Canvas */}
      <div className="w-full h-full overflow-hidden hud-glow-blue bg-black">
        <Canvas camera={{ position: [5, 3, -8], fov: 50, far: 10000 }}>
          {/* Lighting */}
          <ambientLight intensity={0.2} />
          <directionalLight position={[10, 10, -10]} intensity={2} color="#ffffff" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#00F0FF" />

          {/* Environment */}
          <Stars radius={300} depth={150} count={12000} factor={7} saturation={0.8} fade speed={1} />
          
          {/* Distant Earth Below */}
          <mesh position={[-2, -150, 0]} rotation={[0, 0, 0]}>
            <sphereGeometry args={[120, 64, 64]} />
            <meshStandardMaterial color="#001133" roughness={0.8} metalness={0.2} wireframe={true} transparent opacity={0.15} />
          </mesh>
          <mesh position={[-2, -150, 0]}>
            <sphereGeometry args={[119, 32, 32]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          
          <group position={[-2, 0, 0]}>
            <Satellite />
            {hasThreat && <Asteroid />}

            {/* Current Orbit */}
            <mesh rotation={[Math.PI/2, 0, 0]} position={[0, -0.5, 0]}>
               <torusGeometry args={[18, 0.02, 16, 100]} />
               <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
               <Html position={[18, 0, 0]} center>
                 <div className="text-[9px] font-mono text-white/60 bg-black/50 px-2 py-1 whitespace-nowrap border border-white/20">CURRENT ORBIT</div>
               </Html>
            </mesh>

            {/* Predicted Collision Orbit */}
            {hasThreat && (
              <mesh rotation={[Math.PI/2, 0, 0]} position={[0, -0.5, 0]}>
                 <torusGeometry args={[18, 0.05, 16, 100]} />
                 <meshBasicMaterial color="#ff0000" transparent opacity={0.3} />
                 <Html position={[-18, 0, 0]} center>
                   <div className="text-[9px] font-mono text-red-400 bg-red-900/50 px-2 py-1 whitespace-nowrap border border-red-500/50 animate-pulse">PREDICTED COLLISION PATH</div>
                 </Html>
              </mesh>
            )}

            {/* AI Planned Safe Orbit with Ghost Animation */}
            <AIPredictionPath decision={decision} />

          </group>

          {/* Grid helper to give scale/velocity context */}
          <gridHelper args={[200, 100, '#ffffff', '#ffffff']} position={[0, -3, 0]}>
             <lineBasicMaterial attach="material" transparent opacity={0.05} />
          </gridHelper>

          {/* Let user pan around to feel the 3D space */}
          <OrbitControls enableZoom={true} maxDistance={60} minDistance={2} enablePan={true} autoRotate autoRotateSpeed={0.5} target={[-2, 0, 0]} />
        </Canvas>
      </div>
    </div>
  );
}
