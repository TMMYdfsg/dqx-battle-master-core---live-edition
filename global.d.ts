declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare global {
  interface Window {
    desktop?: {
      platform: string;
      getSources?: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>;
    };
    overlay?: {
      open: (bounds?: { x: number; y: number; width: number; height: number }) => Promise<boolean>;
      close: () => Promise<boolean>;
      setBounds: (bounds: { x: number; y: number; width: number; height: number }) => Promise<boolean>;
      updateData: (data: any) => void;
      setClickThrough: (enabled: boolean) => Promise<boolean>;
      setVisible: (visible: boolean) => Promise<boolean>;
      setOpacity: (opacity: number) => Promise<boolean>;
      onData: (callback: (data: any) => void) => void;
      removeDataListener: () => void;
    };
  }
}

export {};
