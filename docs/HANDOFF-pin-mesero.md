# Handoff — PIN de mesero / terminal compartida (dónde nos quedamos)

> **Última sesión:** 2026-08-21. Documento para retomar en frío.
> **Contrato de roles:** [`MatrizRoles.md`](./MatrizRoles.md) § "Atribución del mesero".
> **Esquema:** `bar-pos-saas-api/docs/DER.md` §25 y V1.4.

---

## 0. PUNTO DE RETOMA (empieza por aquí)

**Bloque COMPLETO.** Los 7 pasos del frontend hechos y **probados en navegador**: 3.1–3.5 y 3.7
el 2026-08-19, el 3.6 el 2026-08-21. Backend 339/339 con Pint limpio; front 110/110, tsc y lint
limpios.

**Prueba en vivo del 3.6** (Bar De la Esquina, 2026-08-21): orden 000008 abierta desde la cuenta
`RosAdmin` firmando **Mesero 1** y cobrada firmando **Mesero 2** ($110). El ticket T000002 dice
"Le atendió · Mesero 1"; el reporte da a Mesero 1 la orden atendida y a Mesero 2 el cobro. Con
otra venta del día cruzada al revés ($100), las dos columnas suman **$210 cada una** — el total de
ventas del día, sin duplicar.

⚠️ **Sin commitear al 2026-08-21:** los cambios del 3.6 están en el working tree de ambos repos.
Lo anterior sí está commiteado: back `4005629` · `0573baf` · **`f49ffc1`**, front `4a84741` ·
`6a71ba8` · **`3a2ab1f`**.

### ▶ Lo primero al empezar

```bash
# 1. El backend corre con el código HORNEADO en la imagen: sin rebuild, los endpoints
#    nuevos no existen y las 3 migraciones no están aplicadas.
cd bar-pos-saas-api
docker compose --env-file .env.docker up -d --build
docker compose exec app php artisan migrate

# 2. Frontend
cd ../bar-pos-web && pnpm dev
```

**Tenant de prueba listo:** *Bar De la Esquina* quedó con **terminal compartida activada,
bloqueo de 120 s y PIN para `Mesero1` (482913) y `Mesero2` (571462)** — PIN de prueba, cámbialos
cuando el tenant deje de ser de juguete. En los demás establecimientos el ajuste sigue apagado,
como nace por defecto. Siguiente paso: **3.6** (reporte "Ventas por mesero").

### ⚠️ El backend NO estaba completo (corregido el 2026-08-19)

El handoff anterior daba el backend por terminado, y para este bloque le faltaba la mitad
visible: la migración creó `terminal_compartida` y `bloqueo_terminal_segundos`, pero **M03 nunca
las adoptó** — `ConfiguracionEstablecimientoResource` no las exponía y `ActualizarConfiguracionRequest`
las descartaba en silencio. Con `GET /terminal/modo` siendo solo lectura, **el modo no se podía
encender desde ninguna API**: solo tocando la base a mano.

Corregido en `0573baf`: los dos campos viajan ya en `GET`/`PUT /configuracion`, con
`bloqueo_terminal_segundos` validado a **30–3600** y mensajes en español; casts `bool`/`int` en el
modelo; 3 tests en `ConfiguracionTest`.

**Lección para el resto del bloque:** una migración aplicada no significa que el campo tenga
camino de ida y vuelta. Antes de dar por hecho un paso del §3, verifica que el Resource lo
devuelva y que el Form Request lo acepte.

### ✅ Guion de prueba manual (10 minutos)

Con *Bar De la Esquina* y **caja abierta**. Si algo de esto falla, es regresión, no ajuste.

1. **Nada cambia sin el modo.** Entra a cualquier otro establecimiento: el POS no pide PIN, la
   Configuración muestra el switch apagado y Usuarios **no** ofrece "PIN de mesero".
2. **Bloqueo.** Entra al POS → "Terminal bloqueada". Teclea `111111` → *PIN inválido.* y el
   teclado se limpia. Teclea `482913` → entra, y la cabecera muestra **Mesero 1**.
3. **Firma al abrir.** Crea una orden → el ticket dice **"Atiende: Mesero 1"**, aunque la sesión
   sea la del admin. Recárgala (F5 + PIN): debe seguir diciendo Mesero 1.
4. **Firma al cobrar.** Agrega un producto y cobra → antes de registrar el pago pide el PIN.
   Prueba a firmar con el **otro** mesero (`571462`): el pago queda a su nombre y la orden sigue
   siendo del primero. Es el diseño, no un bug.
5. **Auto-bloqueo.** Baja el bloqueo a 30 s en Configuración, entra al POS, desbloquea y espera:
   se bloquea sola y **las órdenes abiertas siguen detrás**. Devuélvelo a 120 s.
6. **Salida de emergencia.** Con la terminal bloqueada, "Cerrar sesión de la terminal" debe
   sacarte al login (si no, una tablet sin PIN a mano se queda muerta).
7. **Bloqueo manual.** Toca el nombre del mesero en la cabecera: vuelve a bloquear al instante.
8. **El reporte separa atender de cobrar.** Con la orden del punto 4 ya cobrada (abierta por
   Mesero 1, pagada firmando Mesero 2), entra a Reportes → *Ventas por mesero*: **Mesero 1** debe
   traer la mesa en "Órdenes atendidas"/"Monto atendido" con 0 cobros, y **Mesero 2** el mismo
   importe en "Monto cobrado" con 0 órdenes. En el ticket de esa venta debe decir
   **"Le atendió: Mesero 1"** — nunca el nombre de la cuenta de la tablet.

### 🔧 Qué puedes ajustar sin romper el diseño

- **Copys** de la pantalla de bloqueo y del paso de firma (`BloqueoTerminal.tsx`, `CobrarDialog.tsx`).
- **Tamaño de las teclas** (`TecladoPin.tsx`, hoy 64 px de alto) y el largo del PIN — este último
  **solo si también cambias `digits:6` en el backend**.
- **Rango del auto-bloqueo** (30–3600 s) en `ActualizarConfiguracionRequest` + `schemas.ts` del
  front. Los dos, o el formulario y el backend discrepan.
- **Dónde aparece "Atiende: X"**: sale de `features/ordenes/atribucion.ts`, un solo sitio.

**Lo que NO conviene tocar sin releer el §1:** que la actividad no renueve la sesión (§3.3), que
el cobro pida PIN siempre (decisión 2), y que la firma viaje como token y nunca como `id_mesero`.

### 🎯 Para cerrar el bloque

1. **Commitear** ambos repos: el 3.6 sigue en el working tree.
2. Repasar la **deuda abierta** del §6 y la del `ROADMAP.md` (tenant scope de la configuración,
   tema claro de los diálogos del POS, `revocar()` sin consumidor).
3. Pendiente menor de este bloque: **la exportación a PDF/Excel del reporte no se probó**. Es la
   que ejercita el orden de las claves de la fila; si se desalinea, las 5 columnas salen corridas
   en el Excel y la suite no lo vería.

---

## 1. Qué resuelve esto (para no perder el porqué)

El SaaS sirve a **dos modos de operación reales** y no debe tener dos ramas de lógica:

| Escenario | Cómo opera | Quién es "el mesero" |
|---|---|---|
| **Dispositivo por mesero** | cada quien entra con su cuenta | `id_usuario` — la cuenta **es** la persona |
| **Terminal compartida** | una tablet en la barra para varios | `id_mesero`, capturado por PIN |

**Regla única:** `mesero_efectivo = COALESCE(id_mesero, id_usuario)`.

El local con dispositivo por mesero **no configura nada** y no ve ninguna diferencia. Eso es un
criterio de aceptación, no un detalle: si al terminar el frontend un local sin el modo activo nota
algún cambio, está mal hecho.

### Decisiones de producto ya tomadas (no reabrir sin motivo)

1. **El PIN es firma de venta, NO login.** La tablet conserva su sesión; el mesero solo estampa su
   identidad. No emite token de sesión ni concede permisos.
2. **Sesión efímera + firma al cobrar.** Se teclea una vez y queda activo unos minutos; **siempre**
   se vuelve a pedir al cobrar, porque ahí se firma dinero.
3. **Auto-bloqueo por inactividad**, configurable por tenant (120 s por defecto).
4. **El PIN lo fija el admin**, no su dueño (al revés que el PIN de autorización de M14.1): en una
   barra compartida el mesero suele no tener credenciales propias.
5. **El PIN de mesero jamás autoriza.** Tabla y secreto separados del de autorización; el override
   lo rechaza (blindado por test).

---

## 2. Contrato de la API (verificado contra el código, 2026-08-15)

Todo va con el envelope estándar `{success, message, data}`; el cliente Axios **desenvuelve `data`**.

### Estado del modo — el POS pregunta si debe pedir PIN

```
GET /terminal/modo
→ data: { terminal_compartida: boolean, bloqueo_segundos: number }
```

Requiere sesión. Lo consumen el POS y la pantalla de Configuración.

### Identificación del mesero

```
POST /terminal/identificar   { pin: "482913" }     // 6 dígitos exactos
→ 200 data: { id, nombre, token, bloqueo_segundos }
→ 422 "PIN inválido."                              // no existe / no verifica / mesero inactivo
→ 422 "Este establecimiento no opera con terminal compartida."
→ 429 demasiados intentos (10 por minuto y por IP)
```

Exige permiso `ordenes.crear`. **`token` es la pieza clave**: es opaco, dura lo mismo que el
auto-bloqueo y es lo único que el backend acepta como firma.

### Crear orden y cobrar — se adjunta el token

```
POST /ordenes                { id_tipo_orden, id_mesa?, notas?, mesero_token? }
POST /ordenes/{id}/pagos     { id_tipo_pago, monto, referencia?, mesero_token? }
```

`mesero_token` es **opcional**. Si falta, está vencido o es inventado, la orden se crea **sin
firma** en vez de fallar: el mesero se equivocó de tiempo, no de venta.

> ⚠️ **Nunca mandes `id_mesero` desde el frontend.** El backend lo ignora por completo (hay un test
> que lo fija). Si viajara desde el cliente, cualquiera podría atribuirse ventas ajenas editando la
> petición y el reporte no significaría nada.

### Gestión del PIN (pantalla de Usuarios)

```
GET    /usuarios/{id}/mesero-pin  → data: { configurado: boolean, actualizado_at: string|null }
PUT    /usuarios/{id}/mesero-pin  { pin: "482913" }   → mismo shape
DELETE /usuarios/{id}/mesero-pin                      → { configurado: false, actualizado_at: null }
```

Requiere `usuarios.gestionar` y pasa por `UsuarioPolicy::update` (un gerente no puede fijarle PIN a
un admin). **El PIN nunca se devuelve**, ni a quien lo fijó: solo se puede reemplazar.
Errores: `422` PIN de 6 dígitos / trivial, `422` "PIN en uso" si otro del local ya lo tiene.

### Reporte

```
GET /reportes/ventas-por-mesero?preset=hoy|semana|mes|año
→ data: {
     reporte, titulo, rango,
     columnas: ["Mesero","Órdenes atendidas","Monto atendido","Cobros","Monto cobrado"],
     filas: [{mesero, ordenes, monto_atendido, cobros, monto_cobrado}],
     resumen: { meseros, operaciones, monto }
   }
```

**Solo admin/gerente** (`soloAdmin` en el backend): el operador recibe 403.

**Dos columnas, no una** (decisión del 2026-08-21). *Atendió* agrupa por el mesero efectivo de la
**orden**; *cobró*, por el del **pago**. Una mesa la puede abrir una persona y cerrarla otra, y
acreditarle la venta al que cobró le roba el número al que atendió. Las dos se calculan sobre
pagos cobrados, así que **cada columna totaliza lo mismo que el reporte de ventas**: son dos
repartos del mismo dinero y sumarlas entre sí lo duplicaría. `resumen.monto` es ese total único.

### Cambios en `OrdenResource`

Ahora expone `id_mesero`, **`id_mesero_efectivo`** (ya resuelto: no repitas el `COALESCE` en el
front) y `mesero: {id, nombre} | null` cuando la relación viene cargada.

---

## 3. Qué construir en el frontend, en orden

### 3.1 Configuración del tenant (M03) — HECHO (2026-08-19)
Tarjeta **"Terminal compartida"** en `ConfiguracionPage`: switch "Pedir PIN de mesero" + input de
segundos de auto-bloqueo, visible solo con el switch encendido. Tipos, esquema Zod (30–3600) y
payload extendidos; `ConfiguracionPage.test.tsx` nuevo (5 casos). Requirió antes el parche de
backend del §0.

**Bug preexistente que destapó:** el `<form>` no llevaba `noValidate`, así que la validación
nativa de los `min`/`max`/`step` de los inputs numéricos **abortaba el envío antes de React**, sin
mensaje propio. No era del campo nuevo: *tasa de impuesto* en 150 no guardaba **ni avisaba**, y
lo mismo un decimal en *stock mínimo global*. Una línea lo arregla para los tres y deja a Zod como
única autoridad local. Verificado en navegador. Si aparece otro formulario numérico en el
proyecto, revisa que tenga `noValidate`.

### 3.2 Gestión del PIN en Usuarios (M04) — HECHO (2026-08-19)
Acción "PIN de mesero" por fila → `MeseroPinDialog`: estado (configurado / sin configurar +
fecha), fijar con confirmación y retirar con `ConfirmDialog`. El PIN nunca se muestra. Feature
nueva `features/terminal/` (`useModoTerminal` sobre `GET /terminal/modo`, sin permiso, solo
sesión) porque **la acción solo aparece si el local opera con terminal compartida** — y porque
el POS la necesitará en 3.3–3.5. Esquema `meseroPinSchema` reutiliza `pinSchema`/`pinEsTrivial`
de Autorizaciones (misma regla, secreto distinto). Tests: `MeseroPinDialog.test.tsx` (7) +
`UsuariosPage.test.tsx` (3).

**⚠️ Bug de aislamiento de tenant en el backend, corregido aquí.** `ModoTerminalCompartida`
consultaba `ConfiguracionEstablecimiento::query()->value(...)` **sin filtrar por tenant**:
`ConfiguracionEstablecimiento` es la única tabla operativa que NO usa `BelongsToTenant`, así que
no hay TenantScope que la acote y la consulta devolvía la configuración de *otro*
establecimiento. En vivo: el tenant con el modo encendido recibía `terminal_compartida: false`.
Arreglado resolviendo por `TenantContext` (como ya hacía `ConfiguracionController`), con la fila
memorizada por petición. La suite no lo veía porque el helper del test hacía
`ConfiguracionEstablecimiento::query()->update(...)` sobre **toda** la tabla; ahora está acotado
al tenant y hay un test de dos establecimientos que falla con el código viejo.

**Deuda:** valorar mover `ConfiguracionEstablecimiento` a `BelongsToTenant` (fix de raíz).
Requiere revisar el alta de establecimientos, que crea la fila con el contexto de otro tenant.

**Trampa de React (costó un rato):** un `useEffect` que llamaba a `form.reset()`/`mutation.reset()`
para limpiar el diálogo al abrirlo entra en **bucle infinito de renders** — esos objetos cambian
de identidad en cada render y no se pueden poner como dependencias. La suite lo dio por bueno; el
navegador lo cantó con "Maximum update depth exceeded". Solución: el padre remonta el diálogo con
`key={usuario.id}`, sin efecto ninguno.

### 3.3 Estado del mesero activo en el POS — HECHO (2026-08-19)
`features/terminal/store.ts` (Zustand, **sin persistir**) + `tokenMeseroVigente()`.

**Corrección de diseño respecto al plan:** la actividad **NO renueva** la sesión. El token
caduca a los `bloqueo_segundos` de emitirse y el cliente no puede extenderlo; si el front
fingiera que sigue vivo, seguiría mandando un token vencido y las órdenes se crearían **sin
firma y sin avisar** (el backend las acepta así por diseño). La única renovación es volver a
teclear el PIN — que el cobro pide de todos modos. `tokenMeseroVigente()` comprueba el reloj
además del temporizador, porque una pestaña en segundo plano tiene los timers estrangulados.

### 3.4 Pantalla de desbloqueo + auto-bloqueo — HECHO (2026-08-19)
`BloqueoTerminal` + `TecladoPin` (teclas de 64 px, dígitos como puntos: quien teclea está de
cara al público) y `useAutoBloqueo`. Es una **capa encima** del POS, no un reemplazo: el árbol
sigue montado, así que las órdenes abiertas sobreviven al bloqueo (verificado en navegador).
El PIN se envía solo al sexto dígito, desde el manejador y **nunca desde un efecto**.

**Hueco que destapó la prueba en vivo:** la capa tapa la cabecera entera, así que una tablet
cuyo personal no recordara su PIN se quedaba muerta, sin poder ni cerrar sesión. Se añadió
"Cerrar sesión de la terminal" en la propia pantalla de bloqueo.

### 3.5 Firma al crear orden y al cobrar — HECHO (2026-08-19)
`useCrearOrden` adjunta `mesero_token` si hay uno vigente. El cobro tiene un **paso de firma**
propio (`FirmaCobro` dentro de `CobrarDialog`): se teclea el PIN, se pide un token nuevo con
`guardar: false` y ese token viaja con **ese** pago. Firmar un cobro no desbloquea la terminal
para quien teclea — la sesión sigue siendo de quien estaba operando.

Verificado en vivo: orden abierta por la cuenta de la tablet (*Rosendo Rubio*) con firma de
*Mesero 1*, y el pago de esa misma orden firmado por *Mesero 2*. En BD: `ordenes.id_mesero=53`,
`pagos.id_mesero=54`.

### 3.6 Reporte "Ventas por mesero" — HECHO (2026-08-21)
Resultó más que una entrada de catálogo: el reporte que existía solo respondía "quién cobró".

**Backend.** `VentasPorMeseroQuery` reescrito con `JOIN ordenes` y **dos agrupaciones** sobre el
mismo conjunto de pagos (ver el contrato en §2). "Órdenes atendidas" cuenta un **set** de
`id_orden`, no pagos: un pago dividido son dos cobros y **una** mesa. `MeseroEfectivo::entre()`
nuevo para aplicar la regla a columnas con alias del JOIN, de modo que el `COALESCE` sigue
viviendo en un solo lugar. Cinco tests nuevos, incluidos el escenario cruzado (A atiende, B cobra)
y la invariante de que ninguna columna duplica el total.

**Ticket.** `ContenidoTicket::cobro()` ahora emite `atendio`, y `GenerarTicketService` hace
`loadMissing(['mesero','usuario'])` — el `contenido_json` se **congela** al emitir, así que una
relación sin cargar deja el comprobante sin nombre para siempre. Con `id_mesero` presente pero la
relación ausente devuelve `null` en vez del nombre de la tablet (misma regla defensiva que
`atribucion.ts`). **Decisión: el papel del cliente lleva un solo nombre, el de quien atendió.**
Quién cobró es control interno —vive en el pago, la auditoría y el reporte— y en pago dividido
sería una lista de nombres en 58 mm.

**Frontend.** Una entrada en `features/reportes/constants.ts` (`money` incluye `monto` porque es
la clave del resumen), `atendio?: string | null` en `TicketContenido` —**opcional**, los tickets
anteriores al campo no lo traen— y la línea "Le atendió" en `TicketPreviewDialog`. `ReporteTabla`
no necesitó nada: es genérica y empareja `columnas[i]` con la i-ésima clave de la fila, por eso el
backend cuida el **orden de las claves** (el exportador a Excel las vuelca con `array_values`).

**De paso:** se borraron los 7 query keys nombrados de `qk.reportes` (`dashboard`, `ventas`, …).
Eran código muerto desde la Fase 10: `useReporte` arma la key con el slug del reporte.

**Hallazgo de la prueba en navegador: la pantalla de Reportes no estaba en el menú.** La ruta
`/app/reportes` existía desde la Fase 10 con su guard, pero **ningún ítem de `nav.ts` ni un solo
enlace de la app apuntaba a ella**: los 7 reportes y la exportación solo se alcanzaban tecleando
la URL. Corregido con una entrada en el grupo Negocio que espeja el guard
(`permiso: ["reportes.ver","reportes.ver_limitado"]`, `excluirSuperAdmin`). De paso arregló la
miga de pan, que decía "Administración · Inicio" estando en Reportes: `Topbar` deriva el título de
`navItems`, así que un ítem ausente también le rompe el rótulo.

**Lección:** un guard de ruta no prueba que la pantalla sea alcanzable. La suite tampoco: los
tests montan la pantalla directamente. Solo se ve navegando como el usuario.

### 3.7 "Atendió: X" con el mesero efectivo — HECHO (2026-08-19)
`features/ordenes/atribucion.ts`: `meseroDeOrden()` y `esOrdenDe()`. El filtro "Mis órdenes" del
POS usa la persona firmante, no la cuenta de la tablet.

**⚠️ Segundo bug de backend, corregido aquí.** `OrdenResource` expone `mesero` con
`whenLoaded`, y **solo `store` cargaba la relación**: `index`, `show`, `reasignar` y todas las
escrituras (`agregarItem`, `comanda`, `descuento`…) la omitían. En vivo: la orden se creaba
diciendo "Atiende: Mesero 1" y, al recargar o al cobrar, pasaba a decir el nombre de la tablet
— es decir, **atribuía la venta a quien no fue**. Corregido con `OrdenController::RELACIONES_ORDEN`
(una sola lista para todos los endpoints) + test `test_el_mesero_firmante_viaja_en_todas_las_lecturas_de_la_orden`.
El front además solo cae a `usuario` cuando `id_mesero` es nulo: si hay firma pero la relación
no vino, prefiere no decir nada a decir un nombre equivocado.

---

## 4. Criterios de aceptación

- [x] Un tenant **sin** el modo activo no ve ni un cambio: sin pantalla de PIN, sin bloqueo, y su
      atribución sigue siendo la cuenta.
- [x] Con el modo activo, cada orden y cada pago quedan atribuidos a la persona.
- [x] El PIN se vuelve a pedir **al cobrar**, siempre.
- [x] La tablet se bloquea sola tras `bloqueo_segundos` y las órdenes abiertas sobreviven.
- [x] El reporte por mesero cuadra en los dos escenarios, y **separa atender de cobrar**.
- [x] Ningún componente manda `id_mesero`; la firma viaja **solo** como `mesero_token`.
- [x] Verificado **en navegador**, tema oscuro, con dos meseros distintos en la misma tablet.
      *3.1–3.5 y 3.7 el 2026-08-19; el 3.6 el 2026-08-21.*

---

## 5. Trampas conocidas

- **Rebuild obligatorio del backend** antes de nada (§0). Es la causa número uno de "el endpoint
  no existe".
- **`pnpm test` muere en esta máquina** (Windows + OneDrive) con el pool `forks`, y desde el
  2026-08-20 `--pool=threads` tampoco basta: corrió 3 archivos de 18 y tiró 15 timeouts de worker.
  El que sí funciona es **`pnpm exec vitest run --no-file-parallelism`** (~4 min). Cuidado: el run
  parcial imprime "passed" al final y **parece verde** — hay que mirar el conteo de archivos.
- **Los tests no ven contraste ni densidad táctil.** En el bloque del `ErrorBoundary` la prueba en
  navegador destapó 3 defectos que la suite daba por buenos. El teclado de PIN es justo el tipo de
  UI donde eso vuelve a pasar.
- **429 al probar:** el rate limit son 10 intentos por minuto y por IP. Si tecleas PINs falsos
  probando, espera un minuto.
- **`POS_PIN_LOOKUP_KEY` debe estar configurada** (ya lo está para M14.1). Si rota, los PIN de
  mesero dejan de resolver igual que los de autorización.

---

## 6. Deudas abiertas de este bloque

- **Sin bitácora de intentos fallidos.** El override de M14.1 registra los suyos en
  `autorizacion_intentos`; el PIN de mesero solo tiene rate limit. Se decidió no crear otra tabla
  para un riesgo cuyo daño máximo es una atribución falsa. Revisar si aparece tanteo real.
- **`revocar()` de `SesionMeseroTerminal` sigue sin consumidor.** El frontend ya tiene "bloquear
  ahora" (tocar el nombre del mesero en la cabecera), pero es **solo de cliente**: olvida el token
  en memoria sin invalidarlo en el backend. Basta para el caso real —nadie puede reusarlo, porque
  no sale del navegador— pero deja el método muerto. Decidir: borrarlo, o llamarlo desde el
  bloqueo manual si algún día el token se comparte entre pestañas.
- **Tema claro en los diálogos del POS.** Radix los monta en un portal fuera del
  `data-mode="dark"`, así que Nueva orden, Cobrar y el teclado de firma salen en claro sobre el
  POS oscuro. Es preexistente y de todo el POS; el teclado de PIN solo lo hizo evidente.
- **`ConfiguracionEstablecimiento` no usa `BelongsToTenant`.** Es la única tabla operativa sin
  TenantScope, y ya causó un bug de aislamiento (§0/§3.2). Cada consulta nueva sobre esa tabla
  tiene que acordarse de filtrar a mano. Arreglo de raíz pendiente de evaluar: toca el alta de
  establecimientos, que crea la fila con el contexto de otro tenant.
- **El reporte no se puede filtrar por mesero concreto** (solo agrupa). Si alguien lo pide, es un
  parámetro más en la query.
- **Homónimos en el reporte.** Las filas se agrupan por id de persona pero se muestran por
  nombre: dos "Juan" en el mismo tenant salen como dos renglones idénticos a la vista. Se
  resuelve el día que la fila lleve también el usuario.
- **La comanda no dice quién atendió.** El ticket de cobro sí (§3.6); en cocina/barra sería igual
  de útil y es una línea en `ContenidoTicket::comanda()`. No se hizo por no ampliar el alcance.
- **`docs/DER_bar_final_v1_2.drawio` sigue en V1.2**: el diagrama visual no incluye `mesero_pins`
  ni los campos nuevos. Hay que editarlo a mano en draw.io.
