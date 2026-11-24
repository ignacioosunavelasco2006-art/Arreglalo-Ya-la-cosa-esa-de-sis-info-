--
-- PostgreSQL database dump
--

\restrict hIUCO29XOZ7JrNn0NWKeJTC67zra6kayMf23bet18yAD5qLejQkteds1F2WZZpU

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-11-24 10:45:16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 42285)
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- TOC entry 5768 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 279 (class 1259 OID 43782)
-- Name: bitacora_auditoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bitacora_auditoria (
    id_bitacora bigint NOT NULL,
    id_usuario integer,
    accion character varying(60) NOT NULL,
    entidad character varying(60),
    id_entidad integer,
    detalle character varying(500),
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.bitacora_auditoria OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 43781)
-- Name: bitacora_auditoria_id_bitacora_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.bitacora_auditoria ALTER COLUMN id_bitacora ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bitacora_auditoria_id_bitacora_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 260 (class 1259 OID 43526)
-- Name: calificaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calificaciones (
    id_calificacion integer NOT NULL,
    id_trabajo integer NOT NULL,
    id_cliente integer NOT NULL,
    id_trabajador integer NOT NULL,
    puntaje smallint NOT NULL,
    comentario character varying(500),
    respuesta_trabajador character varying(500),
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT calificaciones_puntaje_check CHECK (((puntaje >= 1) AND (puntaje <= 5)))
);


ALTER TABLE public.calificaciones OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 43549)
-- Name: calificaciones_historial; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calificaciones_historial (
    id_historial integer NOT NULL,
    id_calificacion integer NOT NULL,
    puntaje_anterior smallint NOT NULL,
    puntaje_nuevo smallint NOT NULL,
    fecha_cambio timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT calificaciones_historial_puntaje_anterior_check CHECK (((puntaje_anterior >= 1) AND (puntaje_anterior <= 5))),
    CONSTRAINT calificaciones_historial_puntaje_nuevo_check CHECK (((puntaje_nuevo >= 1) AND (puntaje_nuevo <= 5)))
);


ALTER TABLE public.calificaciones_historial OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 43548)
-- Name: calificaciones_historial_id_historial_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.calificaciones_historial ALTER COLUMN id_historial ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.calificaciones_historial_id_historial_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 259 (class 1259 OID 43525)
-- Name: calificaciones_id_calificacion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.calificaciones ALTER COLUMN id_calificacion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.calificaciones_id_calificacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 264 (class 1259 OID 43568)
-- Name: calificaciones_internas_cliente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calificaciones_internas_cliente (
    id_calificacion_int integer NOT NULL,
    id_trabajo integer NOT NULL,
    id_trabajador integer NOT NULL,
    id_cliente integer NOT NULL,
    puntaje smallint NOT NULL,
    nota character varying(500),
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT calificaciones_internas_cliente_puntaje_check CHECK (((puntaje >= 1) AND (puntaje <= 5)))
);


ALTER TABLE public.calificaciones_internas_cliente OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 43567)
-- Name: calificaciones_internas_cliente_id_calificacion_int_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.calificaciones_internas_cliente ALTER COLUMN id_calificacion_int ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.calificaciones_internas_cliente_id_calificacion_int_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 258 (class 1259 OID 43500)
-- Name: cancelaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cancelaciones (
    id_cancelacion integer NOT NULL,
    id_trabajo integer NOT NULL,
    id_usuario integer NOT NULL,
    cancelado_por character varying(20) NOT NULL,
    motivo character varying(300),
    estado character varying(20) DEFAULT 'aprobada'::character varying NOT NULL,
    fecha_solicitud timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT cancelaciones_cancelado_por_check CHECK (((cancelado_por)::text = ANY ((ARRAY['cliente'::character varying, 'trabajador'::character varying])::text[]))),
    CONSTRAINT cancelaciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['aprobada'::character varying, 'rechazada'::character varying])::text[])))
);


ALTER TABLE public.cancelaciones OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 43499)
-- Name: cancelaciones_id_cancelacion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.cancelaciones ALTER COLUMN id_cancelacion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cancelaciones_id_cancelacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 226 (class 1259 OID 43080)
-- Name: categorias_servicio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias_servicio (
    id_categoria integer NOT NULL,
    nombre character varying(60) NOT NULL,
    activa boolean DEFAULT true NOT NULL
);


ALTER TABLE public.categorias_servicio OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 43079)
-- Name: categorias_servicio_id_categoria_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.categorias_servicio ALTER COLUMN id_categoria ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.categorias_servicio_id_categoria_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 281 (class 1259 OID 50477)
-- Name: datos_bancarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.datos_bancarios (
    id_dato integer NOT NULL,
    id_usuario integer NOT NULL,
    banco character varying(80) NOT NULL,
    titular character varying(150) NOT NULL,
    numero_cuenta character varying(255) NOT NULL,
    ultimos_digitos character varying(4) NOT NULL,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.datos_bancarios OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 50476)
-- Name: datos_bancarios_id_dato_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.datos_bancarios_id_dato_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.datos_bancarios_id_dato_seq OWNER TO postgres;

--
-- TOC entry 5769 (class 0 OID 0)
-- Dependencies: 280
-- Name: datos_bancarios_id_dato_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.datos_bancarios_id_dato_seq OWNED BY public.datos_bancarios.id_dato;


--
-- TOC entry 270 (class 1259 OID 43639)
-- Name: devoluciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devoluciones (
    id_devolucion integer NOT NULL,
    id_trabajo integer NOT NULL,
    id_cliente integer NOT NULL,
    id_reclamo integer,
    monto numeric(10,2) NOT NULL,
    motivo character varying(500) NOT NULL,
    estado character varying(20) DEFAULT 'solicitada'::character varying NOT NULL,
    fecha_solicitud timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_aprobado_por integer,
    fecha_aprobacion timestamp without time zone,
    motivo_rechazo character varying(300),
    id_pago integer,
    fecha_procesamiento timestamp without time zone,
    CONSTRAINT devoluciones_check CHECK ((((estado)::text <> ALL ((ARRAY['aprobada'::character varying, 'procesada'::character varying, 'fallida'::character varying])::text[])) OR ((id_aprobado_por IS NOT NULL) AND (fecha_aprobacion IS NOT NULL)))),
    CONSTRAINT devoluciones_check1 CHECK ((((estado)::text <> 'rechazada'::text) OR ((id_aprobado_por IS NOT NULL) AND (motivo_rechazo IS NOT NULL)))),
    CONSTRAINT devoluciones_check2 CHECK ((((estado)::text <> 'procesada'::text) OR ((id_pago IS NOT NULL) AND (fecha_procesamiento IS NOT NULL)))),
    CONSTRAINT devoluciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['solicitada'::character varying, 'aprobada'::character varying, 'rechazada'::character varying, 'procesada'::character varying, 'fallida'::character varying])::text[]))),
    CONSTRAINT devoluciones_monto_check CHECK ((monto > (0)::numeric))
);


ALTER TABLE public.devoluciones OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 43638)
-- Name: devoluciones_id_devolucion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.devoluciones ALTER COLUMN id_devolucion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.devoluciones_id_devolucion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 235 (class 1259 OID 43190)
-- Name: disponibilidad_trabajador; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disponibilidad_trabajador (
    id_disponibilidad integer NOT NULL,
    id_trabajador integer NOT NULL,
    dia_semana smallint NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT disponibilidad_trabajador_check CHECK ((hora_fin > hora_inicio)),
    CONSTRAINT disponibilidad_trabajador_dia_semana_check CHECK (((dia_semana >= 1) AND (dia_semana <= 7)))
);


ALTER TABLE public.disponibilidad_trabajador OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 43189)
-- Name: disponibilidad_trabajador_id_disponibilidad_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.disponibilidad_trabajador ALTER COLUMN id_disponibilidad ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.disponibilidad_trabajador_id_disponibilidad_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 231 (class 1259 OID 43137)
-- Name: documentos_trabajador; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documentos_trabajador (
    id_documento integer NOT NULL,
    id_trabajador integer NOT NULL,
    tipo character varying(30) NOT NULL,
    ruta_archivo character varying(300) NOT NULL,
    fecha_subida timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT documentos_trabajador_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['carnet'::character varying, 'antecedentes'::character varying, 'otro'::character varying])::text[])))
);


ALTER TABLE public.documentos_trabajador OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 43136)
-- Name: documentos_trabajador_id_documento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.documentos_trabajador ALTER COLUMN id_documento ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.documentos_trabajador_id_documento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 272 (class 1259 OID 43683)
-- Name: incidentes_trabajador; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incidentes_trabajador (
    id_incidente integer NOT NULL,
    id_trabajador integer NOT NULL,
    id_trabajo integer NOT NULL,
    tipo character varying(20) NOT NULL,
    anulado boolean DEFAULT false NOT NULL,
    id_supervisor_anula integer,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT incidentes_trabajador_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['cancelacion'::character varying, 'atraso'::character varying, 'reclamo'::character varying])::text[])))
);


ALTER TABLE public.incidentes_trabajador OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 43682)
-- Name: incidentes_trabajador_id_incidente_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.incidentes_trabajador ALTER COLUMN id_incidente ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.incidentes_trabajador_id_incidente_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 251 (class 1259 OID 43426)
-- Name: incrementos_precio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incrementos_precio (
    id_incremento integer NOT NULL,
    id_trabajo integer NOT NULL,
    monto_adicional numeric(10,2) NOT NULL,
    justificacion character varying(500) NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    fecha_solicitud timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_respuesta timestamp without time zone,
    CONSTRAINT incrementos_precio_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aceptado'::character varying, 'rechazado'::character varying])::text[]))),
    CONSTRAINT incrementos_precio_monto_adicional_check CHECK ((monto_adicional > (0)::numeric))
);


ALTER TABLE public.incrementos_precio OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 43425)
-- Name: incrementos_precio_id_incremento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.incrementos_precio ALTER COLUMN id_incremento ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.incrementos_precio_id_incremento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 237 (class 1259 OID 43214)
-- Name: inspecciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inspecciones (
    id_inspeccion integer NOT NULL,
    id_trabajador integer NOT NULL,
    id_supervisor integer NOT NULL,
    id_inspector integer NOT NULL,
    fecha_programada timestamp without time zone NOT NULL,
    estado character varying(20) DEFAULT 'programada'::character varying NOT NULL,
    resultado character varying(500),
    costo_transporte numeric(10,2),
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT inspecciones_costo_transporte_check CHECK ((costo_transporte >= (0)::numeric)),
    CONSTRAINT inspecciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['programada'::character varying, 'realizada'::character varying, 'reprogramada'::character varying])::text[])))
);


ALTER TABLE public.inspecciones OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 43213)
-- Name: inspecciones_id_inspeccion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.inspecciones ALTER COLUMN id_inspeccion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.inspecciones_id_inspeccion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 277 (class 1259 OID 43760)
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notificaciones (
    id_notificacion integer NOT NULL,
    id_usuario integer NOT NULL,
    tipo character varying(40) NOT NULL,
    mensaje character varying(300) NOT NULL,
    canal character varying(20) DEFAULT 'web'::character varying NOT NULL,
    leida boolean DEFAULT false NOT NULL,
    fecha_envio timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT notificaciones_canal_check CHECK (((canal)::text = ANY ((ARRAY['web'::character varying, 'correo'::character varying, 'whatsapp'::character varying])::text[])))
);


ALTER TABLE public.notificaciones OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 43759)
-- Name: notificaciones_id_notificacion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.notificaciones ALTER COLUMN id_notificacion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notificaciones_id_notificacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 243 (class 1259 OID 43301)
-- Name: ofertas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ofertas (
    id_oferta integer NOT NULL,
    id_solicitud integer NOT NULL,
    id_trabajador integer NOT NULL,
    precio_estimado numeric(10,2) NOT NULL,
    comentario character varying(500),
    requiere_visita boolean DEFAULT false NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    fecha_envio timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ofertas_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aceptada'::character varying, 'rechazada'::character varying, 'vencida'::character varying])::text[]))),
    CONSTRAINT ofertas_precio_estimado_check CHECK ((precio_estimado > (0)::numeric))
);


ALTER TABLE public.ofertas OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 43300)
-- Name: ofertas_id_oferta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.ofertas ALTER COLUMN id_oferta ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ofertas_id_oferta_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 256 (class 1259 OID 43473)
-- Name: pagos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pagos (
    id_pago integer NOT NULL,
    id_trabajo integer NOT NULL,
    tipo character varying(20) NOT NULL,
    medio character varying(20) NOT NULL,
    monto numeric(10,2) NOT NULL,
    comision numeric(10,2) DEFAULT 0 NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    referencia_pasarela character varying(100),
    fecha_pago timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_limite timestamp without time zone,
    CONSTRAINT pagos_comision_check CHECK ((comision >= (0)::numeric)),
    CONSTRAINT pagos_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmado'::character varying, 'rechazado'::character varying, 'en_disputa'::character varying, 'fallido'::character varying])::text[]))),
    CONSTRAINT pagos_medio_check CHECK (((medio)::text = ANY ((ARRAY['plataforma'::character varying, 'qr'::character varying, 'efectivo'::character varying])::text[]))),
    CONSTRAINT pagos_monto_check CHECK ((monto > (0)::numeric)),
    CONSTRAINT pagos_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['anticipo'::character varying, 'saldo'::character varying, 'liquidacion'::character varying, 'devolucion'::character varying])::text[])))
);


ALTER TABLE public.pagos OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 43472)
-- Name: pagos_id_pago_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.pagos ALTER COLUMN id_pago ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pagos_id_pago_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 275 (class 1259 OID 43745)
-- Name: parametros_sistema; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parametros_sistema (
    clave character varying(50) NOT NULL,
    valor character varying(100) NOT NULL,
    descripcion character varying(200),
    id_modificado_por integer,
    fecha_modificacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.parametros_sistema OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 43103)
-- Name: perfiles_trabajador; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.perfiles_trabajador (
    id_usuario integer NOT NULL,
    carnet_identidad character varying(20) NOT NULL,
    descripcion character varying(1000),
    anios_experiencia smallint DEFAULT 0 NOT NULL,
    foto_perfil character varying(300),
    estado_verificacion character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    calificacion_promedio numeric(3,2) DEFAULT 0 NOT NULL,
    total_calificaciones integer DEFAULT 0 NOT NULL,
    id_supervisor_revisor integer,
    fecha_decision timestamp without time zone,
    motivo_rechazo character varying(300),
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT perfiles_trabajador_anios_experiencia_check CHECK (((anios_experiencia >= 0) AND (anios_experiencia <= 60))),
    CONSTRAINT perfiles_trabajador_estado_verificacion_check CHECK (((estado_verificacion)::text = ANY ((ARRAY['pendiente'::character varying, 'observado'::character varying, 'aprobado'::character varying, 'rechazado'::character varying, 'suspendido'::character varying])::text[])))
);


ALTER TABLE public.perfiles_trabajador OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 43625)
-- Name: reclamo_evidencias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reclamo_evidencias (
    id_evidencia integer NOT NULL,
    id_reclamo integer NOT NULL,
    ruta_archivo character varying(300) NOT NULL
);


ALTER TABLE public.reclamo_evidencias OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 43624)
-- Name: reclamo_evidencias_id_evidencia_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.reclamo_evidencias ALTER COLUMN id_evidencia ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reclamo_evidencias_id_evidencia_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 266 (class 1259 OID 43591)
-- Name: reclamos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reclamos (
    id_reclamo integer NOT NULL,
    id_trabajo integer NOT NULL,
    id_cliente integer NOT NULL,
    id_supervisor integer,
    descripcion text NOT NULL,
    estado character varying(20) DEFAULT 'abierto'::character varying NOT NULL,
    resolucion character varying(500),
    escalado_super boolean DEFAULT false NOT NULL,
    fecha_reclamo timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_resolucion timestamp without time zone,
    CONSTRAINT reclamos_estado_check CHECK (((estado)::text = ANY ((ARRAY['abierto'::character varying, 'en_revision'::character varying, 'resuelto'::character varying, 'improcedente'::character varying])::text[])))
);


ALTER TABLE public.reclamos OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 43590)
-- Name: reclamos_id_reclamo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.reclamos ALTER COLUMN id_reclamo ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reclamos_id_reclamo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 221 (class 1259 OID 43012)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id_rol integer NOT NULL,
    nombre character varying(30) NOT NULL,
    descripcion character varying(200)
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 43011)
-- Name: roles_id_rol_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.roles ALTER COLUMN id_rol ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.roles_id_rol_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 241 (class 1259 OID 43287)
-- Name: solicitud_fotos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitud_fotos (
    id_foto integer NOT NULL,
    id_solicitud integer NOT NULL,
    ruta_archivo character varying(300) NOT NULL
);


ALTER TABLE public.solicitud_fotos OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 43286)
-- Name: solicitud_fotos_id_foto_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.solicitud_fotos ALTER COLUMN id_foto ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitud_fotos_id_foto_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 254 (class 1259 OID 43455)
-- Name: solicitudes_finalizacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitudes_finalizacion (
    id_finalizacion integer NOT NULL,
    id_trabajo integer NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    motivo_rechazo character varying(300),
    fecha_solicitud timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_respuesta timestamp without time zone,
    CONSTRAINT solicitudes_finalizacion_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aceptada'::character varying, 'rechazada'::character varying])::text[])))
);


ALTER TABLE public.solicitudes_finalizacion OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 43454)
-- Name: solicitudes_finalizacion_id_finalizacion_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.solicitudes_finalizacion ALTER COLUMN id_finalizacion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitudes_finalizacion_id_finalizacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 239 (class 1259 OID 43248)
-- Name: solicitudes_servicio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitudes_servicio (
    id_solicitud integer NOT NULL,
    id_cliente integer NOT NULL,
    id_categoria integer NOT NULL,
    id_zona integer NOT NULL,
    descripcion text NOT NULL,
    direccion_exacta character varying(250) NOT NULL,
    fecha_deseada timestamp without time zone NOT NULL,
    presupuesto_aproximado numeric(10,2),
    estado character varying(20) DEFAULT 'abierta'::character varying NOT NULL,
    fecha_publicacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_vencimiento timestamp without time zone NOT NULL,
    CONSTRAINT solicitudes_servicio_estado_check CHECK (((estado)::text = ANY ((ARRAY['abierta'::character varying, 'contratada'::character varying, 'vencida'::character varying, 'cancelada'::character varying])::text[]))),
    CONSTRAINT solicitudes_servicio_presupuesto_aproximado_check CHECK ((presupuesto_aproximado > (0)::numeric))
);


ALTER TABLE public.solicitudes_servicio OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 43247)
-- Name: solicitudes_servicio_id_solicitud_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.solicitudes_servicio ALTER COLUMN id_solicitud ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitudes_servicio_id_solicitud_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 274 (class 1259 OID 43713)
-- Name: suspensiones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suspensiones (
    id_suspension integer NOT NULL,
    id_usuario integer NOT NULL,
    tipo character varying(20) NOT NULL,
    motivo character varying(300),
    dias_duracion integer NOT NULL,
    fecha_inicio timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_fin timestamp without time zone NOT NULL,
    estado character varying(20) DEFAULT 'vigente'::character varying NOT NULL,
    id_reclamo integer,
    id_supervisor integer,
    CONSTRAINT suspensiones_dias_duracion_check CHECK ((dias_duracion > 0)),
    CONSTRAINT suspensiones_estado_check CHECK (((estado)::text = ANY ((ARRAY['vigente'::character varying, 'finalizada'::character varying, 'reactivada'::character varying, 'cuenta_eliminada'::character varying])::text[]))),
    CONSTRAINT suspensiones_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['voluntaria'::character varying, 'automatica'::character varying, 'sancion'::character varying])::text[])))
);


ALTER TABLE public.suspensiones OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 43712)
-- Name: suspensiones_id_suspension_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.suspensiones ALTER COLUMN id_suspension ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.suspensiones_id_suspension_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 232 (class 1259 OID 43154)
-- Name: trabajador_categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trabajador_categorias (
    id_trabajador integer NOT NULL,
    id_categoria integer NOT NULL,
    precio_estimado numeric(10,2),
    CONSTRAINT trabajador_categorias_precio_estimado_check CHECK ((precio_estimado >= (0)::numeric))
);


ALTER TABLE public.trabajador_categorias OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 43172)
-- Name: trabajador_zonas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trabajador_zonas (
    id_trabajador integer NOT NULL,
    id_zona integer NOT NULL
);


ALTER TABLE public.trabajador_zonas OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 43385)
-- Name: trabajo_historial_estados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trabajo_historial_estados (
    id_historial integer NOT NULL,
    id_trabajo integer NOT NULL,
    estado_anterior character varying(25),
    estado_nuevo character varying(25) NOT NULL,
    id_usuario integer,
    fecha_cambio timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.trabajo_historial_estados OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 43384)
-- Name: trabajo_historial_estados_id_historial_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.trabajo_historial_estados ALTER COLUMN id_historial ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.trabajo_historial_estados_id_historial_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 245 (class 1259 OID 43336)
-- Name: trabajos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trabajos (
    id_trabajo integer NOT NULL,
    id_oferta integer NOT NULL,
    id_solicitud integer NOT NULL,
    id_cliente integer NOT NULL,
    id_trabajador integer NOT NULL,
    precio_final numeric(10,2) NOT NULL,
    metodo_pago character varying(20) DEFAULT 'plataforma'::character varying NOT NULL,
    fecha_inicio_prog timestamp without time zone,
    fecha_fin_prog timestamp without time zone,
    estado character varying(25) DEFAULT 'pendiente_anticipo'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_cierre timestamp without time zone,
    CONSTRAINT trabajos_check CHECK (((fecha_fin_prog IS NULL) OR (fecha_fin_prog > fecha_inicio_prog))),
    CONSTRAINT trabajos_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente_anticipo'::character varying, 'programado'::character varying, 'en_camino'::character varying, 'en_proceso'::character varying, 'terminado'::character varying, 'cancelado'::character varying, 'en_reclamo'::character varying])::text[]))),
    CONSTRAINT trabajos_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['plataforma'::character varying, 'qr'::character varying, 'efectivo'::character varying])::text[]))),
    CONSTRAINT trabajos_precio_final_check CHECK ((precio_final > (0)::numeric))
);


ALTER TABLE public.trabajos OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 43335)
-- Name: trabajos_id_trabajo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.trabajos ALTER COLUMN id_trabajo ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.trabajos_id_trabajo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 43042)
-- Name: usuario_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario_roles (
    id_usuario integer NOT NULL,
    id_rol integer NOT NULL,
    fecha_alta timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.usuario_roles OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 43022)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id_usuario integer NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    correo character varying(150) NOT NULL,
    contrasena_hash character varying(255) NOT NULL,
    telefono character varying(20) NOT NULL,
    estado character varying(20) DEFAULT 'activa'::character varying NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT usuarios_estado_check CHECK (((estado)::text = ANY ((ARRAY['activa'::character varying, 'suspendida'::character varying, 'eliminada'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 43021)
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.usuarios ALTER COLUMN id_usuario ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.usuarios_id_usuario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 249 (class 1259 OID 43406)
-- Name: visitas_previas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visitas_previas (
    id_visita integer NOT NULL,
    id_oferta integer NOT NULL,
    fecha_propuesta timestamp without time zone NOT NULL,
    aceptada_cliente boolean,
    resultado character varying(500),
    precio_definitivo numeric(10,2),
    estado character varying(20) DEFAULT 'propuesta'::character varying NOT NULL,
    CONSTRAINT visitas_previas_estado_check CHECK (((estado)::text = ANY ((ARRAY['propuesta'::character varying, 'aceptada'::character varying, 'realizada'::character varying, 'precio_aceptado'::character varying, 'cancelada'::character varying])::text[]))),
    CONSTRAINT visitas_previas_precio_definitivo_check CHECK ((precio_definitivo > (0)::numeric))
);


ALTER TABLE public.visitas_previas OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 43405)
-- Name: visitas_previas_id_visita_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.visitas_previas ALTER COLUMN id_visita ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.visitas_previas_id_visita_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 252 (class 1259 OID 43449)
-- Name: vista_trabajos_precio_total; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vista_trabajos_precio_total AS
 SELECT t.id_trabajo,
    t.precio_final,
    COALESCE(sum(i.monto_adicional) FILTER (WHERE ((i.estado)::text = 'aceptado'::text)), (0)::numeric) AS total_incrementos,
    (t.precio_final + COALESCE(sum(i.monto_adicional) FILTER (WHERE ((i.estado)::text = 'aceptado'::text)), (0)::numeric)) AS precio_total
   FROM (public.trabajos t
     LEFT JOIN public.incrementos_precio i ON ((i.id_trabajo = t.id_trabajo)))
  GROUP BY t.id_trabajo, t.precio_final;


ALTER VIEW public.vista_trabajos_precio_total OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 43092)
-- Name: zonas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zonas (
    id_zona integer NOT NULL,
    nombre character varying(100) NOT NULL,
    activa boolean DEFAULT true NOT NULL
);


ALTER TABLE public.zonas OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 43091)
-- Name: zonas_id_zona_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.zonas ALTER COLUMN id_zona ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.zonas_id_zona_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 5355 (class 2604 OID 50480)
-- Name: datos_bancarios id_dato; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.datos_bancarios ALTER COLUMN id_dato SET DEFAULT nextval('public.datos_bancarios_id_dato_seq'::regclass);


--
-- TOC entry 5760 (class 0 OID 43782)
-- Dependencies: 279
-- Data for Name: bitacora_auditoria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bitacora_auditoria (id_bitacora, id_usuario, accion, entidad, id_entidad, detalle, fecha) FROM stdin;
\.


--
-- TOC entry 5741 (class 0 OID 43526)
-- Dependencies: 260
-- Data for Name: calificaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calificaciones (id_calificacion, id_trabajo, id_cliente, id_trabajador, puntaje, comentario, respuesta_trabajador, fecha) FROM stdin;
\.


--
-- TOC entry 5743 (class 0 OID 43549)
-- Dependencies: 262
-- Data for Name: calificaciones_historial; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calificaciones_historial (id_historial, id_calificacion, puntaje_anterior, puntaje_nuevo, fecha_cambio) FROM stdin;
\.


--
-- TOC entry 5745 (class 0 OID 43568)
-- Dependencies: 264
-- Data for Name: calificaciones_internas_cliente; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calificaciones_internas_cliente (id_calificacion_int, id_trabajo, id_trabajador, id_cliente, puntaje, nota, fecha) FROM stdin;
\.


--
-- TOC entry 5739 (class 0 OID 43500)
-- Dependencies: 258
-- Data for Name: cancelaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cancelaciones (id_cancelacion, id_trabajo, id_usuario, cancelado_por, motivo, estado, fecha_solicitud) FROM stdin;
\.


--
-- TOC entry 5708 (class 0 OID 43080)
-- Dependencies: 226
-- Data for Name: categorias_servicio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorias_servicio (id_categoria, nombre, activa) FROM stdin;
\.


--
-- TOC entry 5762 (class 0 OID 50477)
-- Dependencies: 281
-- Data for Name: datos_bancarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.datos_bancarios (id_dato, id_usuario, banco, titular, numero_cuenta, ultimos_digitos, fecha_actualizacion) FROM stdin;
\.


--
-- TOC entry 5751 (class 0 OID 43639)
-- Dependencies: 270
-- Data for Name: devoluciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.devoluciones (id_devolucion, id_trabajo, id_cliente, id_reclamo, monto, motivo, estado, fecha_solicitud, id_aprobado_por, fecha_aprobacion, motivo_rechazo, id_pago, fecha_procesamiento) FROM stdin;
\.


--
-- TOC entry 5717 (class 0 OID 43190)
-- Dependencies: 235
-- Data for Name: disponibilidad_trabajador; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disponibilidad_trabajador (id_disponibilidad, id_trabajador, dia_semana, hora_inicio, hora_fin, activa, fecha_registro) FROM stdin;
\.


--
-- TOC entry 5713 (class 0 OID 43137)
-- Dependencies: 231
-- Data for Name: documentos_trabajador; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documentos_trabajador (id_documento, id_trabajador, tipo, ruta_archivo, fecha_subida) FROM stdin;
\.


--
-- TOC entry 5753 (class 0 OID 43683)
-- Dependencies: 272
-- Data for Name: incidentes_trabajador; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incidentes_trabajador (id_incidente, id_trabajador, id_trabajo, tipo, anulado, id_supervisor_anula, fecha) FROM stdin;
\.


--
-- TOC entry 5733 (class 0 OID 43426)
-- Dependencies: 251
-- Data for Name: incrementos_precio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incrementos_precio (id_incremento, id_trabajo, monto_adicional, justificacion, estado, fecha_solicitud, fecha_respuesta) FROM stdin;
\.


--
-- TOC entry 5719 (class 0 OID 43214)
-- Dependencies: 237
-- Data for Name: inspecciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inspecciones (id_inspeccion, id_trabajador, id_supervisor, id_inspector, fecha_programada, estado, resultado, costo_transporte, fecha_registro) FROM stdin;
\.


--
-- TOC entry 5758 (class 0 OID 43760)
-- Dependencies: 277
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notificaciones (id_notificacion, id_usuario, tipo, mensaje, canal, leida, fecha_envio) FROM stdin;
\.


--
-- TOC entry 5725 (class 0 OID 43301)
-- Dependencies: 243
-- Data for Name: ofertas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ofertas (id_oferta, id_solicitud, id_trabajador, precio_estimado, comentario, requiere_visita, estado, fecha_envio) FROM stdin;
\.


--
-- TOC entry 5737 (class 0 OID 43473)
-- Dependencies: 256
-- Data for Name: pagos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pagos (id_pago, id_trabajo, tipo, medio, monto, comision, estado, referencia_pasarela, fecha_pago, fecha_limite) FROM stdin;
\.


--
-- TOC entry 5756 (class 0 OID 43745)
-- Dependencies: 275
-- Data for Name: parametros_sistema; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parametros_sistema (clave, valor, descripcion, id_modificado_por, fecha_modificacion) FROM stdin;
comision	5	Comisión de la plataforma sobre el precio final (%)	\N	2026-11-22 09:12:15.617635
anticipo	25	Anticipo sobre el precio final (%)	\N	2026-11-22 09:12:15.617635
horas_cancelacion	2	Horas mínimas antes del servicio para que el cliente cancele	\N	2026-11-22 09:12:15.617635
dias_devolucion	3	Días máximos para devolver el dinero al cliente	\N	2026-11-22 09:12:15.617635
dias_reclamo	7	Días para reclamar tras el cierre del trabajo	\N	2026-11-22 09:12:15.617635
dias_vigencia_solicitud	30	Días de vigencia de una solicitud	\N	2026-11-22 09:12:15.617635
umbral_incidentes	3	Incidentes para suspender automáticamente (2 o 3)	\N	2026-11-22 09:12:15.617635
atrasos_automaticos	0	1 = registrar atrasos automáticamente (opcional)	\N	2026-11-22 09:12:15.617635
minutos_tolerancia_atraso	30	Minutos de tolerancia antes de contar un atraso	\N	2026-11-22 09:12:15.617635
\.


--
-- TOC entry 5711 (class 0 OID 43103)
-- Dependencies: 229
-- Data for Name: perfiles_trabajador; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.perfiles_trabajador (id_usuario, carnet_identidad, descripcion, anios_experiencia, foto_perfil, estado_verificacion, calificacion_promedio, total_calificaciones, id_supervisor_revisor, fecha_decision, motivo_rechazo, fecha_creacion) FROM stdin;
\.


--
-- TOC entry 5749 (class 0 OID 43625)
-- Dependencies: 268
-- Data for Name: reclamo_evidencias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reclamo_evidencias (id_evidencia, id_reclamo, ruta_archivo) FROM stdin;
\.


--
-- TOC entry 5747 (class 0 OID 43591)
-- Dependencies: 266
-- Data for Name: reclamos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reclamos (id_reclamo, id_trabajo, id_cliente, id_supervisor, descripcion, estado, resolucion, escalado_super, fecha_reclamo, fecha_resolucion) FROM stdin;
\.


--
-- TOC entry 5703 (class 0 OID 43012)
-- Dependencies: 221
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id_rol, nombre, descripcion) FROM stdin;
1	super_supervisor	Administración total y parámetros
2	trabajador	Ofrece servicios
3	cliente	Solicita servicios
4	inspector	Realiza visitas de verificación
5	supervisor	Revisa trabajadores, atiende reclamos y gestiona zonas
\.


--
-- TOC entry 5723 (class 0 OID 43287)
-- Dependencies: 241
-- Data for Name: solicitud_fotos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.solicitud_fotos (id_foto, id_solicitud, ruta_archivo) FROM stdin;
\.


--
-- TOC entry 5735 (class 0 OID 43455)
-- Dependencies: 254
-- Data for Name: solicitudes_finalizacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.solicitudes_finalizacion (id_finalizacion, id_trabajo, estado, motivo_rechazo, fecha_solicitud, fecha_respuesta) FROM stdin;
\.


--
-- TOC entry 5721 (class 0 OID 43248)
-- Dependencies: 239
-- Data for Name: solicitudes_servicio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.solicitudes_servicio (id_solicitud, id_cliente, id_categoria, id_zona, descripcion, direccion_exacta, fecha_deseada, presupuesto_aproximado, estado, fecha_publicacion, fecha_vencimiento) FROM stdin;
\.


--
-- TOC entry 5755 (class 0 OID 43713)
-- Dependencies: 274
-- Data for Name: suspensiones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suspensiones (id_suspension, id_usuario, tipo, motivo, dias_duracion, fecha_inicio, fecha_fin, estado, id_reclamo, id_supervisor) FROM stdin;
\.


--
-- TOC entry 5714 (class 0 OID 43154)
-- Dependencies: 232
-- Data for Name: trabajador_categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trabajador_categorias (id_trabajador, id_categoria, precio_estimado) FROM stdin;
\.


--
-- TOC entry 5715 (class 0 OID 43172)
-- Dependencies: 233
-- Data for Name: trabajador_zonas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trabajador_zonas (id_trabajador, id_zona) FROM stdin;
\.


--
-- TOC entry 5729 (class 0 OID 43385)
-- Dependencies: 247
-- Data for Name: trabajo_historial_estados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trabajo_historial_estados (id_historial, id_trabajo, estado_anterior, estado_nuevo, id_usuario, fecha_cambio) FROM stdin;
\.


--
-- TOC entry 5727 (class 0 OID 43336)
-- Dependencies: 245
-- Data for Name: trabajos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trabajos (id_trabajo, id_oferta, id_solicitud, id_cliente, id_trabajador, precio_final, metodo_pago, fecha_inicio_prog, fecha_fin_prog, estado, fecha_creacion, fecha_cierre) FROM stdin;
\.


--
-- TOC entry 5706 (class 0 OID 43042)
-- Dependencies: 224
-- Data for Name: usuario_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuario_roles (id_usuario, id_rol, fecha_alta) FROM stdin;
\.


--
-- TOC entry 5705 (class 0 OID 43022)
-- Dependencies: 223
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id_usuario, nombres, apellidos, correo, contrasena_hash, telefono, estado, fecha_registro) FROM stdin;
1	Carlos	Prueba	carlos.prueba01@example.com	$2b$10$KCvKyFhtwQLp45LCy4icneFYEI8tAfcqaaD1l7k.imksmOfIqnFWC	76543210	activa	2026-11-16 18:23:04.031781
\.


--
-- TOC entry 5731 (class 0 OID 43406)
-- Dependencies: 249
-- Data for Name: visitas_previas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.visitas_previas (id_visita, id_oferta, fecha_propuesta, aceptada_cliente, resultado, precio_definitivo, estado) FROM stdin;
\.


--
-- TOC entry 5710 (class 0 OID 43092)
-- Dependencies: 228
-- Data for Name: zonas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zonas (id_zona, nombre, activa) FROM stdin;
\.


--
-- TOC entry 5770 (class 0 OID 0)
-- Dependencies: 278
-- Name: bitacora_auditoria_id_bitacora_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bitacora_auditoria_id_bitacora_seq', 1, false);


--
-- TOC entry 5771 (class 0 OID 0)
-- Dependencies: 261
-- Name: calificaciones_historial_id_historial_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.calificaciones_historial_id_historial_seq', 1, false);


--
-- TOC entry 5772 (class 0 OID 0)
-- Dependencies: 259
-- Name: calificaciones_id_calificacion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.calificaciones_id_calificacion_seq', 1, false);


--
-- TOC entry 5773 (class 0 OID 0)
-- Dependencies: 263
-- Name: calificaciones_internas_cliente_id_calificacion_int_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.calificaciones_internas_cliente_id_calificacion_int_seq', 1, false);


--
-- TOC entry 5774 (class 0 OID 0)
-- Dependencies: 257
-- Name: cancelaciones_id_cancelacion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cancelaciones_id_cancelacion_seq', 1, false);


--
-- TOC entry 5775 (class 0 OID 0)
-- Dependencies: 225
-- Name: categorias_servicio_id_categoria_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categorias_servicio_id_categoria_seq', 1, false);


--
-- TOC entry 5776 (class 0 OID 0)
-- Dependencies: 280
-- Name: datos_bancarios_id_dato_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.datos_bancarios_id_dato_seq', 1, false);


--
-- TOC entry 5777 (class 0 OID 0)
-- Dependencies: 269
-- Name: devoluciones_id_devolucion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.devoluciones_id_devolucion_seq', 1, false);


--
-- TOC entry 5778 (class 0 OID 0)
-- Dependencies: 234
-- Name: disponibilidad_trabajador_id_disponibilidad_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.disponibilidad_trabajador_id_disponibilidad_seq', 1, false);


--
-- TOC entry 5779 (class 0 OID 0)
-- Dependencies: 230
-- Name: documentos_trabajador_id_documento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documentos_trabajador_id_documento_seq', 1, false);


--
-- TOC entry 5780 (class 0 OID 0)
-- Dependencies: 271
-- Name: incidentes_trabajador_id_incidente_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.incidentes_trabajador_id_incidente_seq', 1, false);


--
-- TOC entry 5781 (class 0 OID 0)
-- Dependencies: 250
-- Name: incrementos_precio_id_incremento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.incrementos_precio_id_incremento_seq', 1, false);


--
-- TOC entry 5782 (class 0 OID 0)
-- Dependencies: 236
-- Name: inspecciones_id_inspeccion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inspecciones_id_inspeccion_seq', 1, false);


--
-- TOC entry 5783 (class 0 OID 0)
-- Dependencies: 276
-- Name: notificaciones_id_notificacion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notificaciones_id_notificacion_seq', 1, false);


--
-- TOC entry 5784 (class 0 OID 0)
-- Dependencies: 242
-- Name: ofertas_id_oferta_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ofertas_id_oferta_seq', 1, false);


--
-- TOC entry 5785 (class 0 OID 0)
-- Dependencies: 255
-- Name: pagos_id_pago_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pagos_id_pago_seq', 1, false);


--
-- TOC entry 5786 (class 0 OID 0)
-- Dependencies: 267
-- Name: reclamo_evidencias_id_evidencia_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reclamo_evidencias_id_evidencia_seq', 1, false);


--
-- TOC entry 5787 (class 0 OID 0)
-- Dependencies: 265
-- Name: reclamos_id_reclamo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reclamos_id_reclamo_seq', 1, false);


--
-- TOC entry 5788 (class 0 OID 0)
-- Dependencies: 220
-- Name: roles_id_rol_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_rol_seq', 5, true);


--
-- TOC entry 5789 (class 0 OID 0)
-- Dependencies: 240
-- Name: solicitud_fotos_id_foto_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.solicitud_fotos_id_foto_seq', 1, false);


--
-- TOC entry 5790 (class 0 OID 0)
-- Dependencies: 253
-- Name: solicitudes_finalizacion_id_finalizacion_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.solicitudes_finalizacion_id_finalizacion_seq', 1, false);


--
-- TOC entry 5791 (class 0 OID 0)
-- Dependencies: 238
-- Name: solicitudes_servicio_id_solicitud_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.solicitudes_servicio_id_solicitud_seq', 1, false);


--
-- TOC entry 5792 (class 0 OID 0)
-- Dependencies: 273
-- Name: suspensiones_id_suspension_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suspensiones_id_suspension_seq', 1, false);


--
-- TOC entry 5793 (class 0 OID 0)
-- Dependencies: 246
-- Name: trabajo_historial_estados_id_historial_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trabajo_historial_estados_id_historial_seq', 1, false);


--
-- TOC entry 5794 (class 0 OID 0)
-- Dependencies: 244
-- Name: trabajos_id_trabajo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trabajos_id_trabajo_seq', 1, false);


--
-- TOC entry 5795 (class 0 OID 0)
-- Dependencies: 222
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_usuario_seq', 1, true);


--
-- TOC entry 5796 (class 0 OID 0)
-- Dependencies: 248
-- Name: visitas_previas_id_visita_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.visitas_previas_id_visita_seq', 1, false);


--
-- TOC entry 5797 (class 0 OID 0)
-- Dependencies: 227
-- Name: zonas_id_zona_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.zonas_id_zona_seq', 1, false);


--
-- TOC entry 5497 (class 2606 OID 43792)
-- Name: bitacora_auditoria bitacora_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bitacora_auditoria
    ADD CONSTRAINT bitacora_auditoria_pkey PRIMARY KEY (id_bitacora);


--
-- TOC entry 5475 (class 2606 OID 43561)
-- Name: calificaciones_historial calificaciones_historial_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calificaciones_historial
    ADD CONSTRAINT calificaciones_historial_pkey PRIMARY KEY (id_historial);


--
-- TOC entry 5471 (class 2606 OID 43542)
-- Name: calificaciones calificaciones_id_trabajo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_id_trabajo_key UNIQUE (id_trabajo);


--
-- TOC entry 5477 (class 2606 OID 43584)
-- Name: calificaciones_internas_cliente calificaciones_internas_cliente_id_trabajo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calificaciones_internas_cliente
    ADD CONSTRAINT calificaciones_internas_cliente_id_trabajo_key UNIQUE (id_trabajo);


--
-- TOC entry 5479 (class 2606 OID 43582)
-- Name: calificaciones_internas_cliente calificaciones_internas_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calificaciones_internas_cliente
    ADD CONSTRAINT calificaciones_internas_cliente_pkey PRIMARY KEY (id_calificacion_int);


--
-- TOC entry 5473 (class 2606 OID 43540)
-- Name: calificaciones calificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_pkey PRIMARY KEY (id_calificacion);


--
-- TOC entry 5469 (class 2606 OID 43514)
-- Name: cancelaciones cancelaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cancelaciones
    ADD CONSTRAINT cancelaciones_pkey PRIMARY KEY (id_cancelacion);


--
-- TOC entry 5412 (class 2606 OID 43090)
-- Name: categorias_servicio categorias_servicio_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_servicio
    ADD CONSTRAINT categorias_servicio_nombre_key UNIQUE (nombre);


--
-- TOC entry 5414 (class 2606 OID 43088)
-- Name: categorias_servicio categorias_servicio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_servicio
    ADD CONSTRAINT categorias_servicio_pkey PRIMARY KEY (id_categoria);


--
-- TOC entry 5499 (class 2606 OID 50492)
-- Name: datos_bancarios datos_bancarios_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.datos_bancarios
    ADD CONSTRAINT datos_bancarios_id_usuario_key UNIQUE (id_usuario);


--
-- TOC entry 5501 (class 2606 OID 50490)
-- Name: datos_bancarios datos_bancarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.datos_bancarios
    ADD CONSTRAINT datos_bancarios_pkey PRIMARY KEY (id_dato);


--
-- TOC entry 5485 (class 2606 OID 43661)
-- Name: devoluciones devoluciones_id_pago_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_id_pago_key UNIQUE (id_pago);


--
-- TOC entry 5487 (class 2606 OID 43659)
-- Name: devoluciones devoluciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_pkey PRIMARY KEY (id_devolucion);


--
-- TOC entry 5430 (class 2606 OID 43205)
-- Name: disponibilidad_trabajador disponibilidad_trabajador_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidad_trabajador
    ADD CONSTRAINT disponibilidad_trabajador_pkey PRIMARY KEY (id_disponibilidad);


--
-- TOC entry 5424 (class 2606 OID 43148)
-- Name: documentos_trabajador documentos_trabajador_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentos_trabajador
    ADD CONSTRAINT documentos_trabajador_pkey PRIMARY KEY (id_documento);


--
-- TOC entry 5432 (class 2606 OID 43207)
-- Name: disponibilidad_trabajador ex_disponibilidad_sin_traslape; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidad_trabajador
    ADD CONSTRAINT ex_disponibilidad_sin_traslape EXCLUDE USING gist (id_trabajador WITH =, dia_semana WITH =, tsrange(('2000-01-01 00:00:00'::timestamp without time zone + (hora_inicio)::interval), ('2000-01-01 00:00:00'::timestamp without time zone + (hora_fin)::interval)) WITH &&);


--
-- TOC entry 5489 (class 2606 OID 43696)
-- Name: incidentes_trabajador incidentes_trabajador_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidentes_trabajador
    ADD CONSTRAINT incidentes_trabajador_pkey PRIMARY KEY (id_incidente);


--
-- TOC entry 5462 (class 2606 OID 43442)
-- Name: incrementos_precio incrementos_precio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incrementos_precio
    ADD CONSTRAINT incrementos_precio_pkey PRIMARY KEY (id_incremento);


--
-- TOC entry 5434 (class 2606 OID 43231)
-- Name: inspecciones inspecciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspecciones
    ADD CONSTRAINT inspecciones_pkey PRIMARY KEY (id_inspeccion);


--
-- TOC entry 5495 (class 2606 OID 43775)
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id_notificacion);


--
-- TOC entry 5442 (class 2606 OID 43323)
-- Name: ofertas ofertas_id_oferta_id_solicitud_id_trabajador_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ofertas
    ADD CONSTRAINT ofertas_id_oferta_id_solicitud_id_trabajador_key UNIQUE (id_oferta, id_solicitud, id_trabajador);


--
-- TOC entry 5444 (class 2606 OID 43321)
-- Name: ofertas ofertas_id_solicitud_id_trabajador_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ofertas
    ADD CONSTRAINT ofertas_id_solicitud_id_trabajador_key UNIQUE (id_solicitud, id_trabajador);


--
-- TOC entry 5446 (class 2606 OID 43319)
-- Name: ofertas ofertas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ofertas
    ADD CONSTRAINT ofertas_pkey PRIMARY KEY (id_oferta);


--
-- TOC entry 5467 (class 2606 OID 43493)
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id_pago);


--
-- TOC entry 5493 (class 2606 OID 43753)
-- Name: parametros_sistema parametros_sistema_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parametros_sistema
    ADD CONSTRAINT parametros_sistema_pkey PRIMARY KEY (clave);


--
-- TOC entry 5420 (class 2606 OID 43125)
-- Name: perfiles_trabajador perfiles_trabajador_carnet_identidad_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_trabajador
    ADD CONSTRAINT perfiles_trabajador_carnet_identidad_key UNIQUE (carnet_identidad);


--
-- TOC entry 5422 (class 2606 OID 43123)
-- Name: perfiles_trabajador perfiles_trabajador_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_trabajador
    ADD CONSTRAINT perfiles_trabajador_pkey PRIMARY KEY (id_usuario);


--
-- TOC entry 5483 (class 2606 OID 43632)
-- Name: reclamo_evidencias reclamo_evidencias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reclamo_evidencias
    ADD CONSTRAINT reclamo_evidencias_pkey PRIMARY KEY (id_evidencia);


--
-- TOC entry 5481 (class 2606 OID 43608)
-- Name: reclamos reclamos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reclamos
    ADD CONSTRAINT reclamos_pkey PRIMARY KEY (id_reclamo);


--
-- TOC entry 5402 (class 2606 OID 43020)
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- TOC entry 5404 (class 2606 OID 43018)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id_rol);


--
-- TOC entry 5440 (class 2606 OID 43294)
-- Name: solicitud_fotos solicitud_fotos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitud_fotos
    ADD CONSTRAINT solicitud_fotos_pkey PRIMARY KEY (id_foto);


--
-- TOC entry 5465 (class 2606 OID 43466)
-- Name: solicitudes_finalizacion solicitudes_finalizacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_finalizacion
    ADD CONSTRAINT solicitudes_finalizacion_pkey PRIMARY KEY (id_finalizacion);


--
-- TOC entry 5436 (class 2606 OID 43270)
-- Name: solicitudes_servicio solicitudes_servicio_id_solicitud_id_cliente_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_servicio
    ADD CONSTRAINT solicitudes_servicio_id_solicitud_id_cliente_key UNIQUE (id_solicitud, id_cliente);


--
-- TOC entry 5438 (class 2606 OID 43268)
-- Name: solicitudes_servicio solicitudes_servicio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_servicio
    ADD CONSTRAINT solicitudes_servicio_pkey PRIMARY KEY (id_solicitud);


--
-- TOC entry 5491 (class 2606 OID 43729)
-- Name: suspensiones suspensiones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suspensiones
    ADD CONSTRAINT suspensiones_pkey PRIMARY KEY (id_suspension);


--
-- TOC entry 5426 (class 2606 OID 43161)
-- Name: trabajador_categorias trabajador_categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajador_categorias
    ADD CONSTRAINT trabajador_categorias_pkey PRIMARY KEY (id_trabajador, id_categoria);


--
-- TOC entry 5428 (class 2606 OID 43178)
-- Name: trabajador_zonas trabajador_zonas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajador_zonas
    ADD CONSTRAINT trabajador_zonas_pkey PRIMARY KEY (id_trabajador, id_zona);


--
-- TOC entry 5458 (class 2606 OID 43394)
-- Name: trabajo_historial_estados trabajo_historial_estados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajo_historial_estados
    ADD CONSTRAINT trabajo_historial_estados_pkey PRIMARY KEY (id_historial);


--
-- TOC entry 5449 (class 2606 OID 43358)
-- Name: trabajos trabajos_id_oferta_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajos
    ADD CONSTRAINT trabajos_id_oferta_key UNIQUE (id_oferta);


--
-- TOC entry 5451 (class 2606 OID 43360)
-- Name: trabajos trabajos_id_trabajo_id_cliente_id_trabajador_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajos
    ADD CONSTRAINT trabajos_id_trabajo_id_cliente_id_trabajador_key UNIQUE (id_trabajo, id_cliente, id_trabajador);


--
-- TOC entry 5453 (class 2606 OID 43362)
-- Name: trabajos trabajos_id_trabajo_id_cliente_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajos
    ADD CONSTRAINT trabajos_id_trabajo_id_cliente_key UNIQUE (id_trabajo, id_cliente);


--
-- TOC entry 5455 (class 2606 OID 43356)
-- Name: trabajos trabajos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajos
    ADD CONSTRAINT trabajos_pkey PRIMARY KEY (id_trabajo);


--
-- TOC entry 5410 (class 2606 OID 43050)
-- Name: usuario_roles usuario_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_pkey PRIMARY KEY (id_usuario, id_rol);


--
-- TOC entry 5406 (class 2606 OID 43041)
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);


--
-- TOC entry 5408 (class 2606 OID 43039)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- TOC entry 5460 (class 2606 OID 43419)
-- Name: visitas_previas visitas_previas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitas_previas
    ADD CONSTRAINT visitas_previas_pkey PRIMARY KEY (id_visita);


--
-- TOC entry 5416 (class 2606 OID 43102)
-- Name: zonas zonas_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zonas
    ADD CONSTRAINT zonas_nombre_key UNIQUE (nombre);


--
-- TOC entry 5418 (class 2606 OID 43100)
-- Name: zonas zonas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zonas
    ADD CONSTRAINT zonas_pkey PRIMARY KEY (id_zona);


--
-- TOC entry 5463 (class 1259 OID 43448)
-- Name: uq_un_incremento_pendiente_por_trabajo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_un_incremento_pendiente_por_trabajo ON public.incrementos_precio USING btree (id_trabajo) WHERE ((estado)::text = 'pendiente'::text);


--
-- TOC entry 5456 (class 1259 OID 43383)
-- Name: uq_un_trabajo_vigente_por_solicitud; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_un_trabajo_vigente_por_solicitud ON public.trabajos USING btree (id_solicitud) WHERE ((estado)::text <> 'cancelado'::text);


--
-- TOC entry 5447 (class 1259 OID 43334)
-- Name: uq_una_oferta_aceptada_por_solicitud; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_una_oferta_aceptada_por_solicitud ON public.ofertas USING btree (id_solicitud) WHERE ((estado)::text = 'aceptada'::text);


--
-- TOC entry 5552 (class 2606 OID 43793)
-- Name: bitacora_auditoria bitacora_auditoria_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bitacora_auditoria
    ADD CONSTRAINT bitacora_auditoria_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5534 (class 2606 OID 43562)
-- Name: calificaciones_historial calificaciones_historial_id_calificacion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calificaciones_historial
    ADD CONSTRAINT calificaciones_historial_id_calificacion_fkey FOREIGN KEY (id_calificacion) REFERENCES public.calificaciones(id_calificacion) ON DELETE RESTRICT;


--
-- TOC entry 5533 (class 2606 OID 43543)
-- Name: calificaciones calificaciones_id_trabajo_id_cliente_id_trabajador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calificaciones
    ADD CONSTRAINT calificaciones_id_trabajo_id_cliente_id_trabajador_fkey FOREIGN KEY (id_trabajo, id_cliente, id_trabajador) REFERENCES public.trabajos(id_trabajo, id_cliente, id_trabajador);


--
-- TOC entry 5535 (class 2606 OID 43585)
-- Name: calificaciones_internas_cliente calificaciones_internas_clien_id_trabajo_id_cliente_id_tra_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calificaciones_internas_cliente
    ADD CONSTRAINT calificaciones_internas_clien_id_trabajo_id_cliente_id_tra_fkey FOREIGN KEY (id_trabajo, id_cliente, id_trabajador) REFERENCES public.trabajos(id_trabajo, id_cliente, id_trabajador);


--
-- TOC entry 5531 (class 2606 OID 43515)
-- Name: cancelaciones cancelaciones_id_trabajo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cancelaciones
    ADD CONSTRAINT cancelaciones_id_trabajo_fkey FOREIGN KEY (id_trabajo) REFERENCES public.trabajos(id_trabajo);


--
-- TOC entry 5532 (class 2606 OID 43520)
-- Name: cancelaciones cancelaciones_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cancelaciones
    ADD CONSTRAINT cancelaciones_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5553 (class 2606 OID 50493)
-- Name: datos_bancarios datos_bancarios_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.datos_bancarios
    ADD CONSTRAINT datos_bancarios_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5540 (class 2606 OID 43667)
-- Name: devoluciones devoluciones_id_aprobado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_id_aprobado_por_fkey FOREIGN KEY (id_aprobado_por) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5541 (class 2606 OID 43672)
-- Name: devoluciones devoluciones_id_pago_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_id_pago_fkey FOREIGN KEY (id_pago) REFERENCES public.pagos(id_pago);


--
-- TOC entry 5542 (class 2606 OID 43662)
-- Name: devoluciones devoluciones_id_reclamo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_id_reclamo_fkey FOREIGN KEY (id_reclamo) REFERENCES public.reclamos(id_reclamo);


--
-- TOC entry 5543 (class 2606 OID 43677)
-- Name: devoluciones devoluciones_id_trabajo_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_id_trabajo_id_cliente_fkey FOREIGN KEY (id_trabajo, id_cliente) REFERENCES public.trabajos(id_trabajo, id_cliente) ON DELETE RESTRICT;


--
-- TOC entry 5511 (class 2606 OID 43208)
-- Name: disponibilidad_trabajador disponibilidad_trabajador_id_trabajador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilidad_trabajador
    ADD CONSTRAINT disponibilidad_trabajador_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.perfiles_trabajador(id_usuario) ON DELETE CASCADE;


--
-- TOC entry 5506 (class 2606 OID 43149)
-- Name: documentos_trabajador documentos_trabajador_id_trabajador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documentos_trabajador
    ADD CONSTRAINT documentos_trabajador_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.perfiles_trabajador(id_usuario) ON DELETE RESTRICT;


--
-- TOC entry 5521 (class 2606 OID 43373)
-- Name: trabajos fk_trabajo_cliente; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajos
    ADD CONSTRAINT fk_trabajo_cliente FOREIGN KEY (id_cliente) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5522 (class 2606 OID 43363)
-- Name: trabajos fk_trabajo_oferta_coherente; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajos
    ADD CONSTRAINT fk_trabajo_oferta_coherente FOREIGN KEY (id_oferta, id_solicitud, id_trabajador) REFERENCES public.ofertas(id_oferta, id_solicitud, id_trabajador);


--
-- TOC entry 5523 (class 2606 OID 43368)
-- Name: trabajos fk_trabajo_solicitud_cliente; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajos
    ADD CONSTRAINT fk_trabajo_solicitud_cliente FOREIGN KEY (id_solicitud, id_cliente) REFERENCES public.solicitudes_servicio(id_solicitud, id_cliente);


--
-- TOC entry 5524 (class 2606 OID 43378)
-- Name: trabajos fk_trabajo_trabajador; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajos
    ADD CONSTRAINT fk_trabajo_trabajador FOREIGN KEY (id_trabajador) REFERENCES public.perfiles_trabajador(id_usuario);


--
-- TOC entry 5544 (class 2606 OID 43707)
-- Name: incidentes_trabajador incidentes_trabajador_id_supervisor_anula_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidentes_trabajador
    ADD CONSTRAINT incidentes_trabajador_id_supervisor_anula_fkey FOREIGN KEY (id_supervisor_anula) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5545 (class 2606 OID 43697)
-- Name: incidentes_trabajador incidentes_trabajador_id_trabajador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidentes_trabajador
    ADD CONSTRAINT incidentes_trabajador_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.perfiles_trabajador(id_usuario);


--
-- TOC entry 5546 (class 2606 OID 43702)
-- Name: incidentes_trabajador incidentes_trabajador_id_trabajo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidentes_trabajador
    ADD CONSTRAINT incidentes_trabajador_id_trabajo_fkey FOREIGN KEY (id_trabajo) REFERENCES public.trabajos(id_trabajo);


--
-- TOC entry 5528 (class 2606 OID 43443)
-- Name: incrementos_precio incrementos_precio_id_trabajo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incrementos_precio
    ADD CONSTRAINT incrementos_precio_id_trabajo_fkey FOREIGN KEY (id_trabajo) REFERENCES public.trabajos(id_trabajo);


--
-- TOC entry 5512 (class 2606 OID 43242)
-- Name: inspecciones inspecciones_id_inspector_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspecciones
    ADD CONSTRAINT inspecciones_id_inspector_fkey FOREIGN KEY (id_inspector) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5513 (class 2606 OID 43237)
-- Name: inspecciones inspecciones_id_supervisor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspecciones
    ADD CONSTRAINT inspecciones_id_supervisor_fkey FOREIGN KEY (id_supervisor) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5514 (class 2606 OID 43232)
-- Name: inspecciones inspecciones_id_trabajador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspecciones
    ADD CONSTRAINT inspecciones_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.perfiles_trabajador(id_usuario);


--
-- TOC entry 5551 (class 2606 OID 43776)
-- Name: notificaciones notificaciones_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;


--
-- TOC entry 5519 (class 2606 OID 43324)
-- Name: ofertas ofertas_id_solicitud_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ofertas
    ADD CONSTRAINT ofertas_id_solicitud_fkey FOREIGN KEY (id_solicitud) REFERENCES public.solicitudes_servicio(id_solicitud);


--
-- TOC entry 5520 (class 2606 OID 43329)
-- Name: ofertas ofertas_id_trabajador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ofertas
    ADD CONSTRAINT ofertas_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.perfiles_trabajador(id_usuario);


--
-- TOC entry 5530 (class 2606 OID 43494)
-- Name: pagos pagos_id_trabajo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_id_trabajo_fkey FOREIGN KEY (id_trabajo) REFERENCES public.trabajos(id_trabajo);


--
-- TOC entry 5550 (class 2606 OID 43754)
-- Name: parametros_sistema parametros_sistema_id_modificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parametros_sistema
    ADD CONSTRAINT parametros_sistema_id_modificado_por_fkey FOREIGN KEY (id_modificado_por) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5504 (class 2606 OID 43131)
-- Name: perfiles_trabajador perfiles_trabajador_id_supervisor_revisor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_trabajador
    ADD CONSTRAINT perfiles_trabajador_id_supervisor_revisor_fkey FOREIGN KEY (id_supervisor_revisor) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5505 (class 2606 OID 43126)
-- Name: perfiles_trabajador perfiles_trabajador_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_trabajador
    ADD CONSTRAINT perfiles_trabajador_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE RESTRICT;


--
-- TOC entry 5539 (class 2606 OID 43633)
-- Name: reclamo_evidencias reclamo_evidencias_id_reclamo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reclamo_evidencias
    ADD CONSTRAINT reclamo_evidencias_id_reclamo_fkey FOREIGN KEY (id_reclamo) REFERENCES public.reclamos(id_reclamo) ON DELETE RESTRICT;


--
-- TOC entry 5536 (class 2606 OID 43614)
-- Name: reclamos reclamos_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reclamos
    ADD CONSTRAINT reclamos_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5537 (class 2606 OID 43619)
-- Name: reclamos reclamos_id_supervisor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reclamos
    ADD CONSTRAINT reclamos_id_supervisor_fkey FOREIGN KEY (id_supervisor) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5538 (class 2606 OID 43609)
-- Name: reclamos reclamos_id_trabajo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reclamos
    ADD CONSTRAINT reclamos_id_trabajo_fkey FOREIGN KEY (id_trabajo) REFERENCES public.trabajos(id_trabajo);


--
-- TOC entry 5518 (class 2606 OID 43295)
-- Name: solicitud_fotos solicitud_fotos_id_solicitud_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitud_fotos
    ADD CONSTRAINT solicitud_fotos_id_solicitud_fkey FOREIGN KEY (id_solicitud) REFERENCES public.solicitudes_servicio(id_solicitud) ON DELETE RESTRICT;


--
-- TOC entry 5529 (class 2606 OID 43467)
-- Name: solicitudes_finalizacion solicitudes_finalizacion_id_trabajo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_finalizacion
    ADD CONSTRAINT solicitudes_finalizacion_id_trabajo_fkey FOREIGN KEY (id_trabajo) REFERENCES public.trabajos(id_trabajo);


--
-- TOC entry 5515 (class 2606 OID 43276)
-- Name: solicitudes_servicio solicitudes_servicio_id_categoria_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_servicio
    ADD CONSTRAINT solicitudes_servicio_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categorias_servicio(id_categoria);


--
-- TOC entry 5516 (class 2606 OID 43271)
-- Name: solicitudes_servicio solicitudes_servicio_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_servicio
    ADD CONSTRAINT solicitudes_servicio_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5517 (class 2606 OID 43281)
-- Name: solicitudes_servicio solicitudes_servicio_id_zona_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes_servicio
    ADD CONSTRAINT solicitudes_servicio_id_zona_fkey FOREIGN KEY (id_zona) REFERENCES public.zonas(id_zona);


--
-- TOC entry 5547 (class 2606 OID 43735)
-- Name: suspensiones suspensiones_id_reclamo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suspensiones
    ADD CONSTRAINT suspensiones_id_reclamo_fkey FOREIGN KEY (id_reclamo) REFERENCES public.reclamos(id_reclamo);


--
-- TOC entry 5548 (class 2606 OID 43740)
-- Name: suspensiones suspensiones_id_supervisor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suspensiones
    ADD CONSTRAINT suspensiones_id_supervisor_fkey FOREIGN KEY (id_supervisor) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5549 (class 2606 OID 43730)
-- Name: suspensiones suspensiones_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suspensiones
    ADD CONSTRAINT suspensiones_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5507 (class 2606 OID 43167)
-- Name: trabajador_categorias trabajador_categorias_id_categoria_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajador_categorias
    ADD CONSTRAINT trabajador_categorias_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categorias_servicio(id_categoria);


--
-- TOC entry 5508 (class 2606 OID 43162)
-- Name: trabajador_categorias trabajador_categorias_id_trabajador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajador_categorias
    ADD CONSTRAINT trabajador_categorias_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.perfiles_trabajador(id_usuario) ON DELETE CASCADE;


--
-- TOC entry 5509 (class 2606 OID 43179)
-- Name: trabajador_zonas trabajador_zonas_id_trabajador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajador_zonas
    ADD CONSTRAINT trabajador_zonas_id_trabajador_fkey FOREIGN KEY (id_trabajador) REFERENCES public.perfiles_trabajador(id_usuario) ON DELETE CASCADE;


--
-- TOC entry 5510 (class 2606 OID 43184)
-- Name: trabajador_zonas trabajador_zonas_id_zona_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajador_zonas
    ADD CONSTRAINT trabajador_zonas_id_zona_fkey FOREIGN KEY (id_zona) REFERENCES public.zonas(id_zona);


--
-- TOC entry 5525 (class 2606 OID 43395)
-- Name: trabajo_historial_estados trabajo_historial_estados_id_trabajo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajo_historial_estados
    ADD CONSTRAINT trabajo_historial_estados_id_trabajo_fkey FOREIGN KEY (id_trabajo) REFERENCES public.trabajos(id_trabajo) ON DELETE RESTRICT;


--
-- TOC entry 5526 (class 2606 OID 43400)
-- Name: trabajo_historial_estados trabajo_historial_estados_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trabajo_historial_estados
    ADD CONSTRAINT trabajo_historial_estados_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- TOC entry 5502 (class 2606 OID 43056)
-- Name: usuario_roles usuario_roles_id_rol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.roles(id_rol);


--
-- TOC entry 5503 (class 2606 OID 43051)
-- Name: usuario_roles usuario_roles_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE RESTRICT;


--
-- TOC entry 5527 (class 2606 OID 43420)
-- Name: visitas_previas visitas_previas_id_oferta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitas_previas
    ADD CONSTRAINT visitas_previas_id_oferta_fkey FOREIGN KEY (id_oferta) REFERENCES public.ofertas(id_oferta);


-- Completed on 2026-11-24 10:45:16

--
-- PostgreSQL database dump complete
--

\unrestrict hIUCO29XOZ7JrNn0NWKeJTC67zra6kayMf23bet18yAD5qLejQkteds1F2WZZpU

