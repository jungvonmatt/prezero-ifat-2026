type AllCharactersUpperCase =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z';

// For vue components
declare module 'vue' {
  export interface AllowedComponentProps {
    // Allow any data-* and aria-* attributes
    [key: `data-${string}`]: string | undefined;
    // HACK adjust this to be only kebab-case if possible
    [key: `data${AllCharactersUpperCase}${string}`]: string | undefined;
    [key: `aria-${string}`]: string | undefined;
    // HACK adjust this to be only kebab-case if possible
    [key: `aria${AllCharactersUpperCase}${string}`]: string | undefined;
    tabindex?: number | string;
    id?: string;
    hidden?: boolean;
  }

  export interface GlobalDirectives {
    vEditable?: any; // Connects components to the Storyblok Bridge
  }

  export interface SVGAttributes {
    // Allow any data-* and aria-* attributes
    [key: `data-${string}`]: string | undefined;
    // HACK adjust this to be only kebab-case if possible
    [key: `data${AllCharactersUpperCase}${string}`]: string | undefined;
    [key: `aria-${string}`]: string | undefined;
    // HACK adjust this to be only kebab-case if possible
    [key: `aria${AllCharactersUpperCase}${string}`]: string | undefined;
  }
}

// For native html elements
declare module 'vue' {
  export interface HTMLAttributes {
    // Allow any data-* attr
    [key: `data-${string}`]: string | undefined;
    slot?: string;
    vEditable?: string;
  }

  interface DialogHTMLAttributes {
    closedby?: 'any' | 'closerequest' | 'none';
  }
}

export {};
