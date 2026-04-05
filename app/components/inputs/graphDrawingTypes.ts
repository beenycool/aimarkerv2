export type GraphPoint = { x: number; y: number };

export type GraphLineSeg = { x1: number; y1: number; x2: number; y2: number };

export type GraphLabel = { x: number; y: number; text: string };

export type GraphDrawingValue = {
    points: GraphPoint[];
    lines: GraphLineSeg[];
    labels: GraphLabel[];
    paths: GraphPoint[][];
};
