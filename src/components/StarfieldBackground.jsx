import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

function RotatingStars() {
  const group = useRef();
  useFrame(() => {
    if (group.current) {
      // Slow, cinematic rotation
      group.current.rotation.y += 0.0003;
      group.current.rotation.x += 0.0001;
    }
  });
  return (
    <group ref={group}>
      <Stars radius={50} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </group>
  );
}

export default function StarfieldBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none bg-space-black">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <RotatingStars />
      </Canvas>
    </div>
  );
}
