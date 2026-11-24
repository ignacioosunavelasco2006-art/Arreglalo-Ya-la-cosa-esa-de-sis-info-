# Frontend de Arréglalo Ya (Angular)

Esta es la **primera entrega**: una base que funciona de punta a punta.

- Registro e inicio de sesión contra tu backend
- Menú y panel de inicio distintos según el rol
- Cambio de función cliente ↔ trabajador con la misma cuenta (RF-02)
- Notificaciones con contador (RF-35)
- Una pantalla que muestra datos reales (categorías y zonas)
- Una pantalla para editar tus datos

> No pude instalar Angular ni ejecutar el proyecto aquí, así que **no lo corrí**. Revisé la sintaxis de los
> archivos, pero la primera vez que hagas `ng serve` puede aparecer algún error. Si pasa, pégamelo y lo arreglo.

## 1. Cómo funciona (en 5 ideas)

1. **El frontend y el backend son dos programas separados.** El backend (NestJS) corre en `localhost:3000`
   y el frontend (Angular) en `localhost:4200`. El frontend le pide datos al backend por HTTP.
2. **Componente** = una pantalla (o un pedazo). Es una clase TypeScript con su HTML.
3. **Servicio** = una clase con lógica reutilizable, por ejemplo hablar con la API. Los componentes lo piden con `inject(...)`.
4. **Ruta** = qué pantalla se muestra para cada URL (`app.routes.ts`).
5. **Signal** = una variable que avisa sola a la pantalla cuando cambia (`cargando.set(true)`, y en el HTML `cargando()`).

También hay dos piezas de seguridad:
- **Interceptor**: agrega el token a todas las peticiones, para no escribirlo cada vez.
- **Guard**: bloquea una ruta si no hay sesión o no tienes el rol. Ojo: es solo comodidad, **la seguridad real la hace tu backend**.

## 2. Instalación (una sola vez)

Necesitas Node.js. Revisa con `node -v` (si el CLI se queja de la versión, actualiza Node desde nodejs.org).

```bash
npm install -g @angular/cli
ng new frontend --defaults
cd frontend
npm install bootstrap
```

`--defaults` responde solo las preguntas del asistente (CSS, sin SSR, con rutas).
Hoy `ng new` instala Angular 22.

## 3. Copiar los archivos

1. Copia la carpeta `src/app/` de este zip **dentro** de tu `frontend/src/` (sobrescribe `app.ts` y `app.routes.ts`).
2. Borra los archivos que ya no se usan: `src/app/app.html`, `src/app/app.css` y `src/app/app.spec.ts`.
3. Abre `src/main.ts`: debe decir `bootstrapApplication(App, appConfig)` e importar `App` desde `./app/app`.
   Si tu proyecto generó nombres distintos (por ejemplo `AppComponent` en `app.component.ts`), pega mi contenido en
   ese archivo y conserva el nombre de la clase.
4. Abre `src/app/app.config.ts` y agrega **solo** las 3 líneas que marca `app.config.EJEMPLO.txt`.
5. Abre `src/styles.css` y agrega al inicio la línea de `styles.EJEMPLO.txt`.

## 4. Permitir al frontend hablar con el backend (CORS)

Sin esto el navegador bloquea todas las peticiones. En tu **backend**, en `main.ts`, antes de `app.listen(...)`:

```typescript
app.enableCors({ origin: ['http://localhost:4200'] });
```

Reinicia el backend. Si tu backend no usa el puerto 3000, cambia `API_URL` en `src/app/core/config.ts`.

## 5. Ejecutar

Terminal 1 (backend): `npm run start:dev`
Terminal 2 (frontend): `ng serve` → abre http://localhost:4200

## 6. Qué deberías ver (para comprobar que todo funciona)

1. Entras a `localhost:4200` y te lleva a `/login`.
2. **Regístrate** como cliente: te deja dentro, con el menú y tu nombre arriba.
3. Cierras sesión, te registras como trabajador (otro correo) y verás el panel de trabajador.
4. En **Servicios y zonas** aparecen las categorías y zonas (si tu base ya las tiene).
5. En **Mi cuenta** puedes editar tus datos y activar la otra función.
6. Intentas abrir `localhost:4200/mi-cuenta` sin sesión: te manda a `/login`.

## 7. Qué hay en cada carpeta

```
src/app/
├── app.ts, app.routes.ts      raíz de la app y mapa de URLs
├── core/                      lo compartido por toda la app
│   ├── config.ts              dirección del backend
│   ├── modelos.ts             forma de los datos (Usuario, Categoria, ...)
│   ├── auth.service.ts        quién inició sesión, token, rol activo
│   ├── auth.interceptor.ts    agrega el token a cada petición
│   ├── guards.ts              authGuard, invitadoGuard, rolGuard
│   ├── menu.ts                menú y accesos de cada rol
│   ├── errores.ts             convierte errores del servidor en texto
│   └── *.service.ts           una clase por grupo de endpoints
├── layout/layout.ts           barra superior + hueco para las pantallas
└── pages/                     una pantalla por archivo
```

## 8. Problemas comunes

| Síntoma | Causa probable |
|---|---|
| Mensaje "No se pudo conectar con el servidor" | Backend apagado o `API_URL` con otro puerto |
| En la consola del navegador: *blocked by CORS policy* | Falta el `enableCors` del paso 4 (reinicia el backend) |
| La página se ve sin estilos | Falta `npm install bootstrap` o la línea `@import` en `styles.css` |
| Error por `App` / `AppComponent` | Revisa el paso 3.3 |
| Entras y te saca solo | Token vencido (dura lo que diga `JWT_EXPIRES_IN` en tu backend) |
| Tras "Activar trabajador" no ves el menú nuevo | Es normal: el token es anterior al rol. Cierra sesión y vuelve a entrar |

## 8.b Entrega 2: flujo del cliente

Archivos nuevos o actualizados (copia `src/app/` otra vez sobre tu proyecto; sobrescribe los repetidos):
`core/modelos.ts`, `core/estados.ts`, `core/menu.ts`, `core/catalogos.service.ts`, `app.routes.ts`,
los servicios `solicitudes`, `trabajos`, `pagos`, `calificaciones`, `trabajadores` y `parametros`,
`shared/estado-badge.ts` y las pantallas `pages/cliente/*`, `mis-trabajos`, `trabajo-detalle` y `perfil-trabajador`.

Cómo probarlo (necesitas un trabajador aprobado con una oferta; si no, hazlo con Postman o espera la entrega del trabajador):

1. Como cliente: **Publicar solicitud** → se abre el detalle de la solicitud.
2. Cuando llegue una oferta, aparece en la lista con el nombre y la calificación del trabajador (clic en el nombre = su perfil público).
3. Si la oferta *requiere visita previa*, aparece el bloque "Visita previa": aceptas la fecha, el trabajador registra el resultado y luego aceptas el precio.
4. **Aceptar oferta** → eliges método de pago y horario → te lleva a la pantalla del trabajo.
5. **Pagar anticipo** (el monto sale del parámetro `anticipo` del backend) → el trabajo queda *Programado*.
6. Si el trabajador pide un incremento o la finalización, aparecen tarjetas para aceptar o rechazar.
7. Al confirmar la finalización se cobra el saldo, se paga al trabajador y aparece la tarjeta para **calificar**.

Ya cubre: RF-11, RF-14, RF-16 (lado cliente), RF-17/18 (respuesta), RF-20, RF-21, RF-22, RF-26 (cancelar), RF-27, RF-06.
Falta del cliente: reclamos (RF-29), devoluciones y ver mis calificaciones.

## 8.c Entrega 3: trabajador (+ subida de archivos)

**Primero el backend** (ver sección 6 de `cambios/LEEME.md`): módulo `ArchivosModule`. Sin él las fotos y los
documentos no suben. Después copia `src/app/` otra vez sobre tu proyecto (sobrescribe los repetidos).

Pantallas nuevas del trabajador:

| Ruta | Qué hace |
|---|---|
| `/mi-perfil` | Crear el perfil, subir carnet y antecedentes, elegir servicios (con precio) y zonas, registrar datos bancarios, ver la lista de lo que falta, enviar a revisión y pausar la cuenta 30 días |
| `/oportunidades` | Solicitudes abiertas de SUS servicios y zonas (solo si el perfil está aprobado) |
| `/oportunidades/:id` | Detalle (sin dirección exacta) y formulario de oferta |
| `/mis-ofertas` | Estado de cada oferta, cambiar el precio, proponer fecha de visita y registrar su resultado |
| `/trabajos/:id` | Ahora también para el trabajador: "voy en camino", comenzar, pedir incremento, marcar terminado, confirmar el efectivo, responder la calificación y calificar al cliente (interno) |
| `/calendario` | Trabajos por día y hora + disponibilidad semanal |
| `/reclamos-trabajador` | Reclamos presentados sobre sus trabajos |

También: el cliente ya puede **adjuntar fotos** al publicar una solicitud y verlas en el detalle.

**Para probar el flujo completo desde la interfaz** (ya no necesitas Postman, salvo para el supervisor):

1. Regístrate como trabajador → **Mi perfil** → crea el perfil → sube carnet y antecedentes → elige servicios y zonas → datos bancarios → **Enviar a revisión**.
2. Un supervisor debe aprobarte: `PATCH /trabajadores/:id/revision` con `{"estado_verificacion":"aprobado"}` (Postman, con un token de supervisor; la pantalla del supervisor es la próxima entrega).
3. Como cliente publica una solicitud en una categoría y zona que el trabajador tenga.
4. Como trabajador: **Solicitudes** → ver y ofertar.
5. Como cliente: aceptar la oferta, pagar el anticipo.
6. Como trabajador: en el trabajo, "Voy en camino" → "Comenzar" → "Marcar como terminado".
7. Como cliente: confirmar la finalización. El pago se libera solo y el cliente puede calificar.

Ya cubre además: RF-03, RF-04, RF-05, RF-07 (pausa), RF-10 (lado trabajador no aplica), RF-12, RF-13, RF-16, RF-17, RF-19, RF-24, RF-27 (respuesta), RF-30.

## 9. Qué sigue (por rol, en este orden)

1. **Cliente:** ✅ casi completo (ver 8.b). Falta reclamar y las fotos.
2. **Trabajador:** ✅ completo (ver 8.c).
3. **Supervisor:** cola de revisión de trabajadores → reclamos (vista del caso) → categorías y zonas → devoluciones → reportes.
4. **Super supervisor:** parámetros, supervisores, bitácora.
5. **Inspector:** inspecciones asignadas y resultados.

Cada pantalla nueva = 1 archivo en `pages/` + 1 línea en `app.routes.ts` + 1 línea en `menu.ts`.

## 10. Límites de esta versión

- Los archivos se guardan en el disco del servidor (ver sección 6 de `cambios/LEEME.md`).
- No hay pruebas automáticas.
- El diseño usa Bootstrap por ser lo más simple para empezar; se puede personalizar luego.
