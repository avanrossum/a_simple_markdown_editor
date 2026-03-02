module.exports = {
  appId: 'com.mipyip.simple-markdown-editor',
  productName: 'Simple Markdown Editor',
  files: [
    'src/main/**/*',
    'dist-renderer/**/*',
  ],
  extraMetadata: {
    main: 'src/main/main.js',
  },
  mac: {
    category: 'public.app-category.productivity',
    target: ['dmg', 'zip'],
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    icon: 'build/icon.icns',
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: true,
  },
  dmg: {
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: 'link', path: '/Applications' },
    ],
  },
  publish: {
    provider: 'github',
    owner: 'avanrossum',
    repo: 'simple-markdown-editor',
    releaseType: 'release',
  },
};
