# Matriz de roles y permisos (5 roles)

> **Estado:** diseño acordado 2026-08-04, **implementado y sincronizado al 2026-08-14**. La
> **Fase 7** de `bar-pos-saas-api/docs/EspecificacionFuncional.md` ya refleja los 5 roles
> (se actualizó el 2026-08-14; antes documentaba solo 3).
> Este documento es el **contrato** que deben copiar el seeder del backend y el gating del frontend.
>
> **Sincronización obligatoria al implementar** (para no reintroducir drift doc↔código):
> 1. `bar-pos-saas-api/app/Domain/Usuarios/CatalogoRoles.php` — **fuente única** en código
>    (constantes `PERMISOS_*` + el mapa `TENANT`). Desde 2026-08-06 el seeder, el
>    provisionamiento de tenants, `RolesAsignables` y `roles:sincronizar` derivan todos de
>    ahí; **agregar un rol es tocar solo este archivo**.
> 2. `bar-pos-saas-api/docs/EspecificacionFuncional.md` → tabla Fase 7 (agregar columnas GERENTE y MESERO).
> 3. Frontend: gating por `useCan(...)` (no hardcodear rol) + etiqueta en
>    `bar-pos-web/src/features/roles/etiquetas.ts` si el rol preset es nuevo (los roles a
>    medida del editor traen su `etiqueta` desde el backend y no se traducen).
>
> **Propagación:** el entrypoint del contenedor corre `roles:sincronizar` en cada arranque,
> así que un `up -d --build` alcanza a los tenants nuevos **y** a los ya existentes.

## Vocabulario

- **super_admin** — administra la plataforma (multi-tenant); no opera ventas. Autorizado por `Gate::before`, no por `model_has_roles`.
- **admin** — dueño del negocio. Autoridad máxima del tenant. Conserva acceso al POS (caso de una persona), pero su *landing* es el dashboard.
- **gerente** — casi-admin sin decisiones estratégicas: sin dashboard, sin configuración del sistema, sin auditoría.
- **operador** — el "cajero" / "chalán": despacha, abre/cierra caja, cobra. Las operaciones sensibles las **solicita** (🔐).
- **mesero** — toma órdenes y **cierra sus cuentas** (cobra + imprime). Atribución por **mesero efectivo** = `COALESCE(id_mesero, id_usuario)` (ver "Atribución del mesero" abajo: `id_mesero` existe desde el 2026-08-15 y solo se llena con terminal compartida).

## Leyenda

✅ Permitido directo · ❌ No permitido · 🔐 Requiere autorización (solicita; admin/gerente aprueba)

## Matriz

| Permiso | SUPER_ADMIN | ADMIN | GERENTE | OPERADOR | MESERO |
|---|:--:|:--:|:--:|:--:|:--:|
| **Plataforma** | | | | | |
| establecimientos.gestionar | ✅ | ❌ | ❌ | ❌ | ❌ |
| establecimientos.activar | ✅ | ❌ | ❌ | ❌ | ❌ |
| establecimientos.asignar_admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| establecimientos.restablecer_acceso | ✅ | ❌ | ❌ | ❌ | ❌ |
| metricas.globales | ✅ | ❌ | ❌ | ❌ | ❌ |
| auditoria.global | ✅ | ❌ | ❌ | ❌ | ❌ |
| `soporte.impersonacion` *(NUEVO — Fase futura)* | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Administración del negocio** | | | | | |
| _(dashboard: sin permiso propio — lo escala `reportes.ver` / `reportes.ver_limitado`)_ | — | — | — | — | — |
| configuracion.editar | ❌ | ✅ | ❌ | ❌ | ❌ |
| auditoria.ver | ❌ | ✅ | ❌ | ❌ | ❌ |
| usuarios.gestionar | ❌ | ✅ | ✅ ¹ | ❌ | ❌ |
| `usuarios.gestionar_admins` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `roles.gestionar` *(editor de roles a medida)* | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Catálogo e inventario (gestión)** | | | | | |
| categorias.gestionar | ❌ | ✅ | ✅ | ❌ | ❌ |
| productos.gestionar | ❌ | ✅ | ✅ | ❌ | ❌ |
| recetas.gestionar | ❌ | ✅ | ✅ | ❌ | ❌ |
| insumos.gestionar | ❌ | ✅ | ✅ | ❌ | ❌ |
| proveedores.gestionar | ❌ | ✅ | ✅ | ❌ | ❌ |
| unidades.gestionar | ❌ | ✅ | ✅ | ❌ | ❌ |
| mesas.gestionar | ❌ | ✅ | ✅ | ❌ | ❌ |
| impresoras.gestionar | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Lectura para el POS** | | | | | |
| categorias.ver | ❌ | ✅ | ✅ | ✅ | ✅ |
| productos.ver | ❌ | ✅ | ✅ | ✅ | ✅ |
| `mesas.ver` *(NUEVO — confirmado necesario)* | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Caja** | | | | | |
| `caja.ver` *(NUEVO — lectura del estado para la compuerta del POS)* | ❌ | ✅ | ✅ | ✅ | ✅ |
| caja.abrir | ❌ | ✅ | ✅ | ✅ | ❌ |
| caja.cerrar | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Ciclo de venta** | | | | | |
| ordenes.crear | ❌ | ✅ | ✅ | ✅ | ✅ |
| ordenes.agregar_item | ❌ | ✅ | ✅ | ✅ | ✅ |
| ordenes.cobrar | ❌ | ✅ | ✅ | ✅ | ✅ |
| ordenes.aplicar_descuento | ❌ | ✅ | ✅ | ✅ | ❌ |
| tickets.imprimir | ❌ | ✅ | ✅ | ✅ | ✅ |
| tickets.reimprimir ³ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Operaciones sensibles** | | | | | |
| ordenes.cancelar_item | ❌ | ✅ | ✅ | 🔐 | 🔐 |
| ordenes.anular | ❌ | ✅ | ✅ | 🔐 | 🔐 |
| `ordenes.reasignar` *(NUEVO — traspaso de mesero, fase 1b)* | ❌ | ✅ | ✅ | ❌ | ❌ |
| inventario.merma | ❌ | ✅ | ✅ | ✅ | ❌ |
| inventario.entrada | ❌ | ✅ | ✅ | 🔐 | ❌ |
| inventario.ajustar | ❌ | ✅ | ✅ | 🔐 | ❌ |
| **Autorizaciones** | | | | | |
| autorizaciones.solicitar | ❌ | ✅ ² | ❌ | ✅ | ✅ |
| autorizaciones.aprobar | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Reportes** | | | | | |
| reportes.ver (completo) | ❌ | ✅ | ✅ | ❌ | ❌ |
| reportes.ver_limitado (turno propio) | ❌ | ✅ ² | ❌ | ✅ | ✅ |

> ³ **Reimprimir es directo para todos, pero SIEMPRE auditado** — decisión **P14**
> (`EspecificacionFuncional.md`, respondida por el dueño del producto): *"no se necesita
> autorización para reimpresión"*. `ReimprimirTicketService` registra `ticket.reimpreso` (orden,
> tipo, folio) **dentro de la misma transacción** que encola la impresión: no se puede reimprimir
> sin dejar rastro. El control es la bitácora, no un bloqueo — poner 🔐 dejaría al mesero
> esperando al admin cada vez que la impresora corta mal un ticket, por un riesgo que no mueve
> dinero ni inventario. *Esta tabla marcó 🔐 para operador y mesero hasta el 2026-08-15: era un
> residuo del borrador anterior a P14, corregido al rastrear el permiso hasta su origen.*
> **Nota:** P14 hablaba de "admin y operador" porque `mesero` aún no existía; que el mesero
> reimprima sus propios tickets es extensión natural de la misma decisión.
>
> ² **El ADMIN tiene TODOS los permisos otorgables al tenant** (invariante desde 2026-08-06,
> con el editor de roles). No cambia lo que ve ni lo que hace: los controllers usan el permiso
> directo y solo caen a `autorizaciones.solicitar` como *fallback*, y `AlcanceReporte` /
> `ReportePolicy` / `DashboardInicio` evalúan `reportes.ver` primero. Existe porque el editor
> aplica **contención de privilegios** ("no puedes otorgar un permiso que tú no tienes"), y sin
> esos dos permisos el dueño no podía ni clonar el preset `mesero`.
> Blindado con `EditorRolesTest::test_el_admin_tiene_todos_los_permisos_otorgables`.

## Atribución del mesero: los dos escenarios (decidido 2026-08-14)

El SaaS debe servir a **ambos** modos de operación, porque los dos existen en la realidad del
cliente:

| Escenario | Cómo opera | Quién es "el mesero" de una orden |
|---|---|---|
| **Dispositivo por mesero** | cada mesero entra con su cuenta en su tablet/teléfono | `ordenes.id_usuario` — la cuenta **es** la persona |
| **Terminal compartida** | una tablet en la barra para varios meseros | `ordenes.id_mesero`, capturado por **PIN** (la cuenta es del dispositivo, no de la persona) |

**Regla de resolución (una sola ruta de código):**

```
mesero_efectivo(orden) = COALESCE(orden.id_mesero, orden.id_usuario)
```

- `id_usuario` **siempre** existe (lo setea `CrearOrdenService` con `Auth::id()`).
- `id_mesero` es **nullable** y solo se llena en terminal compartida.
- El filtro "mis órdenes", el reporte por mesero y el traspaso (`ordenes.reasignar`) leen
  `mesero_efectivo`, **no** uno u otro campo.

Consecuencia: el establecimiento con dispositivo por mesero **no configura nada** y no paga
complejidad por una función que no usa; el de terminal compartida activa el ajuste del tenant y
`id_mesero` empieza a llenarse. No son dos sistemas ni dos ramas de lógica: es un campo opcional
más una función de resolución.

**Estado:** el escenario "dispositivo por mesero" está **implementado y en producción** desde el
2026-08-05 (atribución, "Atendió: X", filtro Mis órdenes/Todas) y el traspaso desde el 2026-08-06.
El escenario "terminal compartida" tiene el **backend completo desde el 2026-08-15**:
`ordenes.id_mesero` / `pagos.id_mesero` (nullable), ajuste `terminal_compartida` +
`bloqueo_terminal_segundos` por tenant, tabla `mesero_pins`, identificación por PIN y reporte
**Ventas por mesero** que agrupa por mesero efectivo. **Falta el frontend**: pantalla de
desbloqueo, auto-bloqueo por inactividad, firma al cobrar y gestión del PIN desde Usuarios.

**Cómo se protege la atribución.** Identificarse devuelve un **token opaco de vida corta** (el
mismo plazo del auto-bloqueo) que el POS adjunta al crear la orden y al cobrar. El `id_mesero`
**nunca** viaja desde el cliente: si lo hiciera, cualquiera podría atribuirse ventas editando la
petición, sin conocer ningún PIN, y el reporte no significaría nada.

**Quién fija el PIN.** El admin (`usuarios.gestionar`), **no** su dueño — al revés que el PIN de
autorización de M14.1. En una barra con tablet compartida el mesero suele no tener credenciales
propias con las que entrar a fijárselo. El riesgo queda acotado: quien conozca el PIN puede
atribuirse una venta, no autorizar nada.

⚠️ **El PIN de mesero NUNCA autoriza operaciones sensibles.** Es autenticación débil: sirve para
identificar y atribuir, no para aprobar dinero. Las operaciones sensibles siguen pasando por
autorización de dos niveles (o por el PIN **de autorización** de M14.1, que es un concepto
distinto aunque comparta la infraestructura HMAC).

## Permisos nuevos a crear

1. **`mesas.ver`** ✅ **IMPLEMENTADO** (2026-08-05) — agregado al catálogo y a los paquetes de `admin`, `gerente`, `operador`, `mesero`. `MesaPolicy::viewAny`/`view` ahora exigen `mesas.ver || mesas.gestionar` (la gestión sigue solo con `mesas.gestionar`).
2. **`dashboard.ver`** — ❌ **DESCARTADO** (2026-08-05). Al construir el sidebar se verificó que `DashboardInicio` **ya se adapta por permiso**: `useCan("reportes.ver")` → dashboard completo (admin/gerente); si no → vista limitada del turno (operador/mesero). Un permiso `dashboard.ver` duplicaría lo que `reportes.ver` / `reportes.ver_limitado` ya expresan. `gerente` = `admin` menos `{configuracion.editar, auditoria.ver}` y ve el dashboard completo (correcto: un gerente evalúa operación).
3. **`soporte.impersonacion`** — ⏸️ **DIFERIDO** (P17, Fase 9). Solo SUPER_ADMIN, sin consumidor aún.

### ✅ Bug pre-existente CORREGIDO (2026-08-05)

`NuevaOrdenDialog` (POS) llama `GET /mesas` (`useMesas`) para elegir mesa, pero ese endpoint exigía `mesas.gestionar` (admin). **Un operador no podía abrir una orden de tipo _mesa_** (barra/para-llevar sí). El E2E de la Fase 6/7 no lo detectó porque el operador de la demo solo ejercitó barra/para-llevar. Corregido con `mesas.ver` + `MesaPolicy` relajada. Cubierto por `MesaTest::test_operador_lista_mesas`.

### Estado de implementación (2026-08-05)

- ✅ Seeder: `mesas.ver` en el catálogo; paquetes `PERMISOS_GERENTE`/`PERMISOS_MESERO`; roles plantilla `gerente`/`mesero` creados.
- ✅ `ProveedorRolesTenant` reconoce `gerente`/`mesero` al materializar por-tenant.
- ✅ `MesaPolicy` corregida. Comando `php artisan roles:sincronizar` para propagar a tenants existentes.
- ✅ Tests: `MesaTest`, `RolesNuevosTest`.
- ✅ **Asignación (2026-08-05):** `Rule::in` de `CrearUsuarioRequest`/`AsignarRolRequest` ahora es dinámico (`RolesAsignables`); `gerente`/`mesero` asignables por API. Salvaguarda anti-escalada por permiso `usuarios.gestionar_admins` (ver sección de arriba). Frontend: selector con etiquetas en español + gating del rol admin. Suite backend **287/287**, frontend **66/66**.
- ✅ **Sidebar Sistema/Negocio (2026-08-05):** `nav.ts` agrupa por `grupo` (inicio/negocio/sistema/plataforma); `Sidebar` pinta secciones y oculta grupos vacíos. Proveedores movido a *Negocio* (va con inventario). `dashboard.ver` descartado (ver arriba).
### Estado al 2026-08-14 (cerrado lo de arriba)

- ✅ **Tabla Fase 7 de la spec sincronizada** (2026-08-14): ya documenta los 5 roles + roles a medida.
- ✅ **Mesero fase 1a** (2026-08-05): atribución sobre `id_usuario` — "Atendió: X", filtro Mis órdenes/Todas con default por permiso. **Sin `id_mesero`**: con cuentas por persona, la cuenta ya es el mesero.
- ✅ **Mesero fase 1b** (2026-08-06): traspaso con `ordenes.reasignar` + `ReasignarDialog`.
- ✅ **Editor de roles a medida** (2026-08-06, backend + frontend; verificado en navegador el 2026-08-13).
- ✅ **Landing de operador/mesero RESUELTO** (2026-08-05): `AppHome` redirige por permiso — con `reportes.ver` → dashboard; sin él → `/pos`.
- ✅ **Divergencia `tickets.reimprimir` CERRADA (2026-08-15).** No era una decisión pendiente: **P14 ya la había resuelto** (reimpresión directa, sin autorización, auditada) y el código siempre estuvo alineado; era esta matriz la que arrastraba un 🔐 del borrador previo. Corregida a ✅ con la nota ³.
- ⏳ **Pendiente:** **PIN de mesero** (escenario terminal compartida, ver arriba); test que blinde el invariante `id_rol ↔ model_has_roles`; `soporte.impersonacion` (sin consumidor).

> **Nuevo permiso introducido:** `usuarios.gestionar_admins` (solo admin). Al desplegar en el Docker de dev hay que reconstruir + `db:seed --class=RolesPermisosSeeder` + `roles:sincronizar` para que los admins existentes lo ganen.

## Salvaguarda anti-escalada — ¹ GERENTE gestiona usuarios pero NO admins ✅ IMPLEMENTADO (2026-08-05)

Guiada por el permiso **`usuarios.gestionar_admins`** (solo admin), no por nombre de rol (regla de oro #3). Dos mitades:
- **Facet A (rol destino = admin):** `App\Domain\Usuarios\RolesAsignables::para($actor)` — el rol `admin` solo es asignable con `usuarios.gestionar_admins`. Se usa en `CrearUsuarioRequest` y `AsignarRolRequest` (422 "No puedes asignar ese rol.").
- **Facet B (objetivo ya es admin):** `UsuarioPolicy::update/cambiarEstado/asignarRol` — tocar a un admin exige `usuarios.gestionar_admins` (403).
- **Frontend (defensa en capas):** el selector de rol oculta `admin`/`super_admin` sin el permiso, y la tabla oculta acciones sobre filas admin (`useCan('usuarios.gestionar_admins')`).
- Cubierto por `tests/Feature/Usuarios/GestionRolesTest.php`.

## Notas y riesgos abiertos
- **✅ `tickets.reimprimir` — RESUELTO (2026-08-15).** Lo que este documento describía como divergencia doc↔código era doc↔doc: **P14** ya había decidido que la reimpresión es **directa y sin autorización, pero auditada**, y tanto el seeder como `TicketPolicy` y `ReimprimirTicketService` siempre lo respetaron. El 🔐 vivía solo en esta matriz y en la Fase 7, ambas heredadas del borrador previo a P14. Las dos corregidas a ✅ (ver nota ³).
- **Atribución `id_mesero`:** NO es un permiso, es un campo de datos en la orden/pago. Habilita "mis mesas" (filtro por defecto) y el reporte "cuánto cobró cada mesero". Se diseña aparte con DER.
- **Caja compartida:** una sola caja abierta por establecimiento (índice único parcial en `sesiones_caja`). Con mesero cobrando, la responsabilidad del efectivo es por caja, no por persona; la atribución cubre el reporte. Cajón por mesero/terminal → V2.
- **Propina:** fuera de V1 (decisión P9). Se capturaría en el cobro y se atribuiría al mesero. V2.
- **PIN de mesero:** identificación/atribución en terminal compartida, **opcional** (ajuste del tenant), reutiliza infra HMAC del PIN de autorización (M14.1) pero como concepto propio. **Nunca** autoriza operaciones sensibles.
- **Roles personalizables:** estos 5 son **presets**. El editor de roles por tenant (fase futura) permitirá clonar y ajustar estos sets — de ahí que el gating deba seguir por permiso, jamás por nombre de rol.
