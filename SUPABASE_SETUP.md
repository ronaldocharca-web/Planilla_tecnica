# Configurar códigos de revisión globales

La aplicación es estática (GitHub Pages), así que para que varias personas reciban números únicos necesita un contador central. Supabase guardará únicamente un número consecutivo por año; los informes siguen generándose en el navegador y no se envían a Supabase.

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. En el panel del proyecto, abre **SQL Editor**, crea una consulta, pega el contenido de `supabase/report-counter.sql` y ejecútala.
3. En **Project Settings → API**, copia el **Project URL** y la **publishable key** (o la `anon` key heredada).
4. Abre `supabase-config.js` y coloca esos dos valores en `url` y `apiKey`.
5. Guarda y publica los cambios en GitHub Pages. Abre la página y confirma que bajo el código aparezca “Código único asignado globalmente”.

No uses ni publiques una `service_role` key o una secret key. La configuración del navegador debe contener solamente el Project URL y una publishable/anon key. Si Supabase no está configurado, el formulario deja escribir un código manual y muestra una advertencia: esos códigos no se garantizan únicos.

Los números se reservan de forma atómica en la base de datos. Si alguien recarga o abandona un formulario después de recibir un número, puede quedar un salto en la secuencia; no se reutilizan números ya reservados.
