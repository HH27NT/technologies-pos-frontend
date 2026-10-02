# Handoff — El recetario: acomodo, cantidades y lo que no se puede medir

> **Escrito:** 2026-09-10, tras el paso por navegador de septiembre.
> **Estado:** las fases 1 y 2 (§7) **están hechas** el 2026-09-10 — la lista por producto y las
> cantidades sin ceros de relleno. Lo que sigue abierto es la **fase 3, el rendimiento**:
> investigación terminada y **decisión pendiente**.
> Nace de tres observaciones del usuario sobre la pantalla de Recetas.

---

## 0. Las tres preguntas

1. **La lista se lee mal.** "Michelada con corona" lleva dos insumos y el segundo aparece
   como una fila con la columna Producto vacía: parece un renglón huérfano, no el segundo
   ingrediente de una receta. Verificado en navegador el 2026-09-10.
2. **Las cantidades salen en decimales.** La lista pinta `1.000` donde el usuario escribió
   `1`. "Siento que al usuario no le agradaría."
3. **Lo que no se puede medir.** El chamoy de una michelada no se mide en gramos, pero el
   dueño sí sabe que **un bote alcanza para unas 30 micheladas**. ¿Puede el sistema
   descontar con ese dato y avisar que el kilo de limones se acabó a las 20 micheladas?

La tercera es la importante: es lo que un administrador va a mirar antes de decidir si el
sistema le sirve.

---

## 0.1 Al 2026-09-11 — **empieza aquí**

**Todo lo de septiembre está commiteado y en `origin/main`.** No hay nada a medias en el árbol.

| Repo | Último commit |
|---|---|
| `bar-pos-web` | `bd03375` — fuera "Nueva receta", aviso de nombre repetido |
| `bar-pos-saas-api` | `b5d3913` — `?con_recetas=1` y `?sin_receta=1` en el índice de productos |

**Verde al cerrar:** frontend `lint` (0 errores, los 2 warnings viejos de `MovimientoDialog`),
`tsc`, `build` y **231 tests**; backend **8 tests nuevos** verdes en SQLite y en PostgreSQL, más
los 99 de Catálogo e Inventario, y Pint limpio. Todo pasó por navegador.

**Lo primero, en orden:**

1. **El paso 0 está hecho** (2026-09-12, sin commitear): un costo que nadie capturó ya no vale
   cero en el reporte de margen, en el KPI del dashboard ni en el armador. Sigue el **paso 1**:
   la tercera clase de insumo en el backend (`insumos.tipo = 'rendimiento'` más `envase_nombre`,
   `envase_rinde` y `envase_costo`, con `costo_unitario` derivado). El plan con los archivos que
   toca, en §7; el porqué, en [`DECISIONES.md`](./DECISIONES.md) §8.
2. **Prerrequisito de siempre:** `docker compose --env-file .env.docker up -d --build` en
   `bar-pos-saas-api` si se toca PHP, y `pnpm dev`.
3. Lo chico que sigue suelto y ya tiene dueño dentro del plan: **rotura y consumo interno** en el
   `MovimientoDialog` (§9 punto 3 → paso 5), **`formatCantidad`** en el kardex y en insumos
   (fase 2 a medio aplicar → paso 4) y **el defecto del armador**, que no cierra la lista de
   coincidencias al salir del campo y tapa los renglones (→ paso 3).

**Deuda que sigue anotada, no perdida:**
- ~~El KPI de margen dice "100.0% de utilidad"…~~ **Resuelto el 2026-09-12** (paso 0). Lo que
  queda de esa deuda es capturar los costos: hoy **12 de 12** productos vendidos no tienen ninguno,
  así que el margen del periodo no se puede calcular — ahora se ve, que era el punto.
- `POST /productos/lote` devuelve `disponible: null` y el índice devuelve `true` para esos
  mismos productos.
- **Variantes de producto** (`DECISIONES.md` §7): la causa de fondo de los nombres repetidos.
  Decisión pendiente, sin evidencia todavía de que un cliente la pida.

---

## 1. Cómo lo resuelven los sistemas ya implementados

**Un ingrediente vive en tres unidades, no en una.** Es el modelo que repiten Toast,
Restaurant365, COGS-Well y Supy: la **unidad de compra** (caja, bote, garrafa), la
**unidad de conteo** (lo que se cuenta en el anaquel) y la **unidad de receta** (lo que
consume un platillo). Entre ellas hay factores de conversión declarados una sola vez por
insumo. El ejemplo canónico: pechuga que llega en caja de 5 kg a $32.50, se cuenta en
kilos y la receta la baja en porciones de 180 g.

**El rendimiento es un factor explícito.** La merma de preparación no se adivina: se
declara como porcentaje y se convierte en factor con `100 ÷ rendimiento %`. 10 kg de res
para un ragú rinden 6.8 kg al 68%, y la receta que ignora esa pérdida **subestima el costo
de la porción en cerca de un tercio** ($1.80 contra $2.65 reales).

**Las guarniciones no se ignoran: se estandarizan.** La recomendación de WISK para barras
de coctelería es tratar la guarnición como cualquier otro insumo, medirla en unidades
propias del oficio — rueda, tira de cáscara, ramita — y darle un costo por uso. No se pesa
el limón: se cuenta en ruedas.

**El descuento por venta nunca es la verdad, es la hipótesis.** El ciclo profesional es
*consumo teórico* (lo que las recetas dicen que debió salir) contra *consumo real* (el
conteo físico), y lo que se administra es la **desviación** entre ambos. Diageo Bar
Academy recomienda fijar un límite de desviación aceptable y contar seguido.

**De qué se queja la gente.** No de que el sistema pida demasiado detalle, sino de que las
conversiones mal hechas envenenan los números en silencio: una conversión 1:1 estática
hace que 40 kg de consumo real se reporten como 8 unidades — **80% de subestimación** — y
el operador persigue desviaciones que no existen. Un número inventado es peor que una
casilla vacía.

---

## 2. Qué tenemos hoy (verificado en el esquema, no en la doc)

| Pieza | Realidad |
|---|---|
| `insumos` | **una sola** `id_unidad_medida`. Compra = conteo = receta, sin conversión posible |
| `unidades_medida` | `nombre` + `abreviacion`. Es una **etiqueta**, no tiene factor |
| `recetas_producto.cantidad` | `decimal(10,3)` — de ahí sale el `1.000` de la pantalla |
| `insumos.tipo` | `controlado` (descuenta por receta) / `consumo` (nunca descuenta) |

O sea: no hay motor de unidades, y el chamoy hoy solo tiene dos salidas — inventar
`0.033` botes por michelada (precisión falsa, rechazada en `DECISIONES.md` §4) o no
descontar nada.

---

## 3. Lo que propone el usuario, traducido

"Un bote de chamoy alcanza para 30 micheladas" **es** una conversión: `1 bote = 30
porciones`. No es un gramaje inventado; es un dato que el dueño sí conoce y puede
declarar. Eso abre una tercera vía entre el control exacto y no controlar nada.

La forma limpia de aprovecharla es **llevar el stock en la unidad que se consume, no en la
que se compra**: el bote entra como 30 porciones y cada michelada descuenta 1. Todo entero,
sin decimales en ninguna pantalla, y el sistema puede decir "quedan 7 porciones de chamoy"
o "el kilo de limones alcanza para 4 micheladas más".

**El precio de esa vía:** el stock deja de ser un número medido y pasa a ser un **estimado**.
Eso obliga a que la UI lo diga en todos lados donde aparezca — el reporte de inventario, la
alerta de stock bajo, el margen — y a que el conteo físico siga siendo la fuente de verdad.
Es la regla del cero con confianza aplicada al inventario: un estimado presentado como
medición es peor que no tenerlo.

---

## 4. Riesgos

- **Falsa precisión contagiosa.** Si "quedan 7 porciones" se pinta igual que el stock de
  cervezas, el operador va a creerle lo mismo a los dos. Hay que separarlos visualmente y
  en el reporte.
- **El rendimiento se mueve.** El bartender de hoy sirve más chamoy que el de ayer. Sin un
  conteo que corrija, la deriva crece sin avisar. El rendimiento debe ser **editable** y el
  ajuste por conteo, fácil.
- **Mezclar unidades en el mismo reporte.** Sumar costos de insumos controlados con
  estimados produce un costo de receta que parece exacto y no lo es.
- **Alcance.** Tocar la unidad del stock alcanza a movimientos de inventario, kardex,
  entradas de compra, el reporte de margen y la pantalla de insumos. No es un campo nuevo:
  es un bloque.
- **Sobre-ingeniería.** Un motor de conversiones completo (compra/conteo/receta con tabla de
  factores) es lo que usan cadenas con almacén central. Para una cantina es andamiaje para
  un caso que todavía no existe.

---

## 5. Alternativas consideradas

| | Qué es | Por qué no (o sí) |
|---|---|---|
| **A. Dejarlo como está** | el de consumo nunca descuenta | No cubre lo que el administrador va a pedir: saber cuándo se acaba el chamoy |
| **B. Gramajes reales** | pedir 4 g de tamarindo | Ya se rechazó en `DECISIONES.md` §4, y por buenas razones |
| **C. Motor de 3 unidades + factores** | el modelo de Toast/R365 completo | Correcto y estándar, pero es el andamiaje de una cadena; y obliga a capturar 3 unidades por insumo en el alta, justo lo contrario de la fluidez que venimos ganando |
| **D. Rendimiento declarado (1 envase = N porciones)** | una conversión de una línea, en el lenguaje del dueño | **Recomendada.** Da el 90% del valor de C con un campo y una regla, y se puede subir a C después sin tirar nada |

---

## 6. Recomendación

**Tres clases de insumo en lugar de dos**, sobre el `tipo` que ya existe:

1. **Controlado** — se mide de verdad (una lata, una botella). Descuenta exacto. Igual que hoy.
2. **Por rendimiento** *(nuevo)* — no se mide, pero se sabe cuánto rinde el envase. Se captura
   "1 bote rinde ~30", la receta pide porciones enteras, el stock se lleva en porciones y
   **todo lo que se derive de él se marca como aproximado**.
3. **De consumo** — ni eso (sal, hielo, servilletas). No descuenta nunca. Igual que hoy.

**El matiz que hace que la vía aguante (decidido el 2026-09-11):** el rendimiento declara la
**unidad**, y la receta declara **cuántas**. El renglón conserva su `cantidad`, así que la
michelada normal pide 1 porción y la grande 2, con un solo número por insumo. De ahí la regla de
captura: el rendimiento se declara contra la **dosis más chica** que se sirve; si una receta
necesita media porción, la porción se declaró demasiado grande y se vuelve a declarar más chica
("60 medias"). Y la unidad se nombra en el oficio —porción, chorrito, rueda, tira—, que es la
recomendación de WISK para guarniciones.

Esto no contradice `DECISIONES.md` §4, la extiende: se sigue sin inventar gramos; se le pide
al dueño el único número que él sí tiene, y el resultado se presenta como lo que es.

Y dos arreglos independientes que no esperan a esta decisión:

- **La lista por producto** (ya decidida en `HANDOFF-fluidez-altas.md` §0, punto 3): una fila
  por producto con sus insumos anidados, que es lo que arregla el renglón huérfano de la
  michelada.
- **Cantidades sin ceros de relleno**: `1` en vez de `1.000`, `0.5` en vez de `0.500`. Es
  formateo de presentación; el `decimal(10,3)` del esquema no cambia.

---

## 7. Plan de implementación (fases, en orden)

**Fase 1 — La lista se lee como receta. ✅ hecha el 2026-09-10.** Salió distinta de lo
planeado: en vez de indexar recetas por `id_producto` en el cliente, el producto **trae su
receta** (`GET /productos?con_recetas=1`). Indexar en el cliente obligaba a traerse `/recetas`
—paginado por renglón— y cualquier tope habría vuelto a mentir con "sin receta" en catálogos
grandes. Incluye el filtro `?sin_receta=1` y su conteo, que es el cierre "N productos sin receta".

**Fase 2 — Cantidades legibles. ✅ hecha el 2026-09-10.** `formatCantidad` en `lib/format`, ya
aplicado en la lista de recetas. **Falta pasarlo al kardex y a la pantalla de insumos**, donde el
`stock_actual` sigue saliendo con tres decimales.

**Fase 3 — Rendimiento (el bloque grande). Decidida el 2026-09-11; el porqué está en
[`DECISIONES.md`](./DECISIONES.md) §8.** Los pasos, en orden, con lo que toca cada uno:

**Paso 0 — un costo que falta deja de valer cero. ✅ hecho el 2026-09-12.** Va *antes* que el rendimiento, si no se
reparte mejor un número falso. `MargenQuery::costoUnitario()` hace `(float) $insumo->costo_unitario`
sobre una columna **nullable**, así que "no capturado" y "cero" son indistinguibles, y de ahí sale
el "100.0% de utilidad". El reporte pasa a marcar la fila (`costo_incompleto`) cuando algún insumo
de la receta —o el `costo_referencia` del producto sin control— viene nulo, y el resumen dice
cuántos productos están así. En el front, el KPI de margen y el "Costo estimado $0.00" del armador
dejan de pintar cifra y dicen **sin costo capturado**, con el camino a los insumos que faltan.

*Cómo quedó:* el costo del producto es `null` cuando no se puede calcular (sin `costo_referencia`,
sin receta, o con algún insumo sin costo) y el resumen añade `productos_sin_costo`; si no se conoce
**ninguno**, `costo` y `margen` del resumen también son nulos —si no, el margen del periodo era el
ingreso entero, que fue lo que destapó el navegador—. `margen_pct` se anula en cuanto falta un solo
costo. Las gráficas dejaron de convertir `null` en una barra de cero. Detalle en
[`CHANGELOG-FASES.md`](./CHANGELOG-FASES.md) (2026-09-12).

**Paso 1 — Backend: la tercera clase.** `insumos.tipo` ya es `string(20)` con default, así que
admitir un valor más no exige alterar ningún enum de PostgreSQL (fue a propósito). Entra
`rendimiento` y con él, en `insumos`:

| Campo | Qué es |
|---|---|
| `envase_nombre` `string(40)` | cómo se compra: "bote", "garrafa", "caja" |
| `envase_rinde` `int` | cuántas porciones rinde **un** envase: 30 |
| `envase_costo` `decimal(12,2)` | lo que cuesta el envase: $60 — es el número que el dueño sí conoce |

`id_unidad_medida` pasa a ser **la unidad de la porción**, nombrada en el oficio (porción,
chorrito, rueda). Como `unidades_medida` es una etiqueta sin factor, no hace falta motor de
conversión: el stock ya se lleva en la unidad que se consume.

`costo_unitario` **se deriva** (`envase_costo ÷ envase_rinde`) en `GuardarInsumoService`, no se
captura. *Por qué derivado y no capturado al vuelo en el formulario:* si solo se guardara el
resultado, editar el rendimiento de 30 a 25 dejaría el costo por porción viejo y **callado**.

Validación en `GuardarInsumoRequest`: `Rule::in([...,'rendimiento'])` y los tres campos
`required_if:tipo,rendimiento`, con `envase_rinde` `integer|min:1`. En
`ReemplazarRecetaRequest` y `GuardarRecetaRequest`, el `->where('tipo', 'controlado')` que hoy
excluye al insumo de consumo pasa a `->whereIn('tipo', ['controlado', 'rendimiento'])`, y la
`cantidad` del renglón se exige **entera** cuando el insumo es de rendimiento (la regla de la
dosis más chica de §8). `InsumoResource` expone los campos nuevos más un derivado `es_estimado`
para que la UI no tenga que saber la regla.

**`DescontarInventarioService` no se toca**, y eso es la señal de que el modelo es el correcto:
ya descuenta `receta.cantidad × renglón.cantidad` sobre el stock, y el stock ya está en porciones.

**Paso 2 — La compra entra en porciones, a la vista.** El `MovimientoDialog` de una entrada de
insumo por rendimiento pregunta en envases ("¿cuántos botes?") y **enseña la cuenta** antes de
guardar: "1 bote = 30 porciones". Al ledger viaja el resultado, en porciones. La conversión **no**
se esconde en el servicio: el ledger se queda con una sola unidad y la multiplicación se ve, que
es justo lo contrario del fallo de §1 —la conversión silenciosa que envenena los números—.

**Paso 3 — Armador de recetas.** Los de rendimiento se ofrecen (hoy el backend los rechazaría),
la cantidad se pide entera y se pinta con su unidad ("2 porciones"), y el costo de esa línea sale
marcado como aproximado. Se aprovecha para cerrar el defecto abierto: la lista de coincidencias
de insumos no se cierra al salir del campo y tapa los renglones.

**Paso 4 — El estimado se ve distinto del medido.** `InsumosPage` ya pinta una insignia para el
insumo de consumo: el de rendimiento lleva la suya y el stock se muestra con el signo de
aproximado. Va junto con lo que quedó de la fase 2 — `formatCantidad` en la columna de stock, en
el mínimo y en el `KardexDialog`, donde todavía salen tres decimales—. Alcanza también a la alerta
de stock bajo y al reporte de inventario, que no deben sumar estimado con medido en la misma cifra
sin decirlo.

**Paso 5 — Conteo físico.** Se teclea lo que hay, el sistema calcula la diferencia contra el stock
y registra el ajuste (al alza) o la merma (a la baja) con su motivo, en un gesto. No estrena nada
en el ledger: reusa `RegistrarMovimientoService` y los tipos que ya existen. Es lo que sostiene
todo lo anterior — sin conteo, el estimado deriva sin freno—. Aquí entra también el punto 3 de §9:
el `MovimientoDialog` ofrece 3 de los 5 tipos manuales, y **rotura** y **consumo interno** ya los
acepta el backend.

**Paso 6 — Margen con el costo partido.** `MargenQuery` devuelve `costo_medido` y `costo_estimado`
por fila y en el resumen; la UI lo dice en la fila y al pie. Depende del paso 0: sin él, partir el
costo solo ordena mejor un número que sigue siendo falso.

**Fase 4 — Desviación.** "Teórico contra real" por insumo y periodo. Es lo que convierte el
inventario en una herramienta de administración y no en una lista. Depende de la Fase 3.

---

## 8. Las dos preguntas de la Fase 3 — **respondidas el 2026-09-11**

**1. ¿El rendimiento se declara por envase comprado o por producto vendido?**
→ **Por envase comprado.** Es lo que el usuario dijo desde el principio, y además la otra forma
no produce un número usable: "una michelada lleva un chorrito" solo se opera traduciendo el
chorrito a gramos, que es la precisión inventada que ya se rechazó. Con el matiz que salió al
discutirlo: **el rendimiento declara la unidad y la receta declara cuántas** —la michelada grande
pide 2 porciones—, y el rendimiento se declara contra la **dosis más chica** que se sirve, para
que ninguna receta necesite media porción.

**2. ¿El costo estimado entra al reporte de margen?**
→ **Entra, pero separado**: `MargenQuery` parte el costo en medido y estimado, y la UI lo dice.
Dejarlo fuera no era la opción neutral — es la de hoy, y produce un margen inflado que se
presenta como exacto—. Con un requisito previo: mientras un `costo_unitario` nulo valga $0.00 en
silencio, las dos opciones dan "100.0% de utilidad". Por eso el **paso 0** de la fase 3.

El detalle y lo que se rechazó, en [`DECISIONES.md`](./DECISIONES.md) §8. Las fuentes con su
enlace están en [`REFERENCIAS.md`](./REFERENCIAS.md).

---

## 9. Mermas y control de lo que se usa de verdad (verificado el 2026-09-11)

Lo pidió el usuario junto con el rendimiento: *"control más específico de qué se utiliza y
mermas del negocio"*. Buena parte ya existe y conviene no reconstruirla.

**Lo que ya está (y funciona):**

| Pieza | Dónde |
|---|---|
| Tipos del ledger con su signo en **una sola** fuente | `TipoMovimiento` (backend): entrada y ajuste suman; merma, rotura, consumo interno, venta y salida restan |
| **Motivo escrito obligatorio** en merma, rotura, ajuste y consumo interno | `TipoMovimiento::requiereMotivo()` |
| `ajuste` solo corrige **al alza**: bajar por conteo se registra como merma, que sí deja rastro de pérdida | comentario de `TipoMovimiento` |
| Permiso propio `inventario.merma`, directo del operador (no pasa por autorización) | `CatalogoPermisos` / `MovimientoDialog` |
| Reporte de inventario con `mermas` y `cantidad_mermada` del periodo | `InventarioQuery` → lo pinta `ReporteResumen` |
| Kardex por insumo | pantalla de insumos |

**Lo que falta, en orden de valor:**

1. **La desviación, que es el punto.** Hoy se puede ver *lo registrado* (ventas, mermas
   capturadas), pero no lo que **no** se explica: teórico (lo que las recetas dicen que debió
   salir) contra real (conteo físico). Esa resta es la que destapa el sobreservido, el regalo y
   el robo, y es la fase 4 de §7. Sin ella, las mermas capturadas son una lista, no un control.
2. **Conteo físico como flujo propio.** Hoy cuadrar exige capturar movimiento por movimiento.
   Lo que hace falta es una pantalla de conteo: se teclea lo que hay, el sistema calcula la
   diferencia contra el stock y registra el ajuste o la merma con su motivo, en un gesto.
3. **El frontend ofrece 3 de los 5 tipos manuales.** `MovimientoDialog` limita a
   `entrada / ajuste / merma`; el backend acepta también **rotura** y **consumo_interno** (la
   cerveza que se regala al personal, la que se abre para el cliente que se queja). Sin
   separarlos, todo cae en "merma" y el reporte no distingue el vidrio roto de la cortesía —
   que son problemas distintos con dueños distintos.
4. **Merma en unidades que la barra entiende.** Ligado a la fase 3: si el insumo se lleva en
   porciones, la merma se captura en porciones y no en fracciones de botella.

**Una trampa ya documentada:** el KPI de margen dice "100.0% de utilidad" cuando los insumos no
tienen costo capturado. Con mermas valorizadas pasaría lo mismo: una merma sin costo se vería
como pérdida de $0.00. Antes de poner cifras de dinero a la merma hay que resolver el costo
faltante, o rotularlo.
