# Handoff — Modelo de 5 roles (dónde nos quedamos)

> **Última sesión:** 2026-08-06. Documento para retomar en frío.
> **Contrato de referencia:** [`MatrizRoles.md`](./MatrizRoles.md) (matriz rol↔permiso, fuente de verdad).
> **Repos:** frontend `bar-pos-web`, backend `bar-pos-saas-api` (Laravel, corre en Docker).

---

## 0. PUNTO DE RETOMA (empieza por aquí)

**Estado al 2026-08-14:** el editor de roles a medida está **implementado, commiteado,
verificado en el navegador y con sus 2 defectos corregidos**. El bloque queda cerrado.

| Repo | Último commit | Árbol |
|---|---|---|
| `bar-pos-saas-api` | `07ae198` *Modificacion de roles* | limpio |
| `bar-pos-web` | `b563fdd` *Merge PR #3 `fix/contadores-roles`* (trae `8399534`, los 2 defectos) | limpio |

**Verificado:** backend **314/314** + Pint limpio + smoke E2E en vivo contra el Docker
(clonar, editar preset → 403, permiso de plataforma → 422, etiqueta reservada → 422,
eliminar, auditoría). Frontend **81/81** + `tsc` limpio + lint 0 errores + `pnpm build` OK.

### ▶ Prueba en navegador — HECHA (2026-08-13)

Corrida en el tenant **Bar De la Esquina** (id 9: `RosAdmin` admin, `Gerente1`, `Mesero1`,
`Mesero2`) contra el Docker de dev y `pnpm dev`. **Pasan los 9 puntos.** Al terminar se
restauró el tenant a su estado original (los roles de prueba se borraron, `Mesero2` volvió a
`mesero`).

- [x] 2 secciones: "Roles del sistema" (4 tarjetas, **solo Clonar**) y "Roles propios"
      (Editar · Clonar · Eliminar).
- [x] **Clonar** precarga los permisos del origen y propone "«Mesero» (copia)".
- [x] Selector agrupado por módulo, con atajo **Todos/Ninguno** y contador (10 → 12 al
      encender el grupo Caja; el atajo cambia a "Ninguno" cuando el grupo está completo).
- [x] El rol nuevo aparece en "Roles propios"; **el preset queda intacto** (Mesero siguió en
      10 permisos tras dos clonaciones).
- [x] En Usuarios el rol a medida sale con **etiqueta legible** (nunca el slug).
- [x] **Conserva sus permisos al asignarlo** — verificado en BD: `role_has_permissions` = 12
      después de asignar, y `usuarios.id_rol` ↔ `model_has_roles` coherentes. *Este era el
      bug latente más grave de la fase A; no reapareció.*
- [x] **Editar** un rol propio (no estaba en la lista original): precarga nombre y permisos,
      guarda 15 → 14.
- [x] Eliminar con usuarios asignados → **409** con el mensaje del backend tal cual: *"No
      puedes eliminar un rol que tiene usuarios asignados. Reasígnalos primero."*; sin
      usuarios, borra limpio.
- [x] **Gerente bloqueado en las 3 capas**: no ve el ítem "Roles" en el menú; `/app/roles`
      directo → "Sin acceso"; y en BD no tiene `roles.gestionar` (solo el admin), que es lo
      que exige `RolPolicy::create/update/delete` — además de bloquear presets vía
      `esDelSistema()`.

> **Nota de método:** el asistente no escribe contraseñas en formularios. Para probar, el
> usuario inicia sesión y el asistente toma el control del navegador desde ahí.

### ▶ Defectos encontrados en la prueba — CORREGIDOS (2026-08-14, commit `8399534`)

1. **Contadores viejos en la pantalla Roles tras reasignar un usuario.**
   `useGuardarUsuario` solo invalidaba `qk.usuarios.all`; faltaba `qk.roles.all`. La relación
   es bidireccional —cambiar el rol de un usuario altera el `usuarios_count` de **dos** roles—
   y la invalidación inversa ya existía en `features/roles/api.ts`. Efecto: la tarjeta decía
   "0 usuarios" cuando ya tenía uno; engañoso justo antes de pulsar Eliminar.
   **Fix:** invalidar también `qk.roles.all` en `features/usuarios/api.ts`.
2. **Copy: "1 permisos".** La tarjeta de rol no pluralizaba los permisos aunque sí los
   usuarios. **Fix** en `RolesPage.tsx`, con un caso nuevo en `RolesPage.test.tsx` que fija la
   pluralización sobre los dos fixtures (el defecto era invisible para la suite).

Verificado: `tsc` limpio, lint 0 errores, **85/85** tests, `pnpm build` OK.

### ▶ `ErrorBoundary` global — HECHO (2026-08-14)

Cierra la última pieza de infraestructura transversal (`ESTADO.md` la listaba ⬜ desde la
Fase 10). **Promesa del bloque: un error de render no saca al operador del POS.**

- `components/shared/RutaError.tsx` — pantalla de error de ruta: copy en español, "Volver
  al punto de venta"/"Volver al inicio", "Recargar" y detalle técnico plegable para soporte.
- `app/ErrorBoundaryApp.tsx` — boundary de clase sobre `RouterProvider`, para fallos de
  arranque, cuando todavía no hay router al que pedirle nada.
- `router.tsx` — `errorElement` en la raíz + uno por layout. **Decisión clave:** cuelga de una
  ruta intermedia **sin `path`**, no de la ruta del layout; colgarlo del layout sustituiría el
  shell entero y el operador perdería encabezado, estado de caja y sesión.
- Recuperación primaria = **navegar**, no recargar: remonta la ruta y descarta el boundary
  conservando sesión y caja. Recargar queda de salida secundaria, y de única salida cuando el
  fallo es un chunk viejo (despliegue nuevo con la pestaña abierta).

Verificado en navegador (sesión admin, tenant real) en los dos layouts. La prueba en vivo
destapó 3 defectos que los tests no ven: panel casi invisible sobre el carbón del POS, panel
estirado a todo el ancho y botones de 36px bajo el mínimo táctil (→ `size="tap"`, 48px).
Front **88/88**, `tsc` limpio, lint 0 errores, build OK.

### ▶ Lo siguiente en el plan

1. **Sincronizar la tabla Fase 7** de `bar-pos-saas-api/docs/EspecificacionFuncional.md`:
   sigue documentando **3 roles** cuando el sistema tiene 5 + roles a medida (verificado
   2026-08-14: líneas 47, 141, 144, 424 dicen "admin/operador"). La spec miente.
2. **PIN de mesero** (opcional por tenant): login rápido / firma de venta en terminal
   compartida, con auto-bloqueo. Aquí sí entra `id_mesero` (ver §7 punto 1).
3. Deudas menores abiertas: ver **§8**.

### ▶ Cómo levantar el entorno

```bash
# 1. Backend (si no está arriba)
cd bar-pos-saas-api && docker compose --env-file .env.docker up -d
# 2. Frontend
cd bar-pos-web && pnpm dev
```

---

## 1. Objetivo del bloque

Pasar del modelo de 3 roles (super_admin/admin/operador) a **5 roles**: se agregan **gerente** y **mesero**, enviados como *presets* editables a futuro. Todo guiado por **permiso**, nunca por nombre de rol (regla de oro #3).

## 2. Los 5 roles (resumen)

| Rol | Qué es | Notas clave |
|---|---|---|
| **super_admin** | Plataforma multi-tenant | Autorizado por `Gate::before`. No opera ventas. |
| **admin** | Dueño del negocio | Autoridad máxima. Conserva POS. Único que gestiona admins. |
| **gerente** | Casi-admin operativo | = admin **sin** `configuracion.editar`, `auditoria.ver`, `usuarios.gestionar_admins`. Ve el dashboard completo. |
| **operador** | Cajero / "chalán" | Abre/cierra caja, cobra. Operaciones sensibles las **solicita** (🔐). |
| **mesero** | Toma orden y cierra cuenta | Cobra + imprime. Sin caja/descuento/inventario. Atribución por `id_mesero` (pendiente). |

## 3. Qué quedó COMPLETO y verificado

### Backend (`bar-pos-saas-api`)
- **`mesas.ver`** (permiso nuevo) + `MesaPolicy::viewAny/view` → `mesas.ver || mesas.gestionar`. **Corrige un bug pre-existente:** el operador no podía abrir órdenes de tipo _mesa_ (no podía listar mesas).
- **Roles `gerente`/`mesero`** en `RolesPermisosSeeder` (`PERMISOS_GERENTE`, `PERMISOS_MESERO`) + `ProveedorRolesTenant` los materializa por-tenant.
- **Comando `php artisan roles:sincronizar`** — propaga cambios de la matriz a los roles ya creados de tenants existentes (idempotente).
- **Asignación segura:** `Rule::in` dinámico (`App\Domain\Usuarios\RolesAsignables`) en `CrearUsuarioRequest`/`AsignarRolRequest`. Nuevo permiso **`usuarios.gestionar_admins`** (solo admin).
- **Salvaguarda anti-escalada (gerente no toca admins):**
  - Facet A (rol destino = admin): en los Form Requests (422).
  - Facet B (objetivo ya es admin): en `UsuarioPolicy::update/cambiarEstado/asignarRol` (403).
- **Tests:** `MesaTest`, `RolesNuevosTest`, `GestionRolesTest`. **Suite completa: 287/287 verde.**

### Frontend (`bar-pos-web`)
- **Selector de rol** (`UsuarioFormDialog`) data-driven desde `GET /roles`: etiquetas en español (`features/usuarios/roles.ts`), oculta `admin` sin `usuarios.gestionar_admins`.
- **`UsuariosPage`**: badge con etiqueta legible; oculta acciones sobre filas admin sin el permiso.
- **Sidebar Sistema/Negocio** (`app/layout/nav.ts` + `Sidebar.tsx`): navegación agrupada; grupos vacíos ocultos; super_admin conserva su sección "Plataforma". Proveedores movido a *Negocio*.
- **Landing por rol** (`AppHome`): admin/gerente → dashboard; operador/mesero → redirect a `/pos`.
- **Tests:** `features/usuarios/roles.test.ts`. **Suite completa: 66/66 verde. Typecheck OK, lint 0 errores.**

## 4. Decisiones tomadas (con razón)

- **Presets + editor a futuro**, no roles rígidos → diferenciador vs Soft Restaurant.
- **admin conserva POS**: el bar de una persona necesita config + venta en un login. Su *landing* es el dashboard, no se le amputa capacidad.
- **mesero por atribución suave** (`id_mesero` + filtro "mis mesas"), no candado de mesa. Cobra contra la caja compartida (una sola por tenant); el cajón por-mesero es V2.
- **PIN de mesero**: identificación/atribución en terminal compartida, **opcional**; nunca autoriza operaciones sensibles. (Aún no implementado.)
- **`dashboard.ver` DESCARTADO**: `DashboardInicio` ya se adapta por `reportes.ver` vs `reportes.ver_limitado`. No hacía falta permiso nuevo.
- **Propina**: fuera de V1 (decisión P9 del backend).

## 5. Cómo aplicar en el Docker de dev

Cualquier cambio de PHP exige reconstruir (imagen horneada). Cuando se toca la matriz de permisos:

```bash
docker compose --env-file .env.docker up -d --build
docker compose exec app php artisan db:seed --class=RolesPermisosSeeder
docker compose exec app php artisan roles:sincronizar
```

> Ya ejecutado para todo lo de arriba. Repetir solo si se vuelve a tocar `RolesPermisosSeeder`.

## 6. Cómo correr los tests

- **Backend:** `php vendor/phpunit/phpunit/phpunit` (usa SQLite en memoria; PHP 8.2 y `vendor/` están en el host, no requiere Docker). Filtrar: `--filter "GestionRolesTest|MesaTest"`.
- **Frontend:** `pnpm test` (Vitest), `pnpm exec tsc --noEmit` (typecheck), `pnpm lint`.

> **Nota (2026-08-06):** las secciones 7 a 7e son el registro cronológico de cada sub-bloque.
> Para saber qué sigue, usa la **§0**, que está al día.

## 7. Próximos pasos (en orden sugerido)

1. **Mesero fase 1 — atribución.** ⚠️ **Decisión revisada (2026-08-05):** NO se agrega `id_mesero`. `ordenes.id_usuario` **ya existe** y guarda quién abrió la orden; con cuentas por persona (decisión #3), *ese es el mesero*. Un `id_mesero` separado solo gana sentido con **terminal compartida + PIN** (cuenta ≠ mesero real), que es opcional/posterior — se difiere a ese bloque.
   - **1a — Atribución (HECHO 2026-08-05).** Backend: `OrdenResource` expone `usuario` en forma mínima `{id, nombre}` (no el UsuarioResource completo, para no fugar email/username por renglón); eager-load `usuario` en `OrdenController` index/show/store; test `OrdenTest::test_orden_expone_al_usuario_que_atiende` (suite 12/12). Frontend: `Orden.usuario` en tipos; `PosPage` muestra "Atendió: X" al ver todas y trae un toggle **Mis órdenes / Todas** cuyo default es por permiso (`!useCan('caja.abrir')` → mesero arranca en "mis órdenes"; cajero/admin ven todas), no por rol; test `PosPage.test.tsx` (2 casos). Filtro en cliente (conjunto acotado de órdenes abiertas), sin tocar DER ni permisos → **no exige rebuild de Docker**. tsc/lint OK, front 68/68.
   - **1b — Traspaso/reasignar (HECHO 2026-08-06).** Gerente/admin cambian el `id_usuario` (mesero) de una orden **abierta**. Permiso nuevo **`ordenes.reasignar`** (admin/gerente; matriz actualizada). Backend: `OrdenPolicy::reasignar`, `ReasignarOrdenRequest` (destino = usuario activo del mismo tenant, tenant implícito), `ReasignarOrdenService` (solo abierta vía `esModificable`, no toca caja/importes, auditado `orden.reasignada` con antes/después, no-op si no cambia), `PATCH ordenes/{id}/reasignar`. Tests `ReasignarOrdenTest` (6: admin/gerente ok, operador 403, otro-tenant 422, inactivo 422, no-abierta 422). **Backend 295/295.** Frontend: `useReasignarOrden`, `ReasignarDialog` (select de usuarios activos vía `useUsuarios`; reset de selección con patrón de ajuste-en-render, no efecto), botón "Reasignar mesero" en `TicketPanel` gateado por `useCan('ordenes.reasignar')` + "Atiende: X" en el encabezado. Tests `ReasignarDialog.test.tsx` (2). **Front 74/74**, tsc/lint OK. **Requiere rebuild + seed + `roles:sincronizar`** (permiso nuevo).
2. **Sincronizar la tabla Fase 7** de `bar-pos-saas-api/docs/EspecificacionFuncional.md` a 5 roles (hoy solo tiene 3) — para que la spec no mienta.
3. **Editor de roles por tenant** (el diferenciador): clonar/ajustar permisos por establecimiento. UI + endpoints.
4. **PIN de mesero** (opcional por tenant): login rápido / firma de venta en terminal compartida, con auto-bloqueo.

## 7b. Bugs del rol mesero — CORREGIDOS (2026-08-05)

Encontrados al probar el rol mesero end-to-end. Los cuatro venían de que el POS asumía que su usuario tenía acceso de admin/caja.

1. **Caja "cerrada" para el mesero (grave).** `GET /caja/actual` exigía `caja.abrir||caja.cerrar` (`SesionCajaPolicy::viewAny`) → al mesero le daba **403** → el front (`session.ts`) caía al `catch` y fijaba `cajaAbierta=false`. No podía crear ni cobrar aunque el cajero tuviera caja abierta.
   - **Fix (Opción A elegida):** permiso nuevo **`caja.ver`** (lectura), como se hizo con `mesas.ver`. Se otorga a admin/gerente/operador/mesero. `SesionCajaPolicy::verActual` = `caja.ver || abrir || cerrar`; `CajaController::actual` autoriza `verActual` y devuelve **payload reducido `{id, estado, abierta_at}` SIN montos** a quien solo tiene `caja.ver` (no filtra el efectivo en cajón). `viewAny` (histórico) sigue restringido → el mesero **no** ve histórico. Test `CajaTest::test_mesero_lee_estado_de_caja_sin_montos_y_no_ve_historico`. **Suite backend 289/289.**
2. **"Administración" en el POS hacía loop.** `PosLayout` enlazaba a `/app`, pero `AppHome` rebota a `/pos` a quien no tiene `reportes.ver`. Ahora el enlace solo aparece con `reportes.ver` (mismo permiso del landing).
3. **Badge "Caja cerrada" llevaba a ruta sin acceso.** Enlazaba a `/app/caja` (route con `caja.abrir`). Ahora solo enlaza con `useCan('caja.abrir')`; para el mesero es informativa.
4. **El POS no tenía "Cerrar sesión".** El mesero no podía salir sin pasar por Administración. Se agregó "Cerrar sesión" (reutiliza `useLogout`, como el `Topbar`) para todos.
   - **Frontend:** todo en `src/app/layout/PosLayout.tsx`; test `PosLayout.test.tsx` (2 casos). tsc/lint OK, front 70/70.
   - **⚠️ Requiere en Docker:** rebuild + `db:seed --class=RolesPermisosSeeder` + `roles:sincronizar` (permiso nuevo `caja.ver` → propagar a tenants existentes).

**Freshness de `cajaAbierta` — HECHO (2026-08-05, P1).** Antes solo se resolvía en el login; si el cajero abría caja después, el mesero la veía cerrada hasta recargar. Ahora `useSincronizarCajaAbierta()` (en `features/caja/api.ts`) monta `/caja/actual` con refetch al re-enfocar la ventana + intervalo de 30 s y empuja el resultado (presencia = abierta) a `cajaAbierta` del authStore; se monta en `PosLayout`. Tests: `features/caja/api.test.tsx` (2 casos). Front 72/72.

## 7c. Roles invisibles en tenants nuevos — CORREGIDO (2026-08-06)

**Síntoma:** al crear un establecimiento nuevo e intentar dar de alta un usuario, el selector
de rol solo ofrecía **Administrador y Operador**. Gerente y mesero no aparecían.

**Causa:** `GET /roles` devuelve las **filas materializadas** de la tabla `roles` para el tenant
(no un catálogo), y `CrearEstablecimientoService` seguía provisionando la lista literal
`['admin', 'operador']` — se quedó atrás al introducir gerente/mesero. Los tenants 1–5 sí los
tenían solo porque les había pasado `roles:sincronizar` a mano; el #6, creado después, no.

**Causa raíz:** "qué roles existen" estaba escrito a mano en **cinco** lugares (seeder,
`ProveedorRolesTenant::permisosDe`, `RolesAsignables::BASE`, default del comando y el servicio
de creación). Con cinco copias, que una se desincronice es lo esperable.

**Fix (backend):**
- **`app/Domain/Usuarios/CatalogoRoles.php` (nuevo)** — fuente única: `PERMISOS` (catálogo),
  los paquetes `PERMISOS_*` (movidos desde el seeder), el mapa `TENANT` (rol ⇒ permisos),
  `PLATAFORMA` (super_admin) y helpers `nombresTenant()`/`permisosDe()`/`todos()`.
- `RolesPermisosSeeder` → consumidor delgado que itera el catálogo (ya no declara constantes).
- `CrearEstablecimientoService` → provisiona `CatalogoRoles::nombresTenant()` completo.
- `ProveedorRolesTenant` → borrado el `match` duplicado; usa `CatalogoRoles::permisosDe()`.
- `RolesAsignables` → deriva del catálogo menos `admin` (salvaguarda anti-escalada intacta).
- `SincronizarRolesTenantsCommand` → `--roles` sin default literal; si se omite, catálogo completo.
- **`docker/php/entrypoint.sh` → corre `roles:sincronizar` tras el seed en cada arranque.**
  Es la pieza que hace la propagación automática: los permisos de un rol se *congelan* al crear
  la fila, así que el seed (plantillas de team nulo) nunca alcanzaba a los tenants vivos.
  Antes eso exigía una migración artesanal por cambio (ver `add_permisos_ver_catalogo`) o que
  alguien recordara el comando.

**Resultado:** agregar un rol = editar **un** archivo (`CatalogoRoles`) + su etiqueta en
`features/usuarios/roles.ts`. Un `up -d --build` lo propaga a tenants nuevos y existentes.

**Tests:** `CrearEstablecimientoServiceTest` +2 (provisiona todo el catálogo; cada rol trae su
paquete), afirmados **contra el catálogo** para que un rol nuevo extienda el test solo.
**Backend 297/297.** Pint limpio (de paso se formateó `ReasignarOrdenTest`, que venía sucio).
Verificado en vivo: el entrypoint reparó los 6 tenants y un tenant nuevo nace con los 4 roles
(comprobado con rollback, sin dejar basura en la BD de dev). **Frontend sin cambios.**

## 7d. Editor de roles a medida — FASE A (backend) HECHA (2026-08-06)

**Decisión de producto:** los 4 presets son **inmutables**; para personalizar se **clona**.
Motivo: `roles:sincronizar` corre en cada arranque y reescribiría cualquier edición de un
preset en silencio; y con presets intactos el soporte puede confiar en que "operador"
significa lo mismo en todos los tenants. La alternativa (presets editables con marca) se
descartó porque un permiso nuevo del catálogo nunca alcanzaría a los roles personalizados —
exactamente el bug de §7c reintroducido por otra puerta.

**Lo que NO era obvio:** esto no es un CRUD. Todo el sistema asumía *rol = nombre del
catálogo*, y el editor mueve el eje a *rol = fila del tenant*. Tres puntos reventaban:

1. **`AsignarRolService` vaciaba el rol al asignarlo.** Resolvía con
   `ProveedorRolesTenant::obtener()`, que sincroniza contra `CatalogoRoles::permisosDe()` →
   `[]` para un rol a medida. Nuevo `resolverParaAsignar()`: presets por `obtener()` (quedan
   al día), roles propios por búsqueda directa **sin tocar permisos**.
2. **`RolesAsignables` rechazaba los roles propios** (validaba contra la lista del catálogo).
   Ahora consulta los roles del establecimiento.
3. **La sincronización de arranque** habría pisado ediciones de presets → resuelto por diseño
   con la inmutabilidad, no con un caso especial en el comando.

**Seguridad — dos candados independientes:**
- **`roles.gestionar` (permiso nuevo, solo admin).** El gerente NO lo tiene: quien define
  permisos puede fabricarse un rol equivalente a admin.
- **Contención de privilegios** en `GuardarRolRequest`: no puedes otorgar un permiso que tú
  no tienes. Además `CatalogoPermisos::asignables()` excluye los de plataforma.
- **Fuga cerrada de paso:** `UsuarioPolicy::puedeGestionar` medía "es admin" con
  `hasRole('admin')`. Con roles a medida, un rol propio con `usuarios.gestionar_admins` es un
  admin sin el nombre y quedaba desprotegido (un gerente podía desactivarlo). Ahora se mide
  por **permiso** (`can('usuarios.gestionar_admins')`), como manda la regla de oro #3.

**Corrección de la matriz (destapada por un test que falló):** el ADMIN no tenía
`autorizaciones.solicitar` ni `reportes.ver_limitado`, así que la contención le impedía
**clonar el preset `mesero`** — el caso de uso #1 del editor. Se le agregaron: es inocuo
(verificado uno por uno: los controllers usan el permiso directo y solo caen a "solicitar"
como fallback; `AlcanceReporte`, `ReportePolicy` y `DashboardInicio` evalúan `reportes.ver`
primero) y establece la invariante **admin ⊇ todos los permisos otorgables al tenant**,
que es la definición de producto del rol y ahora está blindada con un test.

**Piezas nuevas (backend):** `CatalogoPermisos` (catálogo agrupado por módulo con etiqueta y
descripción en español — el backend es dueño del texto para que un permiso nuevo llegue a la
UI sin desplegar el front), `App\Models\Rol` (extiende el Role de Spatie con `BelongsToTenant`;
NO reemplaza el modelo en `config/permission.php`, para no meter un scope global en la
resolución de permisos), `RolPolicy`, `GuardarRolService` (crear/clonar/actualizar/eliminar),
`GuardarRolRequest`, `RolModificado` + auditoría, `RolEnUsoException` (409), migración
`roles.etiqueta`/`descripcion`, y `GET|POST /roles`, `GET /roles/permisos`,
`PUT|DELETE /roles/{id}`.

**Verificación:** backend **314/314**, Pint limpio. Smoke E2E en vivo contra el Docker
(token temporal, borrado después): catálogo de 35 permisos sin los de plataforma; clonar
operador → "Cajero nocturno" ok; editar preset → 403; permiso de plataforma → 422; etiqueta
reservada → 422; eliminar → ok; auditoría `rol.creado`/`rol.eliminado` registrada. Sin basura
en la BD de dev.

## 7e. Editor de roles — FASE B (frontend) HECHA (2026-08-06)

**Feature nueva `features/roles/`** (`api.ts`, `schemas.ts`, `types.ts`, `etiquetas.ts`,
`components/{SelectorPermisos,RolFormDialog}.tsx`, `pages/RolesPage.tsx`).

**Refactor de propiedad:** `RolRecurso`, `useRoles` y `roles.ts` vivían dentro de
`features/usuarios`. Se movieron a `features/roles` — los roles dejaron de ser un catálogo
fijo del módulo de usuarios cuando llegó el editor. `usuarios` los importa del **módulo hoja**
(`@/features/roles/api`, `/etiquetas`, `/types`) y no del barrel, para no arrastrar `RolesPage`
al chunk de usuarios (el build lo confirma: `roles` sale en su propio chunk de 9.1 kB).

**Decisiones de UI:**
- **Dos secciones, no una tabla.** "Roles del sistema" (tarjetas con acción **Clonar**) y
  "Roles propios" (Editar/Clonar/Eliminar). La separación visual es lo que hace entender sin
  documentación por qué un preset no se edita. Tarjetas y no `DataTable` porque `GET /roles`
  no pagina y son pocos: interesa el *contenido* del rol (permisos, usuarios), no escanear filas.
- **Clonar es un modo del mismo diálogo**, no una pantalla aparte: el resultado es idéntico
  (un rol propio nuevo), solo cambia de dónde salen los permisos iniciales. Precarga los del
  origen y propone "«Origen» (copia)" como nombre editable.
- **`SelectorPermisos`** agrupa por módulo con el texto que manda el backend (`GET /roles/permisos`),
  con atajo **Todos/Ninguno por grupo** y contador `n de m`. Sin el atajo, configurar 35 permisos
  son 35 clics; el caso real es "todo el punto de venta, nada de inventario".
- **El slug técnico nunca se muestra.** `nombreDeRol()` usa la `etiqueta` del rol a medida y
  traduce el preset; hay un test que verifica que `cajero_nocturno` no aparece en pantalla.

**Ruta y navegación:** `/app/roles` bajo `RequirePermission perm="roles.gestionar"` +
`excluirSuperAdmin`; ítem "Roles" en el grupo **Sistema** del sidebar.

**Verificación:** front **81/81** (5 tests nuevos de `RolesPage` + 2 de `nombreDeRol`),
`tsc --noEmit` limpio, lint **0 errores** (quedan los 2 warnings preexistentes de
`MovimientoDialog`), `pnpm build` OK.

## 7f. Roles de un bar visibles en otro — CORREGIDO (2026-08-07)

**Síntoma:** un rol a medida creado en un establecimiento ("Cajero nocturno") aparecía al
entrar con un usuario de **otro** establecimiento.

**Dónde NO estaba.** El backend aísla bien: `Rol` lleva `TenantScope`, `GuardarRolService`
fija `id_establecimiento` explícito, `GuardarRolRequest` valida etiqueta y `clonar_de`
dentro del tenant, y `RolesAsignables` consulta la tabla del establecimiento. Verificado en
vivo contra el Docker (token temporal, borrado después): el admin del tenant 2 recibe sus 4
presets y **no** ve el rol a medida del tenant 1.

**Causa (frontend):** el caché de TanStack Query es un singleton de módulo y **nadie lo
vaciaba al cambiar de sesión**. Como la app es una SPA, salir y entrar no recarga la página:
`clearSession()` limpiaba el authStore pero dejaba intactas las respuestas del usuario
anterior. Las query keys (`qk.roles.all`, `qk.usuarios.all`…) no llevan establecimiento —
son las mismas para todos —, así que el siguiente usuario las reutilizaba tal cual. Con el
`staleTime` de 5 min de `useRoles` ni siquiera había refetch que corrigiera la vista.
Afectaba a **todo** el caché (usuarios, productos, mesas…), no solo a roles.

**Fix:** `src/app/queryClient.ts` se suscribe al authStore y hace `queryClient.clear()`
cuando cambia el `token`. Un solo punto cubre los tres caminos: login (`setToken`), cierre
de sesión (`clearSession`) y expulsión por 401 del interceptor de Axios. La suscripción se
registra al importar el módulo, antes de que monte cualquier componente.

**Tests:** `src/app/queryClient.test.ts` (3: cambio de usuario, cierre de sesión, y que un
cambio de estado ajeno —`cajaAbierta`— no tire el caché). Front **84/84**, `tsc --noEmit`
limpio, lint 0 errores. **Backend sin cambios.**

## 8. Deudas / pendientes abiertos

- ~~**Divergencia `tickets.reimprimir` del operador.**~~ **CERRADA (2026-08-15): no era una decisión pendiente.** Al rastrear el permiso hasta su origen apareció **P14**, ya respondida por el dueño del producto (*"no se necesita autorización para reimpresión"*) y recogida en `ArquitecturaBackend.md` en cuatro lugares. El código siempre estuvo alineado: los 4 roles del tenant lo tienen directo y `ReimprimirTicketService` audita `ticket.reimpreso` dentro de la transacción. Lo desalineado era la matriz de la Fase 7, que arrastraba un 🔐 del borrador previo a P14. Corregidas `MatrizRoles.md` y la Fase 7. **Lección:** antes de tratar algo como "decisión pendiente", rastrear el permiso hasta su decisión de origen — la deuda estuvo abierta semanas sin serlo.
- **`DashboardInicio` rama limitada:** tras el redirect de landing, la vista limitada del turno (operador/mesero) quedó sin punto de entrada (no hay ítem "Reportes" en el sidebar). Si se quiere que el operador vea su resumen de turno, habría que darle una entrada; si no, se puede simplificar `DashboardInicio` quitando esa rama.
- **`UltimoAdminGuard` sigue razonando por `hasRole('admin')`.** A diferencia de
  `UsuarioPolicy` (ya migrada a permiso), el guard del "último admin activo" cuenta usuarios
  con el rol preset `admin`. Con roles a medida, un tenant cuyo único dueño tuviera un rol
  propio admin-equivalente no estaría cubierto por la regla. Hoy es inalcanzable (el admin
  inicial siempre nace con el preset y no puede degradarse a sí mismo si es el último), pero
  conviene alinearlo a `can('usuarios.gestionar_admins')` cuando se toque ese servicio.
- **Un rol a medida no puede renombrar su `name` técnico.** Al renombrar solo cambia la
  `etiqueta`; el slug queda como se generó. Es deliberado (es el identificador de Spatie ya
  grabado en `model_has_roles`), pero puede desconcertar en la auditoría.
- **`roles:sincronizar` en cada arranque es O(tenants × roles).** Con 6 establecimientos es
  instantáneo; con cientos, sumará segundos al arranque, y con miles hay que moverlo (a un job
  en cola, o condicionarlo a un hash de la matriz para que sea no-op cuando nada cambió). Es la
  compensación aceptada por no depender de que alguien recuerde el comando. Revisar al escalar.
- **`soporte.impersonacion`** (P17): permiso futuro del super_admin para dar soporte a un tenant. Diferido a Fase 9, sin consumidor aún.
- **2 warnings de lint** preexistentes en `features/insumos/components/MovimientoDialog.tsx` (react-hooks/incompatible-library) — ajenos a este bloque.
- **`useActivarUsuario` no invalida `qk.roles.all`.** Es deliberado: activar/desactivar no mueve la asignación de rol. Asume que el `usuarios_count` del backend cuenta **asignaciones** y no usuarios activos; si resulta que filtra por activos, ese hook necesita el mismo invalidate que `useGuardarUsuario`. Confirmar al tocar el backend.
- **Los boundaries NO atrapan errores dentro de event handlers.** Es un límite de React, no del diseño: si el `onClick` de "Cobrar" lanza, `RutaError` ni se entera. Ese camino depende del manejo de errores de las mutaciones (toasts con el `message` del backend), que ya existe. La consecuencia práctica: un fallo al cobrar se ve como un toast, no como la pantalla de error — comportamiento correcto, pero conviene tenerlo presente al diagnosticar "no pasó nada al pulsar el botón". Si algún handler crítico queda mudo, el arreglo es un `try/catch` con toast en ese handler, no tocar el boundary.
- **Nadie se entera de los errores en producción.** El error muere en la consola del navegador del mesero; `RutaError` solo lo muestra en "Detalle técnico" para que el usuario lo dicte por teléfono. Sin servicio de reporte (Sentry o equivalente) no hay forma de saber que algo truena en un bar a las 11 de la noche. Es una decisión con costo y con implicaciones de privacidad (un stack trace puede arrastrar datos del tenant), por eso quedó fuera del bloque: hay que decidirla, no colarla.
- **El caso "chunk caído" no está verificado en vivo.** El copy "Hay una versión nueva del sistema" está cubierto por test unitario, pero reproducirlo de verdad exige desplegar mientras alguien tiene la pestaña abierta. Verificar en el primer despliegue real.
- **`pnpm test` muere en la máquina del usuario** (Windows + OneDrive) con *"Timeout waiting for worker to respond"* del pool `forks`, sin correr un solo test. No es el código: con `pnpm exec vitest run --pool=threads` pasa la suite completa. Si se vuelve recurrente, fijar `pool: 'threads'` en la config de Vitest.
- **Basura de datos en RBAC — LIMPIADA (2026-08-05).** Diagnóstico confirmó que el esquema está bien (Spatie *teams*, `team_foreign_key=id_establecimiento`; `id_rol` es cache del rol, invariante consistente — 0 divergencias con `model_has_roles`). Cruft eliminado en una transacción sobre la BD de dev: (A) roles huérfanos `id=4 operador` e `id=5 admin` con `id_establecimiento=0` (tenant inexistente) → borrados con sus 41 `role_has_permissions`; (B) usuarios `id_establecimiento=NULL` que no eran el super_admin real: `Lalo` (id 3) **decidido = super_admin del dueño** → corregido a `id_rol=1` sin `model_has_roles` (idéntico al super_admin id 1); `qa.fase2` (2) y `sddd` (4) → soft-deleted, `id_rol` liberado. Resultado: roles 27→25, role_has_permissions 551→510, 0 roles con team=0. Fue limpieza de datos (no migración/seeder). **Pendiente (P3):** test que blinde el invariante `id_rol ↔ model_has_roles` para que no reaparezca por código.

## 9. Archivos clave tocados en este bloque

**Backend:** `database/seeders/RolesPermisosSeeder.php`, `app/Domain/Usuarios/{ProveedorRolesTenant,RolesAsignables}.php`, `app/Policies/{MesaPolicy,UsuarioPolicy}.php`, `app/Http/Requests/{CrearUsuario,AsignarRol}Request.php`, `app/Console/Commands/SincronizarRolesTenantsCommand.php`, tests en `tests/Feature/{Catalogo/MesaTest,Endurecimiento/RolesNuevosTest,Usuarios/GestionRolesTest}.php`.

**Frontend:** `src/features/usuarios/{roles.ts,roles.test.ts,api.ts,components/UsuarioFormDialog.tsx,pages/UsuariosPage.tsx}`, `src/app/layout/{nav.ts,Sidebar.tsx}`, `src/app/pages/AppHome.tsx`.

**Docs:** `docs/MatrizRoles.md` (contrato), este handoff.
