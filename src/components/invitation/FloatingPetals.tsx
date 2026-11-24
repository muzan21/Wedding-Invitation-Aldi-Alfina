import React from 'react';

const PETALS = [
  { left: '8%', delay: '0s', duration: '14s', size: 7 },
  { left: '22%', delay: '3.2s', duration: '17s', size: 6 },
  { left: '39%', delay: '1.4s', duration: '15s', size: 8 },
  { left: '56%', delay: '5.5s', duration: '19s', size: 6 },
  { left: '72%', delay: '2.1s', duration: '16s', size: 7 },
  { left: '88%', delay: '4.4s', duration: '18s', size: 6 },
];

export const FloatingPetals: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden lg:left-auto lg:w-[440px]"
    >
      {PETALS.map((petal, idx) => (
        <span
          key={idx}
          className="animate-petal-drift absolute top-0 block rounded-tl-full rounded-br-full bg-[#B8A88A]/45"
          style={{
            left: petal.left,
            width: `${petal.size}px`,
            height: `${petal.size + 4}px`,
            animationDelay: petal.delay,
            animationDuration: petal.duration,
          }}
        />
      ))}
    </div>
  );
};
