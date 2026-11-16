/** Lựa chọn của người dùng: id của một cảnh trong hooks/scenes.ts, hoặc `off`. */
export type Prefs = { scene: string }

declare module 'claude-code' {
  interface PluginState {
    'vibe-scenes': { prefs: Shaped<Prefs> }
  }
}
