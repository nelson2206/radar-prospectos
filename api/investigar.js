import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

// La investigación con búsqueda web toma entre uno y tres minutos.
// maxDuration por encima de 60 s requiere plan Pro o Fluid Compute en Vercel.
export const config = { maxDuration: 300 };

const MODEL = 'claude-opus-5';
const MAX_BUSQUEDAS = 14;

/* ---------------------------------------------------------------------------
   Esquema del deck: exactamente lo que se pinta en las dos láminas.
--------------------------------------------------------------------------- */
const Cifra = z.object({
  etiqueta: z.string().describe('Qué mide, en dos o tres palabras. Ej: Ventas 2025'),
  valor: z.string().describe('El número con su unidad. Ej: S/ 2,117 MM'),
  fuente: z.string().describe('Quién lo publica y cuándo. Ej: Memoria anual 2025'),
});

const Dolor = z.object({
  titulo: z.string().describe('El dolor en una frase, en lenguaje del cliente'),
  impacto: z.string().describe('Impacto económico estimado con su supuesto, o "sin cuantificar" si no hay base'),
  evidencia: z.string().describe('El dato que lo prueba, con fuente y fecha'),
  servicio: z.string().describe('Servicio de MBC que aplica'),
});

const DeckSchema = z.object({
  empresa_nombre: z.string(),
  empresa_perfil: z.string().describe('Qué venden, a quién y de qué tamaño. Tres líneas como máximo'),
  cifras: z.array(Cifra).min(3).max(4),
  lectura_financiera: z.string().describe('Una frase: cómo está financieramente y qué le preocupa al director financiero'),
  dolores: z.array(Dolor).min(2).max(3).describe('Ordenados por impacto económico'),
  persona_perfil: z.string().describe('Trayectoria, cuánto lleva en el cargo y qué decide. Dos líneas'),
  rompehielos: z.array(z.string()).min(2).max(3),
  tema_a_evitar: z.string().describe('Qué no mencionar y, tras un punto, cómo salir del tema si el cliente lo saca'),
  hipotesis: z.string().describe('Un párrafo: qué puede lograr la empresa, atacando qué, con qué evidencia'),
  preguntas: z.array(z.string()).length(5).describe('Preguntas abiertas que solo alguien preparado haría'),
  siguiente_paso: z.string().describe('Qué pedimos concretamente al cerrar la reunión'),
  confianza: z.enum(['alta', 'media', 'baja']),
  lagunas: z.array(z.string()).max(3).describe('Lo que no se pudo verificar'),
  fuentes: z.array(z.object({ titulo: z.string(), url: z.string() })).max(8),
});

/* ---------------------------------------------------------------------------
   Instrucciones
--------------------------------------------------------------------------- */
const SISTEMA_INVESTIGACION = `Eres senior manager de Minsait Business Consulting Perú preparando una primera reunión comercial.

Tu trabajo no es investigar a la empresa: es dejar al consultor listo para conducir una reunión de 45 minutos en la que demuestre que entiende el negocio del cliente, haga preguntas que solo alguien preparado haría, y salga con una segunda reunión. Toda la investigación alimenta una sola decisión: con qué hipótesis de valor entramos y qué validamos allí.

MÉTODO

Antes de buscar, clasifica al prospecto (tamaño, propiedad, regulación) para saber qué fuentes van a existir, y escribe tres hipótesis de dónde le duele. Después de las primeras búsquedas, reencuadra: si aparece un cambio de control reciente, un ejecutivo nuevo con menos de 18 meses en el cargo, una emisión de deuda o un plan estratégico recién anunciado, ese hallazgo pasa a ser el eje y hay que rehacer las hipótesis. Un cambio de control obliga a investigar también al comprador.

Investiga, en este orden:
1. La empresa: hitos de 24 meses, grupo económico, primera línea, modelo de negocio y señales de compra.
2. Finanzas: ventas y su crecimiento, margen EBITDA, deuda sobre EBITDA, cobertura de intereses, capital de trabajo y liquidez. Cada cifra con fuente y año. Cierra con una frase sobre cómo está financieramente y qué le preocupa al director financiero.
3. Industria: dos o tres tendencias con impacto concreto sobre este prospecto, nunca genéricas.
4. Competidores: dos o tres directos y dónde el prospecto va por detrás.
5. Dolores: entre dos y tres, ordenados por impacto económico, cada uno con evidencia fechada y un impacto estimado con el supuesto visible.
6. La persona: solo información pública y profesional.

DÓNDE BUSCAR, POR RENDIMIENTO

Empieza por el informe de clasificadora de riesgo (Moody's Local Perú en moodyslocal.com.pe, Apoyo & Asociados en aai.com.pe, Pacific Credit Rating): un solo documento trae varios años de ratios ya calculados, covenants y una sección de riesgos que alimenta los dolores. Después: memorias y hechos de importancia de la Superintendencia del Mercado de Valores, reportes trimestrales del emisor, transcripciones de conferencias de resultados (la mejor fuente sobre el ejecutivo, pública y profesional), reguladores sectoriales con datos por empresa, y prensa económica peruana para fechas y contexto.

Si la empresa no es peruana, usa el regulador de valores de su país. Si no cotiza en bolsa, no habrá estados financieros: trabaja con reguladores sectoriales, comparables del sector y prensa, y marca cada cifra como estimada.

REGLAS INNEGOCIABLES

Ninguna cifra sin fuente y año. Nada de más de doce meses sin advertirlo. No construyas una tendencia con dos puntos de fuentes distintas. Nunca inventes cifras, nombres, citas ni direcciones web: si un dato no aparece, dilo y conviértelo en pregunta para la reunión. Distingue lo que es un hecho de lo que es una estimación tuya.

Sobre la persona: solo trayectoria, cargo, antigüedad, declaraciones públicas y qué decide. Nada de datos personales, familiares, patrimoniales ni de salud. Si aparece nombrada en una investigación o litigio abierto, no lo conviertas en dolor ni lo detalles: menciónalo únicamente como tema a evitar, en una línea neutra, sin repetir la acusación y dejando claro que no hay resolución firme.

Un dolor debe poder resolverse con consultoría y admitir una pregunta en la reunión. Si no cumple ambas cosas, no es un dolor.

Cuando termines, entrega tus hallazgos organizados por los seis puntos del método, con las fuentes y sus direcciones web. Sé conciso: lo que no cambia la conversación comercial, sobra.`;

const SISTEMA_DECK = `Conviertes hallazgos de investigación en una ficha de dos láminas para una primera reunión comercial de Minsait Business Consulting Perú.

Reglas de escritura:
- Cada cifra conserva su fuente y su año. Si una cifra es estimada, dilo en el propio texto.
- Los dolores se escriben en el lenguaje del cliente, no en el de nuestro catálogo. "Necesitan transformación digital" no es un dolor.
- La hipótesis de valor debe ser específica de esta empresa. Si el párrafo serviría para cualquier otra, reescríbelo.
- Las preguntas son abiertas y demuestran preparación. Nada de preguntas cuya respuesta ya está en la ficha.
- El tema a evitar lleva, tras un punto, la salida concreta si el cliente lo saca.
- No inventes nada que no esté en los hallazgos. Si algo falta, decláralo en las lagunas.
- Español de Perú, directo, sin adjetivos de relleno.`;

/* ------------------------------------------------------------------------- */
/**
 * La página vive en GitHub Pages y esta función en Vercel, así que la llamada
 * cruza dominios. ALLOWED_ORIGIN acota quién puede gastar tu saldo de la API:
 * ponlo con la URL exacta de tu GitHub Pages. Sin esa variable se acepta
 * cualquier origen, cómodo para probar y mala idea en producción.
 */
function aplicarCors(req, res) {
  const permitido = process.env.ALLOWED_ORIGIN;
  const origen = req.headers.origin;
  if (!permitido) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origen && permitido.split(',').map((o) => o.trim()).includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  aplicarCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Usa POST.' });
    return;
  }

  const { empresa, persona, cargo, oferta, codigo } = req.body || {};

  if (!empresa || !persona || !cargo) {
    res.status(400).json({ error: 'Faltan la empresa, la persona o su cargo.' });
    return;
  }

  if (process.env.ACCESS_CODE && codigo !== process.env.ACCESS_CODE) {
    res.status(401).json({ error: 'Código de acceso incorrecto.' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Falta configurar ANTHROPIC_API_KEY en el servidor.' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const enviar = (tipo, datos) => {
    res.write(`data: ${JSON.stringify({ tipo, ...datos })}\n\n`);
  };

  // Latido: evita que proxies intermedios corten la conexión mientras Claude investiga.
  const latido = setInterval(() => res.write(': latido\n\n'), 15000);

  try {
    const client = new Anthropic();

    const encargo = [
      `Empresa: ${empresa}`,
      `Persona con la que nos reunimos: ${persona}, ${cargo}`,
      oferta
        ? `Oferta que queremos posicionar: ${oferta}`
        : 'Oferta a posicionar: la que mejor encaje con los dolores que encuentres.',
      '',
      'Investiga y devuelve tus hallazgos siguiendo el método.',
    ].join('\n');

    enviar('progreso', { texto: 'Encuadrando el prospecto' });

    /* ---------- Paso 1: investigación con búsqueda web ---------- */
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      output_config: { effort: 'high' },
      system: SISTEMA_INVESTIGACION,
      tools: [
        {
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: MAX_BUSQUEDAS,
        },
      ],
      messages: [{ role: 'user', content: encargo }],
    });

    let busquedas = 0;
    const fases = [
      'Buscando quiénes son y qué pasó en los últimos dos años',
      'Revisando informes de clasificadora y estados financieros',
      'Calculando deuda, márgenes y capital de trabajo',
      'Mirando la industria y a sus competidores',
      'Identificando dónde le duele',
      'Buscando la trayectoria pública del ejecutivo',
      'Contrastando fuentes',
    ];

    for await (const evento of stream) {
      if (
        evento.type === 'content_block_start' &&
        evento.content_block &&
        evento.content_block.type === 'server_tool_use'
      ) {
        busquedas += 1;
        const fase = fases[Math.min(Math.floor((busquedas - 1) / 2), fases.length - 1)];
        enviar('progreso', { texto: fase, busquedas });
      }
    }

    const investigacion = await stream.finalMessage();

    if (investigacion.stop_reason === 'refusal') {
      throw new Error('La solicitud fue rechazada por los filtros de seguridad del modelo. Revisa los datos ingresados.');
    }

    const hallazgos = investigacion.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n\n')
      .trim();

    if (!hallazgos) {
      throw new Error('La investigación no devolvió resultados legibles.');
    }

    enviar('progreso', { texto: 'Armando las dos láminas', busquedas });

    /* ---------- Paso 2: hallazgos a deck estructurado ---------- */
    const armado = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: 'medium', format: zodOutputFormat(DeckSchema) },
      system: SISTEMA_DECK,
      messages: [
        {
          role: 'user',
          content: `Reunión con ${persona}, ${cargo} de ${empresa}.${oferta ? ` Queremos posicionar: ${oferta}.` : ''}\n\nHALLAZGOS DE LA INVESTIGACIÓN:\n\n${hallazgos}`,
        },
      ],
    });

    if (!armado.parsed_output) {
      throw new Error('No se pudo estructurar el resultado de la investigación.');
    }

    const uso = {
      busquedas,
      tokens_entrada:
        (investigacion.usage?.input_tokens || 0) + (armado.usage?.input_tokens || 0),
      tokens_salida:
        (investigacion.usage?.output_tokens || 0) + (armado.usage?.output_tokens || 0),
    };

    enviar('listo', { deck: armado.parsed_output, uso });
  } catch (error) {
    const mensaje =
      error?.status === 401
        ? 'La clave de la API es inválida. Revisa ANTHROPIC_API_KEY en el servidor.'
        : error?.status === 429
        ? 'Se alcanzó el límite de la API. Espera un momento y vuelve a intentarlo.'
        : error?.message || 'Ocurrió un error durante la investigación.';
    enviar('error', { mensaje });
  } finally {
    clearInterval(latido);
    res.end();
  }
}
