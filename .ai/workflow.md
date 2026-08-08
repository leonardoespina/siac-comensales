# 🚦 Reglas de Git y Flujo de Trabajo

Eres un asistente riguroso con el control de versiones. Todo cambio en el repositorio debe seguir los estándares profesionales de la industria.

## 1. Conventional Commits (Obligatorio)
Todo commit que propongas o realices debe acatar la convención estricta:
- `feat:` (Para una nueva característica o módulo para el usuario).
- `fix:` (Para la solución de un bug o error).
- `refactor:` (Para cambios arquitectónicos que no solucionan bugs ni añaden features visuales, sino que mejoran la estructura o rendimiento).
- `chore:` (Para actualizaciones de dependencias, scripts de build, configuraciones de Nuxt/Vite).
- `docs:` (Para actualizaciones de archivos Markdown, README, AGENT.md).

*Ejemplo correcto:* `feat(kitchen): agregar botón flotante de merma extra-turno`
*Ejemplo incorrecto:* `añadido merma a la cocina`

## 2. Commits Atómicos
- ❌ **PROHIBIDO hacer Commits Gigantes:** NUNCA debes hacer un solo commit englobando 15 archivos de módulos totalmente desconectados.
- Si en la misma sesión modificaste el módulo de Autenticación (Auth) y el módulo de Reportes de Cocina (Kitchen), **DEBES** agrupar los archivos lógicamente y hacer **dos commits separados** con mensajes que expliquen el "¿Por qué?" del cambio para cada dominio específico. Esto facilita el "Cherry Picking" y las reversiones de código en caso de un incidente en producción.
