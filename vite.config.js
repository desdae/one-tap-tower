import { defineConfig } from 'vite';

// CI sets VERSION_NAME / VERSION_CODE for the Android build in the same job, so the label shown
// in Options matches the versionName and versionCode of the installed app.
const sha = (process.env.GITHUB_SHA || '').slice(0, 7);
const version = process.env.VERSION_NAME ? `${process.env.VERSION_NAME} (build ${process.env.VERSION_CODE})` : 'dev build';
const built = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`${version}${sha ? ` · ${sha}` : ''} · ${built} UTC`)
  },
  build: {
    target: 'es2019'
  }
});
