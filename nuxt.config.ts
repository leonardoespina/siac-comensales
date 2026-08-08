// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@vite-pwa/nuxt',
    'nuxt-quasar-ui',
    '@pinia/nuxt',
    'nuxt-security'
  ],

  security: {
    headers: {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: 'unsafe-none',
    },
    rateLimiter: {
      tokensPerInterval: 150,
      interval: 60000,
    },
    requestSizeLimiter: {
      maxRequestSizeInBytes: 2000000, // 2MB for normal payload
      maxUploadFileRequestInBytes: 8000000, // 8MB for multipart forms (Excel uploads)
    },
    corsHandler: {
      origin: '*',
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    }
  },

  routeRules: {
    '/api/auth/login': {
      security: {
        rateLimiter: {
          tokensPerInterval: 5,
          interval: 60000,
        }
      }
    }
  },

  quasar: {
    plugins: ['Notify', 'Dialog', 'Loading'],
    config: {
      notify: {
        position: 'bottom',
        timeout: 3000,
        actions: [{ icon: 'close', color: 'white' }]
      }
    },
    extras: {
      fontIcons: ['material-icons'],
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'SIAC — Inventarios de Comedores',
      short_name: 'SIAC',
      description: 'Sistema de Inventarios de Almacenes de Comedores',
      theme_color: '#1976d2',
      background_color: '#ffffff',
      display: 'standalone',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
  },

  typescript: {
    strict: true,
  },

  // Añadido para silenciar la advertencia de Vue DevTools en consola
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'socket.io-client',
        'xlsx'
      ]
    }
  },


  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    public: {
      appName: 'SIAC',
    },
  },

  compatibilityDate: '2025-06-09',
})
