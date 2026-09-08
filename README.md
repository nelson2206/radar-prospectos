# Radar de Prospectos

Herramienta para preparar primeras reuniones comerciales de Minsait Business Consulting Perú. Se le dan cuatro datos y devuelve dos láminas: quiénes son y dónde les duele, y cómo entramos.

Quien la usa **no necesita licencia de Claude**: basta con el enlace. La investigación corre contra la API de Claude con búsqueda web, y la clave vive solo en el servidor.

## Qué pide y qué devuelve

Se ingresan cuatro cosas: empresa, nombre y apellido de la persona, su cargo y, si se quiere, la oferta a posicionar. Todo lo demás lo decide el agente.

**Lámina 1.** Perfil de la empresa en tres líneas, tres o cuatro cifras clave con su fuente, la lectura financiera en una frase, y de dos a tres dolores con evidencia fechada, impacto estimado y el servicio que aplica.

**Lámina 2.** La hipótesis de valor, las cinco preguntas para la reunión, quién es la persona con sus rompehielos, el tema a evitar con su salida, el siguiente paso, el nivel de confianza, lo que quedó sin verificar y las fuentes.

El botón de descarga produce un PDF de dos páginas.

## Cómo está desplegado

Son dos piezas, porque GitHub Pages solo sirve archivos estáticos y no puede guardar una clave de API:

| Pieza | Dónde vive | Qué hace |
|---|---|---|
| `docs/index.html` | GitHub Pages | El formulario y las láminas |
| `api/investigar.js` | Vercel | Llama a la API de Claude. Guarda la clave |

La página pide los datos al servicio y pinta el resultado. La clave nunca llega al navegador.

## Poner en marcha el servicio

Hace falta una cuenta de Vercel y una clave de la API desde `console.anthropic.com`.

```bash
npm install
npx vercel --prod
```

Vercel devuelve una dirección terminada en `.vercel.app`. Configura estas variables en su panel, bajo Settings y Environment Variables:

| Variable | Obligatoria | Para qué |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sí | La clave de la API |
| `ACCESS_CODE` | Recomendada | Código compartido con el equipo. Sin él, cualquiera con el enlace gasta tu saldo |
| `ALLOWED_ORIGIN` | Recomendada | La dirección de tu GitHub Pages. Impide que otra web use tu servicio |

Vuelve a desplegar después de configurarlas.

## Conectar la página con el servicio

Abre `docs/index.html`, busca la línea `var API_BASE = "";` y pon ahí la dirección de Vercel:

```javascript
var API_BASE = "https://tu-despliegue.vercel.app";
```

Sube el cambio y listo: el equipo solo abre el enlace y usa la herramienta.

Mientras esa línea esté vacía, la página muestra un recuadro para pegar la dirección a mano, que queda guardada en ese navegador. Sirve para probar, no para repartir.

## Cuánto cuesta

Cada investigación hace hasta catorce búsquedas web y dos llamadas al modelo. El costo típico va de **medio dólar a dos dólares**, según cuánta información pública exista de la empresa. Se paga por uso a Anthropic. Conviene fijar un límite de gasto mensual en su consola si el equipo la usa a diario.

## Dos cosas que hay que saber

**Tarda.** Entre uno y tres minutos. La página muestra el avance en vivo. En el plan gratuito de Vercel las funciones se cortan al minuto salvo que actives Fluid Compute; con el plan Pro y los 300 segundos que fija `vercel.json` no hay problema. Si ves cortes al minuto exacto, esa es la causa.

**Es preparación, no una fuente.** El agente cita fuentes públicas y declara lo que no pudo verificar, pero las cifras se confirman antes de ponerlas frente a un cliente. La lámina lo dice.

## Sobre la persona

La investigación se limita a información pública y profesional: trayectoria, cargo, antigüedad, declaraciones públicas y qué decide. No recoge datos personales, familiares ni patrimoniales, y no extrae perfiles de redes profesionales de forma automatizada. Si la persona aparece nombrada en un asunto abierto, no se convierte en argumento de venta: aparece solo como tema a evitar, en una línea neutra y sin repetir la acusación. Esto cumple la Ley 29733.

## El método

El agente sigue el mismo método que el skill `radar-de-prospectos` de Claude Code: encuadre con hipótesis, reencuadre si aparece un cambio de control, finanzas con fuente y fecha, dolores con evidencia doble, y la persona bajo reglas estrictas. Empieza siempre por los informes de las clasificadoras de riesgo, que traen los ratios ya calculados.
