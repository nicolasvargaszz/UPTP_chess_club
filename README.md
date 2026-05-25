# UPTP_chess_club

App web estática para administrar un torneo suizo presencial de ajedrez del UPTP Chess Club.

- Emparejamientos suizos automáticos.
- Resultados protegidos por modo administrador local.
- Base de datos local con IndexedDB.
- Backup/importación JSON.
- Interfaz responsive para celular.

## Cómo usar el modo administrador

1. Abrí la página publicada o `index.html` en tu navegador.
2. Tocá el botón **Admin** arriba a la derecha.
3. La primera vez, escribí una clave de al menos 4 caracteres. Esa clave se guarda como hash en la base local del navegador.
4. En las siguientes visitas, tocá **Admin** y escribí la misma clave para desbloquear edición.
5. Con admin activo podés cargar resultados, editar jugadores, generar emparejamientos, importar/exportar backup y cambiar configuración.

## Cómo cargar resultados

1. Entrá como administrador.
2. Andá a **Partidas**.
3. En la partida pendiente elegí `1-0`, `0-1` o `0.5-0.5`.
4. Tocá **Guardar**.
5. Cuando ya no haya partidas pendientes, la app puede generar la siguiente ronda suiza automáticamente si la opción **Auto emparejar** está activa en **Base local**.

## Base de datos

GitHub Pages sirve archivos estáticos, así que esta versión guarda datos en **IndexedDB**, una base local del navegador. Eso significa que los cambios quedan guardados en tu computadora o celular, incluso al cerrar la página, pero no se sincronizan automáticamente con otros dispositivos.

Para una base compartida real entre todos los celulares/computadoras se necesita conectar un backend externo, por ejemplo Supabase, Firebase o una API propia.
