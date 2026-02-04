/// <reference types="vite/client" />

// Custom file type declarations for this project

// .story DSL files (without query params)
declare module '*.story' {
    const content: string;
    export default content;
}
