# Radar de Prospectos

Herramienta para preparar primeras reuniones comerciales de Minsait Business Consulting Perú. Se le dan cuatro datos y devuelve dos láminas: quiénes son y dónde les duele, y cómo entramos.

**En vivo:** https://nelson2206.github.io/radar-prospectos/

Quien la usa **no necesita licencia de Claude**: basta con el enlace y el código del equipo.

## Qué pide y qué devuelve

Se ingresan la empresa, el nombre y apellido de la persona, su cargo y, si se quiere, la oferta a posicionar. Todo lo demás lo decide el agente.

**Lámina 1.** Perfil de la empresa en tres líneas, tres o cuatro cifras clave con su fuente, la lectura financiera en una frase, y de dos a tres dolores con evidencia fechada, impacto estimado y el servicio que aplica.

**Lámina 2.** La hipótesis de valor, las cinco preguntas para la reunión, quién es la persona con sus rompehielos, el tema a evitar con su salida, el siguiente paso, el nivel de confianza, lo que quedó sin verificar y las fuentes.

Las fuentes no las escribe el modelo: salen de las citas reales que devuelve la búsqueda web, así que no puede aparecer una dirección inventada. El botón de descarga produce un PDF de dos páginas.

## Cómo funciona

No tiene backend propio. Toda la lógica vive en `docs/index.html`, publicado en GitHub Pages. Las llamadas a Claude pasan por el **intermediario del COE IA en Cloudflare** (`api.mbc-latam.com`), el mismo Worker que usa ProcessIQ. Ese Worker guarda la clave de Anthropic, exige el código del equipo y solo acepta pedidos de páginas autorizadas.

| Pieza | Dónde vive |
|---|---|
| Página, prompts y armado de las láminas | GitHub Pages, este repositorio |
| Clave de Anthropic y control de acceso | Worker `processiq-api` en Cloudflare, repositorio `nelson2206/process-iq`, carpeta `worker/` |

Para que otra página use el mismo intermediario, se agrega su origen a `ALLOWED_ORIGINS` en `process-iq/worker/wrangler.toml` y se vuelve a desplegar.

La investigación hace dos pasos. Primero, Claude Opus 5 investiga con búsqueda web, con hasta doce búsquedas; si la API pausa el turno por ser largo, la página lo retoma sola. Después, un segundo llamado convierte los hallazgos en las dos láminas con salida estructurada.

## Código de acceso

Es el mismo código del equipo que usa ProcessIQ. Se guarda en el navegador de cada persona para no escribirlo cada vez. Si se cambia en el Worker, cambia para las dos herramientas.

## Cuánto cuesta

Se paga por uso a Anthropic, con la misma clave que ProcessIQ. Las búsquedas cuestan diez dólares por cada mil, más los tokens del modelo, que son la parte principal y variable. La primera corrida real da el número exacto. El techo de gasto se fija en la consola de Anthropic.

El gasto de hoy se registra en Pulse como si fuera de ProcessIQ, porque el Worker aún no distingue qué herramienta llama.

## Red de Indra

Desde la red de la oficina, el filtro corporativo bloquea los dominios `*.mbc-latam.com`, incluido el intermediario. Mientras TI no lo libere, la herramienta funciona desde cualquier otra red, pero no desde la oficina. Es el mismo caso de ProcessIQ.

## Sobre la persona

La investigación se limita a información pública y profesional: trayectoria, cargo, antigüedad, declaraciones públicas y qué decide. No recoge datos personales, familiares ni patrimoniales, y no extrae perfiles de redes profesionales de forma automatizada. Si la persona aparece nombrada en un asunto abierto, no se convierte en argumento de venta: aparece solo como tema a evitar, en una línea neutra y sin repetir la acusación. Esto cumple la Ley 29733.

## El método

El agente sigue el mismo método que el skill `radar-de-prospectos` de Claude Code: encuadre con hipótesis, reencuadre si aparece un cambio de control, finanzas con fuente y fecha, dolores con evidencia doble, y la persona bajo reglas estrictas. Empieza siempre por los informes de las clasificadoras de riesgo, que traen los ratios ya calculados.
