# Configurar códigos de revisión globales

La aplicación es estática (GitHub Pages), así que para que varias personas reciban números únicos necesita un contador central. Supabase guardará únicamente un número consecutivo por año; los informes siguen generándose en el navegador y no se envían a Supabase.

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. En el panel del proyecto, abre **SQL Editor**, crea una consulta, pega el contenido de `supabase/report-counter.sql` y ejecútala.
3. En **Project Settings → API**, copia el **Project URL** y la **publishable key** (o la `anon` key heredada).
4. Abre `supabase-config.js` y coloca esos dos valores en `url` y `apiKey`.
5. Si el contador ya estaba configurado, vuelve a ejecutar `supabase/report-counter.sql` en SQL Editor. Esto agrega `peek_report_number` sin reiniciar los números existentes.
6. Guarda y publica los cambios. Al abrir la página debe aparecer el próximo código y el mensaje “Próximo código disponible”.

No uses ni publiques una `service_role` key o una secret key. La configuración del navegador debe contener solamente el Project URL y una publishable/anon key. Si Supabase no está configurado, el formulario deja escribir un código manual y muestra una advertencia: esos códigos no se garantizan únicos.

`peek_report_number` consulta el próximo número sin modificar la base de datos; abrir o refrescar la página no incrementa el contador. Al pulsar **Descargar Word**, `next_report_number` asigna un número único de forma atómica. El Word usa ese número y luego la página consulta y muestra el siguiente disponible.

Si dos personas ven el mismo próximo código, quien descargue primero lo recibe. A la otra persona se le asigna el siguiente al descargar; su Word y el campo de la página muestran el número definitivo. Una descarga fallida después de asignar el número puede dejar un salto en la secuencia.
