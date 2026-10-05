# Proyectos web · AliceLabs

Catálogo de diseños HTML para contratar una **adaptación con alcance acordado**. Destacamos consultoría, agencia digital e inmobiliaria. Las otras siete referencias amplían las posibilidades visuales.

No es una plataforma SaaS, tienda, scraper ni panel de analítica operativo. Los nombres, cifras, precios y testimonios de las demos son ficticios. Las solicitudes comerciales abren un borrador de correo a contact@alicelabs.site; solo se envían si el visitante lo hace desde su correo.

## Ejecutar y entregar

Node 22 o superior, sin dependencias de aplicación:

```sh
npm ci
npm test
npm start
```

El servidor local escucha en 127.0.0.1:3000. HOST y PORT son configurables. El artefacto publicable es exclusivamente `dist/`, generado con `npm run build`. Vercel usa ese directorio y no ejecuta el servidor legacy. Para otro host estático, publicar `dist/` como raíz. No publicar todo el repositorio.

- `landing-pages/`: fuentes originales preservadas; consultar su estado abajo.
- `scripts/build.js`: genera catálogo, corrige terminaciones truncadas descartando la sección incompleta, agrega avisos y desactiva interacciones simuladas.
- `public/`: estilos del catálogo y aviso compartido; sin telemetría propia.
- `server.js`: servidor opcional de solo lectura. Los antiguos endpoints API, admin y dashboard responden 503 con disponibilidad falsa. No crea trabajos ni sobrescribe configuración.
- `archive/legacy/`: servidor, scraper, vistas y documentación antiguos para referencia histórica; no se ejecutan ni se publican. Contienen simulaciones y afirmaciones no válidas para producción.

## Estado de las fuentes

Consultoría y agencia digital contienen documentos HTML completos. Las otras ocho fuentes estaban truncadas: la exportación conserva solo hasta la última sección completa y las identifica como **referencia parcial**. No se ha recuperado contenido ausente ni se presentan como proyectos terminados.

Las demos mantienen imágenes y algunos recursos visuales externos de sus fuentes originales; pueden fallar si sus proveedores bloquean acceso. Antes de una entrega comercial, sustituirlos por recursos autorizados y alojados con el proyecto. Los scripts originales no se publican. Formularios y botones quedan desactivados; los enlaces ficticios de contacto/compra se neutralizan. Los enlaces válidos entre secciones siguen funcionando.

## Validación

`npm test` construye las diez demos y prueba rutas, CSS, avisos, ausencia de scripts originales/eventos inline, cierre de endpoints simulados, métodos HTTP, protección del directorio publicado y ausencia de sobrescritura de configuración. GitHub Actions conserva el artefacto de entrega.

Consultar [checklist comercial](docs/DELIVERY-CHECKLIST.md). No hay despliegue automático ni ingresos comprobados por esta modificación.
