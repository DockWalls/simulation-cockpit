
export interface Avatar {
  id: string;
  role: string;
  position: { x: number; y: number };
  status: 'active' | 'inactive';
  asset: string;
}

export interface Scene {
  id: string;
  name: string;
  avatars: Avatar[];
}
