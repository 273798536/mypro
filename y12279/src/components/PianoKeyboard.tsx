import { useMemo } from 'react';
import { Box } from '@react-three/drei';

interface PianoKeyProps {
  x: number;
  isBlack: boolean;
  isActive: boolean;
}

function PianoKey({ x, isBlack, isActive }: PianoKeyProps) {
  const height = isBlack ? 0.08 : 0.04;
  const depth = isBlack ? 0.8 : 1.2;
  const width = isBlack ? 0.035 : 0.055;
  const y = isBlack ? 0.06 : 0.02;
  const z = isBlack ? -0.2 : 0;

  return (
    <Box position={[x, y, z]} args={[width, height, depth]}>
      <meshStandardMaterial
        color={isBlack ? '#1a1a1a' : isActive ? '#E8F4FD' : '#fafafa'}
        roughness={0.3}
        metalness={0.1}
      />
    </Box>
  );
}

interface PianoKeyboardProps {
  activeNotes?: string[];
}

export function PianoKeyboard({ activeNotes = [] }: PianoKeyboardProps) {
  const keys = useMemo(() => {
    const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackNotes = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];
    const pianoKeys: { x: number; isBlack: boolean; note: string; isActive: boolean }[] = [];

    let whiteKeyIndex = 0;
    const startOctave = 3;
    const endOctave = 5;

    for (let octave = startOctave; octave <= endOctave; octave++) {
      for (let i = 0; i < 7; i++) {
        const x = whiteKeyIndex * 0.058 - 0.9;
        const note = `${whiteNotes[i]}${octave}`;
        pianoKeys.push({
          x,
          isBlack: false,
          note,
          isActive: activeNotes.includes(note),
        });

        if (blackNotes[i]) {
          const blackX = x + 0.029;
          const blackNote = `${blackNotes[i]}${octave}`;
          pianoKeys.push({
            x: blackX,
            isBlack: true,
            note: blackNote,
            isActive: activeNotes.includes(blackNote),
          });
        }
        whiteKeyIndex++;
      }
    }

    return pianoKeys;
  }, [activeNotes]);

  return (
    <group position={[0, 0, 0]}>
      {keys.map((key, index) => (
        <PianoKey key={index} {...key} />
      ))}
      
      <Box position={[0, -0.02, 0]} args={[2.1, 0.02, 1.3]}>
        <meshStandardMaterial color="#2c2c2c" />
      </Box>
    </group>
  );
}
