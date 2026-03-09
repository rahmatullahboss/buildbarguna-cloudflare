// Type declarations for .ttf binary module imports
// Wrangler bundles these as ArrayBuffer via [[rules]] type = "Data"
declare module '*.ttf' {
  const data: ArrayBuffer
  export default data
}
