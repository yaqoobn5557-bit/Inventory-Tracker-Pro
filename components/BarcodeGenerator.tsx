import React from 'react';
import Svg, { Rect } from 'react-native-svg';

const PATTERNS: string[] = [
  "212222","222122","222221","121223","121322","131222","122213","122312",
  "132212","221213","221312","231212","112232","122132","122231","113222",
  "123122","123221","223211","221132","221231","213212","223112","312131",
  "311222","321122","321221","312212","322112","322211","212123","212321",
  "232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121",
  "313121","211331","231131","213113","213311","213131","311123","311321",
  "331121","312113","312311","332111","314111","221411","431111","111224",
  "111422","121124","121421","141122","141221","112214","112412","122114",
  "122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112",
  "421211","212141","214121","412121","111143","111341","131141","114113",
  "114311","411113","411311","113141","114131","311141","411131",
  "211412","211214","211232","2331112",
];

function buildSegments(text: string): number[] {
  const syms: number[] = [104];
  let check = 104;
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i) - 32;
    if (v >= 0 && v <= 94) {
      syms.push(v);
      check += v * (i + 1);
    }
  }
  syms.push(check % 103);
  syms.push(106);
  const segs: number[] = [];
  for (const sym of syms) {
    for (const ch of PATTERNS[sym]) segs.push(parseInt(ch, 10));
  }
  return segs;
}

interface Props {
  text: string;
  width?: number;
  height?: number;
  barColor?: string;
  bgColor?: string;
}

export default function BarcodeGenerator({ text, width = 300, height = 70, barColor = '#000', bgColor = '#fff' }: Props) {
  if (!text.trim()) return null;

  const barcodeSegs = buildSegments(text);
  const allSegs = [10, ...barcodeSegs, 10];
  const totalModules = allSegs.reduce((s, v) => s + v, 0);
  const scale = width / totalModules;

  const rects: React.ReactElement[] = [];
  let x = 0;
  for (let i = 0; i < allSegs.length; i++) {
    const w = allSegs[i] * scale;
    if (i % 2 === 1) {
      rects.push(<Rect key={i} x={x} y={0} width={w} height={height} fill={barColor} />);
    }
    x += w;
  }

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} fill={bgColor} />
      {rects}
    </Svg>
  );
}
