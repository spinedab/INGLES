// Iconos dibujados con react-native-svg en vez de @expo/vector-icons.
//
// Por qué: los glifos de @expo/vector-icons NO se renderizaban en Android
// (ni onboarding ni tab bar), y tres hipótesis quedaron descartadas por
// medición — carga en runtime con useFonts, fuente embebida como recurso
// nativo, y New Architecture. Con SVG no hay fuente que cargar: el trazo se
// dibuja siempre, en cualquier plataforma y a cualquier tamaño.
//
// react-native-svg ya era dependencia, así que no añade peso al bundle.
//
// La API imita la de Ionicons a propósito (`name`, `size`, `color`) para que la
// sustitución en las pantallas fuera mecánica y sin cambios de layout.
import React from 'react';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

export type IconName =
  | 'language'
  | 'time'
  | 'home'
  | 'book'
  | 'fitness'
  | 'journal'
  | 'person'
  | 'person-circle'
  | 'flash'
  | 'reader'
  | 'headset'
  | 'construct'
  | 'chevron-forward'
  | 'search';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 24, color = '#000' }: Props) {
  // Todos los trazados se dibujan en un lienzo de 24×24 y se escalan con
  // viewBox, así que `size` funciona igual que en Ionicons.
  const common = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'language' && (
        <>
          {/* Globo con meridianos: lee como «idioma/traducir». */}
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M3 12h18" {...common} />
          <Path d="M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9z" {...common} />
        </>
      )}

      {name === 'time' && (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Polyline points="12,7 12,12 16,14" {...common} />
        </>
      )}

      {name === 'home' && (
        <>
          <Path d="M3 10.5 12 3.5l9 7" {...common} />
          <Path d="M5.5 9.5V20h13V9.5" {...common} />
        </>
      )}

      {name === 'book' && (
        <>
          {/* Libro abierto: dos páginas y el lomo. */}
          <Path d="M12 6.5C10.4 5.2 8 4.5 4 4.5V18c4 0 6.4.7 8 2 1.6-1.3 4-2 8-2V4.5c-4 0-6.4.7-8 2z" {...common} />
          <Path d="M12 6.5V20" {...common} />
        </>
      )}

      {name === 'fitness' && (
        // Línea de pulso: el tab «Coach» es entrenamiento, no gimnasio.
        <Polyline points="2,12 7,12 9.5,6.5 13,17.5 15.5,12 22,12" {...common} />
      )}

      {name === 'journal' && (
        <>
          <Rect x={5} y={3.5} width={14} height={17} rx={2} {...common} />
          <Path d="M9 3.5v17" {...common} />
          <Path d="M12.5 8.5h3.5M12.5 12h3.5" {...common} />
        </>
      )}

      {name === 'person' && (
        <>
          <Circle cx={12} cy={8} r={3.8} {...common} />
          <Path d="M4.8 20c.6-3.8 3.6-6 7.2-6s6.6 2.2 7.2 6" {...common} />
        </>
      )}

      {name === 'person-circle' && (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Circle cx={12} cy={9.8} r={2.9} {...common} />
          <Path d="M6.6 18.8c.9-2.5 2.9-3.9 5.4-3.9s4.5 1.4 5.4 3.9" {...common} />
        </>
      )}

      {name === 'flash' && (
        <Path d="M13.5 2.5 5.5 13.5h5l-1 8 8-11.5h-5z" {...common} />
      )}

      {name === 'reader' && (
        <>
          <Rect x={4} y={3.5} width={16} height={17} rx={2} {...common} />
          <Path d="M7.8 8.5h8.4M7.8 12h8.4M7.8 15.5h5" {...common} />
        </>
      )}

      {name === 'headset' && (
        <>
          {/* Diadema y dos almohadillas. */}
          <Path d="M4 14v-2a8 8 0 0 1 16 0v2" {...common} />
          <Rect x={2.5} y={13.5} width={4} height={6.5} rx={2} {...common} />
          <Rect x={17.5} y={13.5} width={4} height={6.5} rx={2} {...common} />
        </>
      )}

      {name === 'construct' && (
        <>
          {/* Llave inglesa. */}
          <Path d="M14.5 3.2a5 5 0 0 0-1.2 8.2l-8.6 8.6 2.1 2.1 8.6-8.6a5 5 0 0 0 6.4-6.9l-2.9 2.9-3-3z" {...common} />
        </>
      )}

      {name === 'chevron-forward' && (
        <Polyline points="9,5 16,12 9,19" {...common} />
      )}

      {name === 'search' && (
        <>
          <Circle cx={10.8} cy={10.8} r={6.3} {...common} />
          <Path d="M15.6 15.6 21 21" {...common} />
        </>
      )}
    </Svg>
  );
}
