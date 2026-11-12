# TP4 – Tienda segura: integración continua y DevSecOps

## Objetivo y alcance

Aplicación pequeña Node.js/Express que calcula el total de una compra con descuento y define un pipeline de GitHub Actions con pruebas y controles de seguridad. Consigna de Ingeniería de Software Aplicada, evaluación del 13 de noviembre de 2026.

**Estado:** comprobaciones locales realizadas; publicación, pull requests, ejecuciones de Actions y protección remota pendientes de autorización. No existe todavía un repositorio remoto asociado.

## Arquitectura y tecnologías

```text
Cambio → rama → pull request → GitHub Actions (runner Ubuntu)
  ├─ node:test
  ├─ npm audit (SCA)
  ├─ Semgrep (SAST)
  ├─ Gitleaks (secretos)
  ├─ Trivy (configuración Docker)
  └─ Docker + ZAP Baseline (DAST local)
          ↓
       check Pipeline → condición propuesta para proteger main
```

El recorrido de Actions está configurado, pero requiere publicación y ejecución real para considerarlo verificado remotamente. No hay despliegue automático a producción.

Node.js 24 (mínimo 20), Express 5.3.0, Helmet 8.3.0, pruebas nativas node:test/node:assert. Semgrep 1.185.0, Gitleaks 8.30.1 y Trivy 0.76.2 se ejecutan en contenedores. La imagen ZAP está fijada por digest en el workflow. Las acciones oficiales están fijadas por SHA.

## Instalación y ejecución

```powershell
npm ci
npm test
npm start
```

Abrir <http://127.0.0.1:3004>. Ejemplo: <http://127.0.0.1:3004/total?precio=100&cant=2&desc=0.5> devuelve `{"total":100}`. Detener el servidor con Ctrl+C.

La función es `precio * cant * (1 - desc)`. El endpoint valida números finitos, precio no negativo, cantidad entera no negativa y descuento entre 0 y 1; nunca evalúa código recibido. Los tests incluyen el caso obligatorio, descuentos extremos y solicitudes HTTP válidas/incorrectas. Helmet, una CSP restringida y respuestas JSON controladas para rutas inexistentes reducen exposición innecesaria.

## Docker

```powershell
docker build -t tp4-tienda:local .
docker run -d --name tp4-tienda-demo -p 127.0.0.1:3005:3004 tp4-tienda:local
```

Abrir <http://127.0.0.1:3005>. No repetir docker run con un nombre que ya exista: usar docker start. La aplicación dentro del contenedor escucha 0.0.0.0 para permitir la publicación, pero Docker limita el puerto del host a localhost. Se ejecuta como USER node, incluye healthcheck y no necesita base de datos ni volúmenes.

Durante el desarrollo quedó disponible el contenedor `tp4-tienda-final` en localhost:3005; para conservarlo y reutilizarlo: `docker stop tp4-tienda-final` / `docker start tp4-tienda-final`. El contenedor temporal previo `tp4-tienda` quedó detenido. No son servicios de otros TPs.

## Pipeline

Archivo `.github/workflows/pipeline.yml`, eventos pull_request hacia main, push a main y workflow_dispatch. Permisos mínimos contents:read. Seis jobs independientes; el job final Pipeline exige que todos concluyan exitosamente, incluso si alguno falló u omitió su ejecución.

1. **Tests:** npm ci y npm test, falla si se rompe la fórmula.
2. **Dependencias:** npm audit --audit-level=high, falla por vulnerabilidades altas o críticas. No es un escaneo del sistema operativo de la imagen.
3. **Semgrep:** regla local `.semgrep.yml` que prohíbe eval en JavaScript; --error hace bloquear el control.
4. **Gitleaks:** CLI de código abierto en Docker, sin la acción comercial ni claves de licencia. Escanea archivos actuales y el historial de la rama revisada. En PR limita el historial a base..head para no examinar ramas ajenas o ejemplos cerrados sin fusionar. fetch-depth:0 conserva el historial necesario.
5. **Trivy:** analiza configuración, severidades HIGH/CRITICAL, exit-code 1. No se presenta como escaneo de CVE de la imagen.
6. **ZAP:** construye la aplicación, la ejecuta en red Docker interna sin puerto publicado y hace baseline de bajo impacto. Los reportes se guardan en runner.temp y se suben como artefacto por 14 días. `-I` permite advertencias documentadas, pero no oculta FAIL ni errores de infraestructura. No ejecuta ataques activos contra sitios externos.

## Fallas controladas y recuperación

Se probaron por separado en copias aisladas fuera del proyecto: fórmula con `1 + desc` (tests fallan), lodash 4.17.15 (audit falla), ruta con eval(req.query.expr) (Semgrep falla) y credencial sintética no válida (Gitleaks falla). Se comprobó la recuperación de los cuatro controles. No hay versiones vulnerables en el código final ni credenciales de demostración para publicar.

Flujo remoto previsto: ramas `demo/test-roto`, `demo/dependencia-vulnerable`, `demo/eval-inseguro` y `demo/secreto-sintetico`. Cada caso necesita autorización de publicación/PR. La PR del secreto ficticio deberá cerrarse sin fusionar; las otras se corregirán antes de cualquier eventual merge autorizado. No usar force push ni fusionar código inseguro.

## Extras y límites

- **Protección de main:** preparada como propuesta; requerir PR y check Pipeline exitoso, sin force push ni borrado. Pendiente de configurar y comprobar en GitHub. GitHub Free permite la protección en repositorios públicos; la visibilidad debe autorizarla la propietaria.
- **Trivy:** demostró DS-0002 HIGH al retirar USER node de una copia y aprobó el Dockerfile definitivo. El contenedor real informó uid=1000(node).
- **ZAP:** se ejecutó baseline contra la aplicación local y se conservaron reportes fuera de Fabian. Las advertencias iniciales CSP motivaron una corrección local mínima y un segundo análisis. Consultar el registro de extras para el resultado exacto, sin inferir seguridad absoluta.

Los controles dependen de registros y bases actualizables; un resultado limpio es evidencia del alcance y momento analizados, no garantía total. El análisis remoto y el bloqueo de merge aún no están comprobados.

## Demostración

Hoy: `npm test`, `npm audit --audit-level=high` y abrir el endpoint local. Cuando se autorice y verifique GitHub: mostrar workflow, ejecución aprobada, cuatro ejecuciones fallidas históricas y sus correcciones, protección de main y reportes de extras. No introducir las fallas nuevamente durante el examen.

Los reportes y registros locales están en `../../Apoyo-Codex/TP4-Integracion-Continua`; la guía de defensa en `../../Estudio-Final/TP4-Integracion-Continua`. No deben publicarse como parte del repositorio de la aplicación. No se requieren secretos reales para ejecutar este workflow.
