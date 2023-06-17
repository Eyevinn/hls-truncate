declare module '@eyevinn/m3u8' {
  export type M3UItem = {
    get: (key: string) => string;
    set: (key: string, value: string) => void;
  };

  interface M3UItems {
    PlaylistItem: M3UItem[];
    StreamItem: M3UItem[];
    IframeStreamItem: M3UItem[];
    MediaItem: M3UItem[];
  }

  export type M3U = {
    items: M3UItems;
    toString: () => string;
  };

  export type M3UParser = {
    on: (type: 'm3u', fn: (m3u: M3U) => void) => void;
    on: (type: 'error', fn: (error: string) => void) => void;
  };
}
