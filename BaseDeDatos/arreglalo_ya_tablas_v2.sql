-- =====================================================================
--  ARRÉGLALO YA - Script de creación de TABLAS (versión 2)
--  Basado en el documento oficial (RF-01 a RF-36, RN-01 a RN-19)
--  Sintaxis compatible con PostgreSQL.
--  Solo tablas, claves primarias/foráneas y restricciones (CHECK/UNIQUE).
--  Índices, datos de prueba y parámetros iniciales van en la siguiente etapa
--  (salvo los índices únicos parciales y la vista que son parte de las reglas de integridad).
--
--  Cambios v2: se quita es_urgente; se agregan campos de perfil y presupuesto;
--  nuevas tablas devoluciones y disponibilidad_trabajador; integridad de trabajos/ofertas;
--  una sola oferta aceptada por solicitud; precio total calculado; y política de
--  eliminación lógica de usuarios (se reemplazan ON DELETE CASCADE sobre evidencias).
-- =====================================================================

-- Necesaria para evitar traslapes de horarios en disponibilidad_trabajador
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =====================================================================
--  POLÍTICA DE ELIMINACIÓN: los usuarios NO se borran físicamente.
--  Se desactivan con usuarios.estado = 'eliminada' o 'suspendida' y se conserva
--  todo el historial (pagos, reclamos, evidencias, auditoría).
--  Por eso las FK hacia usuarios y hacia registros importantes no usan CASCADE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- BLOQUE 1: USUARIOS, ROLES Y DATOS BANCARIOS (RF-01, RF-02, RF-03)
-- ---------------------------------------------------------------------

-- Roles del sistema: cliente, trabajador, supervisor, super_supervisor, inspector
CREATE TABLE roles (
    id_rol        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        VARCHAR(30)  NOT NULL UNIQUE,
    descripcion   VARCHAR(200)
);

-- Una sola cuenta por persona (permite cambiar de función, RF-02)
CREATE TABLE usuarios (
    id_usuario      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombres         VARCHAR(100) NOT NULL,
    apellidos       VARCHAR(100) NOT NULL,
    correo          VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,           -- nunca la contraseña en texto plano
    telefono        VARCHAR(20)  NOT NULL,           -- usado para el enlace a WhatsApp (RF-36)
    estado          VARCHAR(20)  NOT NULL DEFAULT 'activa'
                    CHECK (estado IN ('activa','suspendida','eliminada')),
    fecha_registro  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Funciones que tiene activas cada usuario
CREATE TABLE usuario_roles (
    id_usuario  INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    id_rol      INT NOT NULL REFERENCES roles(id_rol),
    fecha_alta  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_rol)
);

-- Datos bancarios (obligatorios para trabajadores). Se guardan cifrados (CU-03)
CREATE TABLE datos_bancarios (
    id_dato_bancario   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario         INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,  -- con la baja de cuenta, el backend aplica su política de retención
    banco              VARCHAR(80)  NOT NULL,
    titular            VARCHAR(150) NOT NULL,
    numero_cuenta_cif  VARCHAR(255) NOT NULL,        -- valor cifrado por el backend
    fecha_registro     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- BLOQUE 2: CATÁLOGOS (categorías y zonas) (RF-05, RF-32)
-- ---------------------------------------------------------------------

-- Las 4 categorías: plomería, electricidad, albañilería, electrodomésticos
CREATE TABLE categorias_servicio (
    id_categoria  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        VARCHAR(60) NOT NULL UNIQUE,
    activa        BOOLEAN NOT NULL DEFAULT TRUE
);

-- Zonas / OTB gestionadas por el supervisor
CREATE TABLE zonas (
    id_zona  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre   VARCHAR(100) NOT NULL UNIQUE,
    activa   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------
-- BLOQUE 3: TRABAJADOR, VERIFICACIÓN E INSPECCIONES (RF-04, RF-05, RF-09, RF-10)
-- ---------------------------------------------------------------------

CREATE TABLE perfiles_trabajador (
    id_usuario          INT PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    carnet_identidad    VARCHAR(20) NOT NULL UNIQUE,
    descripcion         VARCHAR(1000),                 -- presentación del trabajador
    anios_experiencia   SMALLINT NOT NULL DEFAULT 0
                        CHECK (anios_experiencia BETWEEN 0 AND 60),
    foto_perfil         VARCHAR(300),                  -- ruta del archivo de la foto
    estado_verificacion VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                        CHECK (estado_verificacion IN ('pendiente','observado','aprobado','rechazado','suspendido')),
    calificacion_promedio NUMERIC(3,2) NOT NULL DEFAULT 0,
    total_calificaciones  INT NOT NULL DEFAULT 0,
    id_supervisor_revisor INT REFERENCES usuarios(id_usuario),
    fecha_decision      TIMESTAMP,
    motivo_rechazo      VARCHAR(300),
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Carnet y certificado de antecedentes (archivo guardado en almacenamiento privado)
CREATE TABLE documentos_trabajador (
    id_documento   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajador  INT NOT NULL REFERENCES perfiles_trabajador(id_usuario) ON DELETE RESTRICT,  -- evidencia de verificación
    tipo           VARCHAR(30) NOT NULL CHECK (tipo IN ('carnet','antecedentes','otro')),
    ruta_archivo   VARCHAR(300) NOT NULL,
    fecha_subida   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Habilidades del trabajador con su precio estimado orientativo
CREATE TABLE trabajador_categorias (
    id_trabajador   INT NOT NULL REFERENCES perfiles_trabajador(id_usuario) ON DELETE CASCADE,
    id_categoria    INT NOT NULL REFERENCES categorias_servicio(id_categoria),
    precio_estimado NUMERIC(10,2) CHECK (precio_estimado >= 0),
    PRIMARY KEY (id_trabajador, id_categoria)
);

-- Zonas de cobertura del trabajador (RN-17)
CREATE TABLE trabajador_zonas (
    id_trabajador  INT NOT NULL REFERENCES perfiles_trabajador(id_usuario) ON DELETE CASCADE,
    id_zona        INT NOT NULL REFERENCES zonas(id_zona),
    PRIMARY KEY (id_trabajador, id_zona)
);

-- Días y horarios en los que el trabajador puede atender (agenda disponible, RN-11, RN-17).
-- Es distinta de trabajos.fecha_inicio_prog/fecha_fin_prog, que registran la cita ya contratada.
CREATE TABLE disponibilidad_trabajador (
    id_disponibilidad INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajador     INT NOT NULL REFERENCES perfiles_trabajador(id_usuario) ON DELETE CASCADE,
    dia_semana        SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),  -- 1 = lunes ... 7 = domingo (ISO)
    hora_inicio       TIME NOT NULL,
    hora_fin          TIME NOT NULL,
    activa            BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (hora_fin > hora_inicio),
    -- Un trabajador no puede tener dos bloques que se traslapen el mismo día
    CONSTRAINT ex_disponibilidad_sin_traslape
        EXCLUDE USING gist (
            id_trabajador WITH =,
            dia_semana    WITH =,
            tsrange(TIMESTAMP '2000-01-01' + hora_inicio,
                    TIMESTAMP '2000-01-01' + hora_fin) WITH &&
        )
);

-- Visitas de inspección; el costo lo paga el trabajador (RN-10)
CREATE TABLE inspecciones (
    id_inspeccion      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajador      INT NOT NULL REFERENCES perfiles_trabajador(id_usuario),
    id_supervisor      INT NOT NULL REFERENCES usuarios(id_usuario),
    id_inspector       INT NOT NULL REFERENCES usuarios(id_usuario),
    fecha_programada   TIMESTAMP NOT NULL,
    estado             VARCHAR(20) NOT NULL DEFAULT 'programada'
                       CHECK (estado IN ('programada','realizada','reprogramada')),
    resultado          VARCHAR(500),
    costo_transporte   NUMERIC(10,2) CHECK (costo_transporte >= 0),
    fecha_registro     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- BLOQUE 4: SOLICITUDES Y OFERTAS (RF-11, RF-13, RF-14, RF-15)
-- ---------------------------------------------------------------------

CREATE TABLE solicitudes_servicio (
    id_solicitud     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente       INT NOT NULL REFERENCES usuarios(id_usuario),
    id_categoria     INT NOT NULL REFERENCES categorias_servicio(id_categoria),
    id_zona          INT NOT NULL REFERENCES zonas(id_zona),
    descripcion      TEXT NOT NULL,
    direccion_exacta VARCHAR(250) NOT NULL,           -- no se muestra en búsquedas, solo la zona
    fecha_deseada    TIMESTAMP NOT NULL,
    presupuesto_aproximado NUMERIC(10,2) CHECK (presupuesto_aproximado > 0),  -- opcional: lo que el cliente piensa pagar
    estado           VARCHAR(20) NOT NULL DEFAULT 'abierta'
                     CHECK (estado IN ('abierta','contratada','vencida','cancelada')),
    fecha_publicacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento TIMESTAMP NOT NULL,             -- publicación + 30 días (RN-09)
    UNIQUE (id_solicitud, id_cliente)                 -- permite verificar que el trabajo use el cliente dueño de la solicitud
);

CREATE TABLE solicitud_fotos (
    id_foto       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud  INT NOT NULL REFERENCES solicitudes_servicio(id_solicitud) ON DELETE RESTRICT,  -- puede ser evidencia en un reclamo
    ruta_archivo  VARCHAR(300) NOT NULL
);

CREATE TABLE ofertas (
    id_oferta        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud     INT NOT NULL REFERENCES solicitudes_servicio(id_solicitud),
    id_trabajador    INT NOT NULL REFERENCES perfiles_trabajador(id_usuario),
    precio_estimado  NUMERIC(10,2) NOT NULL CHECK (precio_estimado > 0),
    comentario       VARCHAR(500),
    requiere_visita  BOOLEAN NOT NULL DEFAULT FALSE,
    estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente','aceptada','rechazada','vencida')),
    fecha_envio      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_solicitud, id_trabajador),              -- una oferta por trabajador y solicitud
    UNIQUE (id_oferta, id_solicitud, id_trabajador)    -- permite verificar la coherencia desde trabajos
);

-- Una solicitud no puede tener dos ofertas aceptadas a la vez.
-- En el backend, aceptar una oferta debe hacerse en UNA transacción:
--   1) SELECT ... FROM solicitudes_servicio WHERE id_solicitud = $1 FOR UPDATE;
--   2) UPDATE ofertas SET estado='aceptada' WHERE id_oferta = $2;
--   3) UPDATE ofertas SET estado='rechazada' WHERE id_solicitud = $1 AND id_oferta <> $2 AND estado='pendiente';
--   4) INSERT INTO trabajos ...; UPDATE solicitudes_servicio SET estado='contratada';
CREATE UNIQUE INDEX uq_una_oferta_aceptada_por_solicitud
    ON ofertas (id_solicitud)
    WHERE estado = 'aceptada';

-- ---------------------------------------------------------------------
-- BLOQUE 5: TRABAJOS, VISITAS PREVIAS E INCREMENTOS (RF-16 a RF-20, RF-21)
-- ---------------------------------------------------------------------

-- Se crea cuando el cliente acepta una oferta (RN-01)
CREATE TABLE trabajos (
    id_trabajo         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_oferta          INT NOT NULL UNIQUE,
    id_solicitud       INT NOT NULL,
    id_cliente         INT NOT NULL,
    id_trabajador      INT NOT NULL,
    precio_final       NUMERIC(10,2) NOT NULL CHECK (precio_final > 0),
    metodo_pago        VARCHAR(20) NOT NULL DEFAULT 'plataforma'
                       CHECK (metodo_pago IN ('plataforma','qr','efectivo')),
    fecha_inicio_prog  TIMESTAMP,                      -- agenda del trabajador (RN-11, RN-17)
    fecha_fin_prog     TIMESTAMP,
    estado             VARCHAR(25) NOT NULL DEFAULT 'pendiente_anticipo'
                       CHECK (estado IN ('pendiente_anticipo','programado','en_camino','en_proceso',
                                         'terminado','cancelado','en_reclamo')),
    fecha_creacion     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre       TIMESTAMP,                      -- desde aquí corren los 7 días de reclamo (RN-07)
    CHECK (fecha_fin_prog IS NULL OR fecha_fin_prog > fecha_inicio_prog),

    -- La oferta, la solicitud y el trabajador deben corresponder entre sí
    CONSTRAINT fk_trabajo_oferta_coherente
        FOREIGN KEY (id_oferta, id_solicitud, id_trabajador)
        REFERENCES ofertas (id_oferta, id_solicitud, id_trabajador),
    -- La solicitud debe pertenecer al cliente indicado
    CONSTRAINT fk_trabajo_solicitud_cliente
        FOREIGN KEY (id_solicitud, id_cliente)
        REFERENCES solicitudes_servicio (id_solicitud, id_cliente),
    CONSTRAINT fk_trabajo_cliente FOREIGN KEY (id_cliente) REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_trabajo_trabajador FOREIGN KEY (id_trabajador) REFERENCES perfiles_trabajador(id_usuario),

    -- Para que otras tablas verifiquen que cliente y trabajador son los del trabajo
    UNIQUE (id_trabajo, id_cliente, id_trabajador),
    UNIQUE (id_trabajo, id_cliente)
);

-- Una solicitud solo puede tener un trabajo vigente (se permite uno nuevo si el anterior se canceló)
CREATE UNIQUE INDEX uq_un_trabajo_vigente_por_solicitud
    ON trabajos (id_solicitud)
    WHERE estado <> 'cancelado';

-- Historial de cambios de estado (trazabilidad, RNF-07)
CREATE TABLE trabajo_historial_estados (
    id_historial   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo     INT NOT NULL REFERENCES trabajos(id_trabajo) ON DELETE RESTRICT,  -- trazabilidad: no se borra
    estado_anterior VARCHAR(25),
    estado_nuevo   VARCHAR(25) NOT NULL,
    id_usuario     INT REFERENCES usuarios(id_usuario),   -- quién hizo el cambio (NULL = sistema)
    fecha_cambio   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Visita previa de evaluación (RF-16)
CREATE TABLE visitas_previas (
    id_visita          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_oferta          INT NOT NULL REFERENCES ofertas(id_oferta),
    fecha_propuesta    TIMESTAMP NOT NULL,
    aceptada_cliente   BOOLEAN,
    resultado          VARCHAR(500),
    precio_definitivo  NUMERIC(10,2) CHECK (precio_definitivo > 0),
    estado             VARCHAR(20) NOT NULL DEFAULT 'propuesta'
                       CHECK (estado IN ('propuesta','aceptada','realizada','precio_aceptado','cancelada'))
);

-- Solicitudes de incremento de precio (RN-05)
CREATE TABLE incrementos_precio (
    id_incremento    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo       INT NOT NULL REFERENCES trabajos(id_trabajo),
    monto_adicional  NUMERIC(10,2) NOT NULL CHECK (monto_adicional > 0),
    justificacion    VARCHAR(500) NOT NULL,
    estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente','aceptado','rechazado')),
    fecha_solicitud  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta  TIMESTAMP
);

-- Solo un incremento pendiente por trabajo a la vez
CREATE UNIQUE INDEX uq_un_incremento_pendiente_por_trabajo
    ON incrementos_precio (id_trabajo)
    WHERE estado = 'pendiente';

-- El precio total NO se guarda: se calcula siempre a partir de los incrementos aceptados,
-- así nunca queda desactualizado (reemplaza a la columna trabajos.precio_incrementado).
CREATE VIEW vista_trabajos_precio_total AS
SELECT t.id_trabajo,
       t.precio_final,
       COALESCE(SUM(i.monto_adicional) FILTER (WHERE i.estado = 'aceptado'), 0) AS total_incrementos,
       t.precio_final
         + COALESCE(SUM(i.monto_adicional) FILTER (WHERE i.estado = 'aceptado'), 0) AS precio_total
FROM trabajos t
LEFT JOIN incrementos_precio i ON i.id_trabajo = t.id_trabajo
GROUP BY t.id_trabajo, t.precio_final;

-- Solicitud de "trabajo terminado" (RN-06)
CREATE TABLE solicitudes_finalizacion (
    id_finalizacion  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo       INT NOT NULL REFERENCES trabajos(id_trabajo),
    estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente','aceptada','rechazada')),
    motivo_rechazo   VARCHAR(300),
    fecha_solicitud  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta  TIMESTAMP
);

-- ---------------------------------------------------------------------
-- BLOQUE 6: PAGOS Y CANCELACIONES (RF-22 a RF-26)
-- ---------------------------------------------------------------------

-- Cada movimiento de dinero: anticipo, saldo, liquidación al trabajador, devolución
CREATE TABLE pagos (
    id_pago          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo       INT NOT NULL REFERENCES trabajos(id_trabajo),
    tipo             VARCHAR(20) NOT NULL
                     CHECK (tipo IN ('anticipo','saldo','liquidacion','devolucion')),
    medio            VARCHAR(20) NOT NULL
                     CHECK (medio IN ('plataforma','qr','efectivo')),
    monto            NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    comision         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (comision >= 0),  -- 5% (0 si es efectivo, RN-19)
    estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente','confirmado','rechazado','en_disputa','fallido')),
    referencia_pasarela VARCHAR(100),
    fecha_pago       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_limite     TIMESTAMP                          -- para devoluciones: máx. 3 días (RN-08)
);

CREATE TABLE cancelaciones (
    id_cancelacion   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo       INT NOT NULL REFERENCES trabajos(id_trabajo),
    id_usuario       INT NOT NULL REFERENCES usuarios(id_usuario),   -- quién cancela
    cancelado_por    VARCHAR(20) NOT NULL CHECK (cancelado_por IN ('cliente','trabajador')),
    motivo           VARCHAR(300),
    estado           VARCHAR(20) NOT NULL DEFAULT 'aprobada'
                     CHECK (estado IN ('aprobada','rechazada')),  -- rechazada si el cliente cancela con menos de 2 h (RN-16)
    fecha_solicitud  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- BLOQUE 7: CALIFICACIONES Y RECLAMOS (RF-06, RF-27 a RF-30, RF-29, RF-33)
-- ---------------------------------------------------------------------

CREATE TABLE calificaciones (
    id_calificacion  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo       INT NOT NULL UNIQUE,              -- una calificación pública por trabajo (la hace el cliente)
    id_cliente       INT NOT NULL,
    id_trabajador    INT NOT NULL,
    puntaje          SMALLINT NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
    comentario       VARCHAR(500),
    respuesta_trabajador VARCHAR(500),
    fecha            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_trabajo, id_cliente, id_trabajador)
        REFERENCES trabajos (id_trabajo, id_cliente, id_trabajador)
);

-- Conserva cada cambio de la calificación (RN-15, RF-28)
CREATE TABLE calificaciones_historial (
    id_historial     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_calificacion  INT NOT NULL REFERENCES calificaciones(id_calificacion) ON DELETE RESTRICT,
    puntaje_anterior SMALLINT NOT NULL CHECK (puntaje_anterior BETWEEN 1 AND 5),
    puntaje_nuevo    SMALLINT NOT NULL CHECK (puntaje_nuevo BETWEEN 1 AND 5),
    fecha_cambio     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Calificación interna del cliente (solo visible para administración, RF-30)
CREATE TABLE calificaciones_internas_cliente (
    id_calificacion_int INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo       INT NOT NULL UNIQUE,
    id_trabajador    INT NOT NULL,
    id_cliente       INT NOT NULL,
    puntaje          SMALLINT NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
    nota             VARCHAR(500),
    fecha            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_trabajo, id_cliente, id_trabajador)
        REFERENCES trabajos (id_trabajo, id_cliente, id_trabajador)
);

CREATE TABLE reclamos (
    id_reclamo       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo       INT NOT NULL REFERENCES trabajos(id_trabajo),
    id_cliente       INT NOT NULL REFERENCES usuarios(id_usuario),
    id_supervisor    INT REFERENCES usuarios(id_usuario),
    descripcion      TEXT NOT NULL,
    estado           VARCHAR(20) NOT NULL DEFAULT 'abierto'
                     CHECK (estado IN ('abierto','en_revision','resuelto','improcedente')),
    resolucion       VARCHAR(500),                     -- desestimar, devolver dinero, sancionar o suspender
    escalado_super   BOOLEAN NOT NULL DEFAULT FALSE,   -- casos graves al super supervisor
    fecha_reclamo    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP
);

CREATE TABLE reclamo_evidencias (
    id_evidencia  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reclamo    INT NOT NULL REFERENCES reclamos(id_reclamo) ON DELETE RESTRICT,  -- evidencia: no se borra
    ruta_archivo  VARCHAR(300) NOT NULL
);

-- Solicitudes de devolución: monto, motivo, aprobación y procesamiento (RN-08).
-- El movimiento de dinero real queda en pagos (tipo = 'devolucion'), enlazado por id_pago.
CREATE TABLE devoluciones (
    id_devolucion       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajo          INT NOT NULL,
    id_cliente          INT NOT NULL,                       -- quien recibe la devolución
    id_reclamo          INT REFERENCES reclamos(id_reclamo),  -- si nace de un reclamo (opcional)
    monto               NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    motivo              VARCHAR(500) NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'solicitada'
                        CHECK (estado IN ('solicitada','aprobada','rechazada','procesada','fallida')),
    fecha_solicitud     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Aprobación
    id_aprobado_por     INT REFERENCES usuarios(id_usuario),  -- supervisor que decide
    fecha_aprobacion    TIMESTAMP,
    motivo_rechazo      VARCHAR(300),
    -- Procesamiento
    id_pago             INT UNIQUE REFERENCES pagos(id_pago),  -- pago tipo 'devolucion' generado
    fecha_procesamiento TIMESTAMP,
    FOREIGN KEY (id_trabajo, id_cliente)
        REFERENCES trabajos (id_trabajo, id_cliente) ON DELETE RESTRICT,
    -- Coherencia entre estado y datos registrados
    CHECK (estado NOT IN ('aprobada','procesada','fallida')
           OR (id_aprobado_por IS NOT NULL AND fecha_aprobacion IS NOT NULL)),
    CHECK (estado <> 'rechazada' OR (id_aprobado_por IS NOT NULL AND motivo_rechazo IS NOT NULL)),
    CHECK (estado <> 'procesada' OR (id_pago IS NOT NULL AND fecha_procesamiento IS NOT NULL))
);

-- ---------------------------------------------------------------------
-- BLOQUE 8: INCIDENTES Y SUSPENSIONES (RF-07, RF-08, RN-12, RN-13, RN-18)
-- ---------------------------------------------------------------------

-- Cancelaciones o atrasos del trabajador que suman para suspender
CREATE TABLE incidentes_trabajador (
    id_incidente   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajador  INT NOT NULL REFERENCES perfiles_trabajador(id_usuario),
    id_trabajo     INT NOT NULL REFERENCES trabajos(id_trabajo),
    tipo           VARCHAR(20) NOT NULL CHECK (tipo IN ('cancelacion','atraso')),
    anulado        BOOLEAN NOT NULL DEFAULT FALSE,     -- el supervisor puede anular uno injustificado
    id_supervisor_anula INT REFERENCES usuarios(id_usuario),
    fecha          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suspensiones (
    id_suspension  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario     INT NOT NULL REFERENCES usuarios(id_usuario),
    tipo           VARCHAR(20) NOT NULL CHECK (tipo IN ('voluntaria','automatica','sancion')),
    motivo         VARCHAR(300),
    dias_duracion  INT NOT NULL CHECK (dias_duracion > 0),   -- 30 voluntaria; 1,2,3,5... Fibonacci
    fecha_inicio   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin      TIMESTAMP NOT NULL,
    estado         VARCHAR(20) NOT NULL DEFAULT 'vigente'
                   CHECK (estado IN ('vigente','finalizada','reactivada','cuenta_eliminada')),
    id_reclamo     INT REFERENCES reclamos(id_reclamo),
    id_supervisor  INT REFERENCES usuarios(id_usuario)
);

-- ---------------------------------------------------------------------
-- BLOQUE 9: CONFIGURACIÓN, NOTIFICACIONES Y AUDITORÍA (RF-34, RF-35, RNF-07)
-- ---------------------------------------------------------------------

-- Parámetros ajustables por el super supervisor: comisión 5%, anticipo 25%, plazos, umbral de incidentes
CREATE TABLE parametros_sistema (
    clave          VARCHAR(50) PRIMARY KEY,
    valor          VARCHAR(100) NOT NULL,
    descripcion    VARCHAR(200),
    id_modificado_por INT REFERENCES usuarios(id_usuario),
    fecha_modificacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notificaciones (
    id_notificacion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario      INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    tipo            VARCHAR(40) NOT NULL,              -- nueva_oferta, incremento, pago, suspension, etc.
    mensaje         VARCHAR(300) NOT NULL,
    canal           VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (canal IN ('web','correo','whatsapp')),
    leida           BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_envio     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bitácora de auditoría: quién hizo qué y cuándo (inicios de sesión, precios, pagos, sanciones)
CREATE TABLE bitacora_auditoria (
    id_bitacora    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario     INT REFERENCES usuarios(id_usuario),
    accion         VARCHAR(60) NOT NULL,
    entidad        VARCHAR(60),
    id_entidad     INT,
    detalle        VARCHAR(500),
    fecha          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
--  FIN: 33 tablas (31 originales + devoluciones + disponibilidad_trabajador) y 1 vista
-- =====================================================================
