import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Stars, OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

// Generates the points for the orbital path of a satellite
function getOrbitPath(a, e, i, raan, arg_p) {
  const points = [];
  const segments = 64;
  const r = (a / 6371) * 5;
  for (let k = 0; k <= segments; k++) {
    const ta = (k / segments) * Math.PI * 2;
    const theta = ta + (arg_p || 0);
    const x_orb = r * Math.cos(theta);
    const y_orb = r * Math.sin(theta);
    
    const x_m = x_orb * Math.cos(raan) - y_orb * Math.cos(i) * Math.sin(raan);
    const y_m = x_orb * Math.sin(raan) + y_orb * Math.cos(i) * Math.cos(raan);
    const z_m = y_orb * Math.sin(i);
    
    // Convert to Three.js coordinates (Y is up)
    points.push(new THREE.Vector3(x_m, z_m, -y_m));
  }
  return points;
}

function SatNode({ node, isFailing, isReceiving, globalMood, timeMultiplier = 1 }) {
  const ref = useRef();
  const [hovered, setHover] = useState(false);
  const ta = useRef(node.trueAnomaly);
  const lastBackendTa = useRef(node.trueAnomaly);
  
  const r = (node.a / 6371) * 5;
  const i = node.i;
  const raan = node.raan;

  // Mission Importance -> Size
  const priority = node.mission?.priority || 70;
  // Map priority to a slightly smaller size since orbit is closer
  const baseSize = 0.03 + ((priority - 70) / 30) * 0.04;
  let size = baseSize;

  // Confidence Halo & Constellation State -> Color
  let color = '#ffffff'; // Default White
  
  if (node.status === 'OFFLINE' || isFailing) {
    color = '#ff0000'; // Red ONLY for dead/failing
    size = 0.15;
  } else if (isReceiving) {
    color = '#00ffff'; // Cyan for receiving handoff
    size = 0.15;
  } else {
    // Healthy node colors
    if (globalMood === 'ANALYSIS') {
      color = '#00ffff'; // AI is thinking -> Cyan rings
    } else {
      // NOMINAL/THREAT state: unaffected nodes remain neutral
      color = '#ffffff'; 
    }
  }

  useFrame((state, delta) => {
    if (ref.current) {
      // 1. Advance true anomaly smoothly at 60fps
      const n = Math.sqrt(398600 / Math.pow(node.a, 3));
      ta.current += n * 60 * timeMultiplier * delta;

      // 2. Only sync with backend if we drifted massively (prevents backward-pulling stutters)
      if (node.trueAnomaly !== lastBackendTa.current) {
        let diff = node.trueAnomaly - ta.current;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        
        // If out of sync by more than ~11 degrees, snap it (handles backend resets)
        if (Math.abs(diff) > 0.2) {
          ta.current = node.trueAnomaly;
        }
        lastBackendTa.current = node.trueAnomaly;
      }

      // 3. Calculate new 3D position
      const theta = ta.current + (node.arg_p || 0);
      const x_orb = r * Math.cos(theta);
      const y_orb = r * Math.sin(theta);

      const x_m = x_orb * Math.cos(raan) - y_orb * Math.cos(i) * Math.sin(raan);
      const y_m = x_orb * Math.sin(raan) + y_orb * Math.cos(i) * Math.cos(raan);
      const z_m = y_orb * Math.sin(i);

      ref.current.position.set(x_m, z_m, -y_m);
      ref.current.lookAt(0, 0, 0);

      // Pulse effect for failing or receiving nodes
      if (isFailing || isReceiving) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.5;
        ref.current.scale.set(scale, scale, scale);
      } else {
        ref.current.scale.set(1, 1, 1);
      }
    }
  });

  const orbitPoints = useMemo(() => getOrbitPath(node.a, node.e, node.i, node.raan, node.arg_p), [node.a, node.e, node.i, node.raan, node.arg_p]);

  return (
    <group>
      {/* Orbit Trail */}
      <Line points={orbitPoints} color={color} opacity={0.03} transparent lineWidth={0.5} />

      {/* Satellite Body & Cone */}
      <group ref={ref}>
        {/* The dot */}
        <mesh
          onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
          onPointerOut={(e) => setHover(false)}
        >
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial color={color} />
          {/* Glowing Halo */}
          <mesh scale={2.5}>
            <sphereGeometry args={[size, 16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          {hovered && (
            <Html distanceFactor={15}>
              <div className="text-[10px] font-mono text-white bg-black/90 border border-white/20 px-3 py-2 rounded whitespace-nowrap shadow-lg pointer-events-none">
                <div className="font-bold text-white mb-1">{node.id}</div>
                <div className="text-white/60">{node.mission?.label || node.task}</div>
                {node.mission && (
                  <>
                    <div className="text-white/40 mt-1">PRI: {node.mission.priority} | VAL: {node.mission.value}</div>
                    <div className="text-white/40">COMPLETION: {(node.mission.completion * 100).toFixed(0)}%</div>
                    <div className="w-full h-1 bg-white/10 mt-1 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${node.mission.completion * 100}%` }}></div>
                    </div>
                  </>
                )}
              </div>
            </Html>
          )}
        </mesh>
        
        {/* Coverage Cone pointing down to Earth */}
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, r/2]}>
           <cylinderGeometry args={[0.01, 1.2 * (size/0.08), r, 16, 1, true]} />
           <meshBasicMaterial color={color} transparent opacity={0.02} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// Animated Mission Data Pulse
function HandoffPulse({ startNode, endNode }) {
  const meshRef = useRef();
  
  const getPos = (n) => {
    const r = (n.a / 6371) * 5;
    const theta = n.trueAnomaly + (n.arg_p || 0);
    const x_orb = r * Math.cos(theta);
    const y_orb = r * Math.sin(theta);
    const x_m = x_orb * Math.cos(n.raan) - y_orb * Math.cos(n.i) * Math.sin(n.raan);
    const y_m = x_orb * Math.sin(n.raan) + y_orb * Math.cos(n.i) * Math.cos(n.raan);
    const z_m = y_orb * Math.sin(n.i);
    return new THREE.Vector3(x_m, z_m, -y_m);
  };

  useFrame((state) => {
    if (!startNode || !endNode || !meshRef.current) return;
    const p1 = getPos(startNode);
    const p2 = getPos(endNode);
    
    // Animate moving from p1 to p2 extremely fast (looping every 0.5s)
    const t = (state.clock.elapsedTime * 2) % 1; 
    meshRef.current.position.lerpVectors(p1, p2, t);
    
    // Scale pulse
    const scale = 1 + Math.sin(t * Math.PI) * 2;
    meshRef.current.scale.set(scale, scale, scale);
  });

  if (!startNode || !endNode) return null;

  return (
    <group>
      {/* Base connection line */}
      <Line points={[getPos(startNode), getPos(endNode)]} color="#ffffff" lineWidth={1} transparent opacity={0.2} />
      {/* Traveling pulse */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        <Html distanceFactor={15} center>
          <div className="text-[9px] font-mono text-white bg-black/90 border border-cyan-400/50 px-2 py-1 rounded whitespace-nowrap shadow-[0_0_10px_rgba(0,255,255,0.3)] pointer-events-none mt-8">
            <div className="text-cyan-400 mb-0.5">{startNode.mission?.label || 'MISSION_TRANSFER'}</div>
            <div className="text-white/60">{startNode.id} &rarr; {endNode.id}</div>
          </div>
        </Html>
      </mesh>
    </group>
  );
}

function Constellation({ nodes, timeMultiplier, activeAnomalies, mood, handoffEvent }) {
  const groupRef = useRef();

  const sysFail = activeAnomalies?.find(a => a.threat === 'SYSTEM_FAILURE');
  
  // Create Neural Links (connect nodes that are close to each other)
  const neuralLinks = useMemo(() => {
    const links = [];
    for (let j = 0; j < nodes.length; j+=3) {
      for (let k = j+1; k < nodes.length; k+=3) {
        const n1 = nodes[j]; const n2 = nodes[k];
        const r1 = (n1.a / 6371) * 5; const r2 = (n2.a / 6371) * 5;
        
        const theta1 = n1.trueAnomaly + (n1.arg_p || 0);
        const xo1 = r1 * Math.cos(theta1);
        const yo1 = r1 * Math.sin(theta1);
        const xm1 = xo1 * Math.cos(n1.raan) - yo1 * Math.cos(n1.i) * Math.sin(n1.raan);
        const ym1 = xo1 * Math.sin(n1.raan) + yo1 * Math.cos(n1.i) * Math.cos(n1.raan);
        const zm1 = yo1 * Math.sin(n1.i);
        const p1 = new THREE.Vector3(xm1, zm1, -ym1);

        const theta2 = n2.trueAnomaly + (n2.arg_p || 0);
        const xo2 = r2 * Math.cos(theta2);
        const yo2 = r2 * Math.sin(theta2);
        const xm2 = xo2 * Math.cos(n2.raan) - yo2 * Math.cos(n2.i) * Math.sin(n2.raan);
        const ym2 = xo2 * Math.sin(n2.raan) + yo2 * Math.cos(n2.i) * Math.cos(n2.raan);
        const zm2 = yo2 * Math.sin(n2.i);
        const p2 = new THREE.Vector3(xm2, zm2, -ym2);

        if (p1.distanceTo(p2) < 3) {
          links.push([p1, p2]);
        }
      }
    }
    return links;
  }, [nodes]);

  const handoffSource = handoffEvent ? nodes.find(n => n.id === handoffEvent.from) : null;
  const handoffTarget = handoffEvent ? nodes.find(n => n.id === handoffEvent.to) : null;

  // Removed unphysical group rotation that distorted orbits

  // Link color adapts to state
  let linkColor = '#00ffff';
  let linkOpacity = mood === 'ANALYSIS' ? 0.15 : 0.04;

  return (
    <group ref={groupRef}>
      {/* Neural Web */}
      {neuralLinks.map((pts, i) => (
        <Line key={`link-${i}`} points={pts} color={linkColor} opacity={linkOpacity} transparent lineWidth={0.5} />
      ))}

      {nodes.map((node, i) => (
        <SatNode 
          key={node.id} 
          node={node} 
          isFailing={node.status === 'OFFLINE' || (sysFail && i === 0)} 
          isReceiving={handoffEvent && node.id === handoffEvent.to}
          globalMood={mood}
          timeMultiplier={timeMultiplier}
        />
      ))}

      {/* Mission Handoff Animation */}
      {handoffSource && handoffTarget && (
        <HandoffPulse startNode={handoffSource} endNode={handoffTarget} />
      )}
      
      {/* Fallback handoff if no explicit event but system is failing (demo sequence) */}
      {!handoffEvent && sysFail && nodes.length >= 42 && (
         <HandoffPulse startNode={nodes[0]} endNode={nodes[41]} />
      )}
    </group>
  );
}

// Coverage Heatmap on Earth
function CoverageHeatmap({ mood }) {
  const mapRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (mapRef.current) {
      mapRef.current.rotation.y += 0.0005 * (mood === 'ANALYSIS' ? 2 : 1);
      // Pulse smoothly if analysis
      if (mood === 'ANALYSIS') {
        mapRef.current.material.opacity = 0.3 + Math.sin(t * 5) * 0.1;
      } else {
        mapRef.current.material.opacity = 0.2;
      }
    }
  });

  return (
    <mesh ref={mapRef} scale={1.01}>
      <sphereGeometry args={[5, 64, 64]} />
      <meshBasicMaterial 
        color="#4ade80" // Always green for coverage
        transparent 
        opacity={0.3} 
        blending={THREE.AdditiveBlending}
        wireframe={false}
      />
    </mesh>
  );
}

function Earth({ mood }) {
  const earthRef = useRef();
  const [colorMap] = useLoader(THREE.TextureLoader, ['https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg']);

  // Atmosphere tint always blue to keep things calm
  let atmoColor = "#0088ff";

  useFrame((state) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial map={colorMap} roughness={0.8} metalness={0.1} />
        <mesh>
          <sphereGeometry args={[5.1, 64, 64]} />
          <meshBasicMaterial color={atmoColor} transparent opacity={0.15} blending={THREE.AdditiveBlending} />
        </mesh>
      </mesh>
      <CoverageHeatmap mood={mood} />
    </group>
  );
}

export default function SpaceGlobe({ telemetry, visualState = 'NOMINAL', handoffEvent, onSelectNode }) {
  const constellation = telemetry?.constellation || [];
  const activeAnomalies = telemetry?.activeAnomalies || [];
  
  // No extreme red pulse on the container
  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 left-4 z-10 text-xs font-mono tracking-widest text-white/50">
        [ GLOBAL FLEET ORCHESTRATOR ]
      </div>
      
      <div className={`w-full h-full border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative bg-black transition-colors duration-1000`}>
        <Canvas camera={{ position: [0, 2, 18], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <Earth mood={visualState} />
          <Constellation 
            nodes={constellation} 
            timeMultiplier={telemetry?.timeMultiplier || 1} 
            activeAnomalies={activeAnomalies} 
            mood={visualState}
            handoffEvent={handoffEvent}
          />

          <OrbitControls enableZoom={true} autoRotate autoRotateSpeed={0.5 * (telemetry?.timeMultiplier || 1)} minDistance={6} maxDistance={40} />
        </Canvas>
      </div>
    </div>
  );
}
