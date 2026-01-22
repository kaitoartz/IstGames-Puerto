// =============================================================================
// CONFIGURACIÓN DEL JUEGO - CAMINO SEGURO
// Aqui puedes modificar todo el contenido del juego.
// =============================================================================

const CONFIG = {
    // 1. CONFIGURACIÓN DEL MAPA
    // AHORA SE DEFINE DENTRO DE "LEVELS" (VER ABAJO)

    // 1.1 CONFIGURACIÓN DE SPRITES (IMÁGENES)
    // Si defines una URL aquí, el juego intentará cargar la imagen.
    // Si la dejas en null o bloqueas la carga, usará los colores definidos abajo.
    SPRITES: {
        PLAYER: 'sprites/player.png',
        FORKLIFT: 'sprites/forklift.png',
        TRUCK: 'sprites/truck.png',
        WALLS: [
            'sprites/container_1.jpg',
            'sprites/container_2.jpg',
            'sprites/container_3.jpg'
        ],
        FLOOR: 'sprites/floor.jpg',
        GOAL: null,       // Ej: 'assets/meta.png'
        STOP_SIGN: 'sprites/sign-stop.png', // Nuevo asset
        BOX: 'sprites/box.png'    // Caja como obstáculo
    },

    // 2. CONFIGURACIÓN DE COLORES Y ASSETS
    // Puedes usar nombres de colores (red, blue), códigos HEX (#ff0000) o dejar en null si usas imágenes.
    COLORS: {
        WALL: 'black',        // Fallback color
        PATH: 'white',        // Color del camino
        START_TEXT: '#4a1a5e',// Color flecha inicio
        END_ZONE: '#cf4286',  // Color zona meta
        HAZARD_SIGN: '#d32f2f',// Fallback color PARE (rojo)
        WARNING_SIGN: '#FFC107'// Fallback color advertencia (amarillo)
    },

    // 3. JUGADOR (EL TRABAJADOR)
    PLAYER: {
        COLOR_BODY: 'purple', // Solicitado: círculo morado temporal
        COLOR_HELMET: '#ffcc00', // Color del casco
        // La posición inicial se define automáticamente buscando el "2" en el mapa del nivel.
    },

    // 4. ENEMIGOS
    // Se definen en cada nivel.

    // Colores para enemigos
    ENEMY_COLORS: {
        FORKLIFT: '#ff9900', // Naranja para grúas
        TRUCK: '#cc3333'     // Rojo para camiones
    },

    // 5. MENSAJES DE TEXTO
    TEXTS: {
        GAME_OVER_TITLE: "Incidente Reportado",
        GAME_OVER_MSG_HAZARD: "¡Cuidado! Entraste a una zona de riesgo prohibida.",
        GAME_OVER_MSG_COLLISION: "¡Atención! Te acercaste demasiado a una máquina en movimiento.",
        WIN_TITLE: "¡Misión Cumplida!",
        WIN_MSG: "¡Excelente! Has completado el recorrido de forma segura.",
        LEVEL_COMPLETED_TITLE: "¡Nivel Superado!",
        LEVEL_COMPLETED_MSG: "Has completado esta zona de forma segura. ¿Listo para el siguiente desafío?",
        TIP_WIN: "Recuerda: La seguridad es tarea de todos. ¡Sigue así!",
        TIP_LOSE: "Consejo: Mantente alerta a la señalización y los equipos en tu entorno.",
        
        // Mensajes de Señales
        SIGN_SAFE: "¡Buen trabajo! Este camino es más largo, pero mucho más seguro.",
        SIGN_STOP: "⚠️ PARE: Zona de precaución. Mantente alerta y procede con cuidado.",
        SIGN_WARNING: "⚠️ PELIGRO: Tráfico intenso y obstáculos. ¿Seguro que quieres pasar por aquí?"
    },

    // 6. AJUSTES GENERALES
    SETTINGS: {
        TILE_SIZE: 40,      // Tamaño de cada cuadro (px)
        GAME_SPEED: 150,    // Velocidad de enemigos (ms por movimiento)
        ENABLE_TIMER: true  // Activar cronómetro en pantalla
    },

    // 7. CABECERA (LOGOS)
    HEADER: {
        LEFT_LOGO: 'shield',
        RIGHT_LOGO: 'ist',
        TITLE: "Desbloquea el Camino Seguro"
    },

    // 8. CONFIGURACIÓN DE AUDIO
    AUDIO: {
        STEP: { freq: 150, type: 'triangle', duration: 0.05, vol: 0.05 },
        BUMP: { freq: 100, type: 'square', duration: 0.1, vol: 0.1 },
        LOSE: [
            { freq: 300, type: 'sawtooth', duration: 0.5, vol: 0.2, delay: 0 },
            { freq: 212, type: 'sawtooth', duration: 0.8, vol: 0.2, delay: 200 }
        ],
        WIN: [
            { freq: 523.25, type: 'sine', duration: 0.2, vol: 0.2, delay: 0 },
            { freq: 659.25, type: 'sine', duration: 0.2, vol: 0.2, delay: 150 },
            { freq: 783.99, type: 'sine', duration: 0.4, vol: 0.2, delay: 300 },
            { freq: 1046.50, type: 'sine', duration: 0.6, vol: 0.2, delay: 450 }
        ]
    },

    // 9. CONFIGURACIÓN DEL CRONÓMETRO
    TIMER: {
        COLOR: '#333',
        FONT: 'bold 20px Roboto'
    },

    // 10. NIVELES DEL JUEGO
    LEVELS: [
        {
            NAME: "Nivel 1: La Decisión Segura",
            // 0: Camino, 1: Pared, 2: Inicio, 3: Meta, 4: Peligro, 5: Señal
            // Final Polish of the Map Matrix for the User Request:
            // Left Path: Cols 1-3, goes down, loops bottom. Safe.
            // Right Path: Cols 10-15. Direct to goal. Hazards (4). Enemies.
           NAME: "Nivel 1: La Decisión Segura",
// 0: Camino, 1: Pared, 2: Inicio, 3: Meta, 4: Peligro, 5: Señal
NAME: "Nivel 1: Almacén e Industrias",
MAP: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [2, 0, 0, 7, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 1, 1],
    [1, 1, 0, 1, 6, 1, 0, 1, 1, 1, 1, 0, 1, 0, 7, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 4, 0, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 1, 1, 7, 1, 0, 1, 1, 1, 0, 1, 0, 0, 3],
    [1, 0, 0, 4, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1],
    [1, 1, 0, 1, 1, 0, 7, 0, 1, 1, 1, 4, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 5, 1, 1, 7, 1, 1, 1, 0, 1, 0, 0, 0, 1, 5, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
],


            ENEMIES: [
    { x: 10, y: 1, type: 'forklift', dx: 0.5, dy: 0, minX: 7, maxX: 13 }, // obstaculiza camino corto
    { x: 5 , y: 5, type: 'truck', dx: 0, dy: 1, minY: 5, maxY: 9 },     // cruza verticalmente
    { x: 5, y: 5, type: 'forklift', dx: 0.5, dy: 0, minX: 3, maxX: 8 },    // interfiere si el jugador duda
    { x: 11, y: 6, type: 'truck', dx: 0, dy: 1, minY: 0, maxY: 6 },
    { x: 15, y: 1, type: 'truck', dx: 0, dy: 1, minY: 0, maxY: 6 }      // cerca del final peligroso (vertical)
]



        },
        // Nivel 2: Un poco más difícil
        /*{
            NAME: "Nivel 2: Operaciones Nocturnas",
            MAP: [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
                [1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
                [1, 0, 0, 0, 0, 0, 0, 0, 1, 4, 1, 4, 1, 0, 0, 0, 0, 1, 0, 1],
                [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
                [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
                [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 1, 0, 1],
                [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
                [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 3],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ],
            ENEMIES: [
                { x: 3, y: 1, type: 'forklift', dx: 1, dy: 0, minX: 3, maxX: 10 },
                { x: 10, y: 5, type: 'truck', dx: 0, dy: 1, minY: 5, maxY: 9 },
                { x: 14, y: 3, type: 'forklift', dx: 1, dy: 0, minX: 13, maxX: 16 }
            ]
        }*/
    ]
};
