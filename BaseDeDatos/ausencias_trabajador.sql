-- 1. Necesario para que el EXCLUDE funcione con un entero (id_trabajador)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Tabla de ausencias
CREATE TABLE IF NOT EXISTS public.ausencias_trabajador (
    id_ausencia integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajador integer NOT NULL REFERENCES public.perfiles_trabajador(id_usuario) ON DELETE CASCADE,
    fecha_inicio timestamp without time zone NOT NULL,
    fecha_fin timestamp without time zone NOT NULL,
    motivo character varying(300),
    estado character varying(20) NOT NULL DEFAULT 'activa',
    fecha_registro timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ausencias_fechas_check CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT ausencias_estado_check CHECK (estado IN ('activa','cancelada')),
    CONSTRAINT ex_ausencia_sin_traslape EXCLUDE USING gist (
        id_trabajador WITH =,
        tsrange(fecha_inicio, fecha_fin) WITH &&
    ) WHERE (estado = 'activa')
);