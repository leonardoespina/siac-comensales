# 🎨 Reglas de Interfaz Visual y Experiencia (UI / UX)

**Stack:** Quasar Framework (SPA + PWA mode).

## 1. REGLA CERO: Prohibición Total de CSS Custom
- **Diseño 100% Quasar:** TODA la interfaz se construye EXCLUSIVAMENTE usando los componentes nativos (`<q-card>`, `<q-btn>`, `<q-input>`) y las clases CSS de utilidad provistas por Quasar (`class="text-primary bg-grey-2 q-pa-md"`).
- ❌ **Prohibición de `<style>`:** Está terminantemente prohibido usar la etiqueta `<style scoped>` o `<style>` dentro de cualquier componente Vue.
- ❌ **Prohibición de CSS inline:** No uses `style="margin-top: 10px;"`. Usa las clases de Quasar (`q-mt-sm`).
- ❌ **HTML Primitivo:** Evita el uso de etiquetas HTML estándar (`<button>`, `<table>`, `<input>`, `<select>`). Siempre debes utilizar sus equivalentes funcionales en Quasar.

## 2. Responsividad Absoluta (Mobile-First)
Como ERP operativo de cocina, el sistema debe verse perfecto tanto en un monitor de oficina de 27" como en el teléfono celular de un operador o en una Tablet empotrada.
- **Uso de Grillas:** Para todo layout estructurado, utiliza el sistema Flexbox de Quasar (`row q-col-gutter-md`) con tamaños condicionales (`col-12 col-md-6 col-lg-4`).
- **Renderizado Adaptativo:** Si una tabla de 10 columnas es imposible de leer en móvil, usa condicionales (`$q.screen.lt.md` o clases como `gt-xs`) para ocultar columnas menos relevantes o, idealmente, renderizar un componente de lista de Tarjetas (`<q-card>`) exclusivamente para móviles en su lugar.
- **Touch-Friendly:** Todo botón de acción principal debe ser lo suficientemente grande (`size="lg"` o `size="md"`) para operadores que trabajen de pie o con guantes.

## 3. Experiencia de Usuario (Prevención de Errores)
- **Bloqueo Transaccional:** NUNCA permitas el "Doble Click". Todo botón que envíe datos a la base de datos debe tener activada la propiedad `:loading="variable"` mientras dura la petición HTTP.
- **Notificaciones (Toasts):** Toda acción destructiva o de guardado exitoso debe arrojar un Toast visual utilizando el composable centralizado `useNotifications()`. No uses `alert()` nativo de JavaScript.
- **Confirmaciones Críticas:** Para borrar registros u operaciones irreversibles, SIEMPRE levanta un modal de confirmación nativo de Quasar (`$q.dialog()`).
