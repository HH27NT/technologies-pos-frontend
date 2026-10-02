/**
 * Los 4 permisos sensibles que hacen a un usuario AUTORIZADOR (M14.1). Espejo de
 * `TipoAutorizacion::permisosAutorizador()` en el backend: solo quien pueda autorizar
 * algo puede fijar un PIN; a nadie más le serviría (`PUT /mi-pin` responde 403).
 *
 * Gatean la ruta y el ítem de nav de "PIN de autorización", ambos con
 * `excluirSuperAdmin`: el PIN cuelga de la membresía con un establecimiento y el super
 * admin no pertenece a ninguno, así que el backend le responde 403 en `/mi-pin` aunque
 * su Gate::before lo haga pasar cualquier permiso.
 */
export const PERMISOS_AUTORIZADOR = [
  "ordenes.cancelar_item",
  "ordenes.anular",
  "inventario.entrada",
  "inventario.ajustar",
];
