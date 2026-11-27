INSERT INTO parametros_sistema
(clave, valor, descripcion)
VALUES
('incidentes_periodo_dias', '90', 'Periodo de evaluación de incidentes'),
('puntos_atraso', '1', 'Puntaje por atraso'),
('puntos_cancelacion', '2', 'Puntaje por cancelación'),
('puntos_reclamo', '3', 'Puntaje por reclamo sancionado'),
('umbral_clasificacion_moderada', '3', 'Puntaje mínimo para clasificación moderada'),
('umbral_clasificacion_grave', '5', 'Puntaje mínimo para clasificación grave'),
('umbral_reincidencia', '2', 'Cantidad mínima de incidentes para reincidencia')
ON CONFLICT (clave) DO NOTHING;