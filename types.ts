
export interface Position {
  x: number; // 0 to 100
  y: number; // 0 to 100
}

export interface Fielder {
  id: string;
  name: string;
  role: 'bowler' | 'keeper' | 'fielder';
  pos: Position;
}

export interface FieldSetup {
  id: string;
  bowlerName: string;
  strategyName: string;
  fielders: Fielder[];
  timestamp: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  counts: {
    off: number;
    leg: number;
  };
}
