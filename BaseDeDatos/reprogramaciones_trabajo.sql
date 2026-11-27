
CREATE TABLE IF NOT EXISTS public.reprogramaciones_trabajo (
    id_reprogramacion integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo integer NOT NULL REFERENCES public.trabajos(id_trabajo) ON DELETE RESTRICT,
    id_solicitante integer NOT NULL REFERENCES public.usuarios(id_usuario),
    fecha_inicio_anterior timestamp without time zone,
    fecha_fin_anterior timestamp without time zone,
    fecha_inicio_propuesta timestamp without time zone NOT NULL,
    fecha_fin_propuesta timestamp without time zone NOT NULL,
    motivo character varying(500) NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    id_respondido_por integer REFERENCES public.usuarios(id_usuario),
    motivo_rechazo character varying(300),
    fecha_solicitud timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_respuesta timestamp without time zone,
    CONSTRAINT reprogramaciones_trabajo_fechas_check CHECK (fecha_fin_propuesta > fecha_inicio_propuesta),
    CONSTRAINT reprogramaciones_trabajo_estado_check CHECK (
        (estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aceptada'::character varying, 'rechazada'::character varying])::text[])
    )
);

-- Solo puede existir una propuesta de reprogramación pendiente a la vez por trabajo
CREATE UNIQUE INDEX IF NOT EXISTS uq_una_reprogramacion_pendiente_por_trabajo
    ON public.reprogramaciones_trabajo USING btree (id_trabajo)
    WHERE ((estado)::text = 'pendiente'::text);