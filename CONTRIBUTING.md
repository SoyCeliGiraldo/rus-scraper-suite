# Guía de Contribución

¡Gracias por tu interés en contribuir a este proyecto! Buscamos mantener estándares altos de calidad y profesionalismo. Por favor, sigue estas pautas.

## Flujo de Trabajo

1.  **Fork & Clone**: Haz un fork del repositorio y clónalo localmente.
2.  **Branch**: Crea una rama descriptiva para tu feature o fix (`git checkout -b feature/nueva-funcionalidad`).
3.  **Code**: Escribe código limpio, comentado y siguiendo la estructura del proyecto.
4.  **Lint**: Asegúrate de que no haya errores de linter (`npm run lint`).
5.  **Commit**: Usa mensajes de commit claros y semánticos (ej. `feat: agregar soporte para firefox`, `fix: corregir selector de login`).
6.  **Push & PR**: Sube tus cambios y abre un Pull Request describiendo detalladamente tus modificaciones.

## Estándares de Código

- **Javascript**: Usamos ES6+.
- **Estilo**: Sigue las reglas de ESLint configuradas.
- **Naming**:
  - Variables y funciones: `camelCase`
  - Clases: `PascalCase`
  - Constantes: `UPPER_SNAKE_CASE`
  - Archivos: `camelCase.js`
- **Documentación**: Documenta funciones complejas con JSDoc.

## Reporte de Bugs

Si encuentras un error, por favor abre un Issue incluyendo:
- Pasos para reproducir.
- Comportamiento esperado vs real.
- Logs o capturas de pantalla.
- Versión de Node.js y SO.

## Seguridad

Si descubres una vulnerabilidad de seguridad, por favor repórtala de manera privada a los mantenedores en lugar de abrir un issue público.
