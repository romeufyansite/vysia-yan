import { motion } from 'framer-motion';

interface ConfettiShape {
  id: number;
  type: 'circle' | 'triangle';
  color: string;
  size: number;
  x: number;
  y: number;
  duration: number;
}

const confettiShapes: ConfettiShape[] = [
  { id: 1, type: 'circle', color: '#FFFFFF', size: 16, x: 15, y: 10, duration: 20 },
  { id: 2, type: 'triangle', color: '#EF4444', size: 12, x: 8, y: 25, duration: 25 },
  { id: 3, type: 'circle', color: '#FCD34D', size: 14, x: 12, y: 50, duration: 22 },
  { id: 4, type: 'circle', color: '#34D399', size: 10, x: 55, y: 30, duration: 18 },
  { id: 5, type: 'circle', color: '#60A5FA', size: 12, x: 45, y: 15, duration: 24 },
  { id: 6, type: 'triangle', color: '#FCD34D', size: 10, x: 55, y: 8, duration: 21 },
  { id: 7, type: 'triangle', color: '#EF4444', size: 14, x: 70, y: 25, duration: 19 },
  { id: 8, type: 'circle', color: '#60A5FA', size: 16, x: 75, y: 50, duration: 23 },
  { id: 9, type: 'circle', color: '#FFFFFF', size: 12, x: 85, y: 10, duration: 20 },
  { id: 10, type: 'circle', color: '#FCD34D', size: 16, x: 78, y: 40, duration: 22 },
  { id: 11, type: 'circle', color: '#34D399', size: 14, x: 92, y: 70, duration: 21 },
  { id: 12, type: 'circle', color: '#FFFFFF', size: 18, x: 18, y: 70, duration: 24 },
  { id: 13, type: 'triangle', color: '#60A5FA', size: 12, x: 22, y: 85, duration: 19 },
  { id: 14, type: 'circle', color: '#60A5FA', size: 10, x: 45, y: 85, duration: 26 },
  { id: 15, type: 'circle', color: '#34D399', size: 16, x: 55, y: 95, duration: 20 },
  { id: 16, type: 'triangle', color: '#EF4444', size: 10, x: 70, y: 85, duration: 23 },
  { id: 17, type: 'circle', color: '#FFFFFF', size: 14, x: 15, y: 70, duration: 21 },
];

export function ConfettiBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {confettiShapes.map((shape) => (
        <motion.div
          key={shape.id}
          className="absolute"
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, shape.x % 2 === 0 ? 10 : -10, 0],
          }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {shape.type === 'circle' ? (
            <div
              className="rounded-full"
              style={{
                width: shape.size,
                height: shape.size,
                backgroundColor: shape.color,
              }}
            />
          ) : (
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: `${shape.size / 2}px solid transparent`,
                borderRight: `${shape.size / 2}px solid transparent`,
                borderBottom: `${shape.size}px solid ${shape.color}`,
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
