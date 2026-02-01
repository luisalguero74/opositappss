# Ejemplo de script para subir archivos a Backblaze B2
# Requiere instalar b2 CLI: https://www.backblaze.com/b2/docs/quick_command_line.html
# 1. Instala la CLI: pip install b2
# 2. Autoriza tu cuenta: b2 authorize-account
# 3. Sube archivos masivamente:

# Subir todos los PDFs de documentos-temario/biblioteca
b2 sync documentos-temario/biblioteca b2://<NOMBRE_BUCKET>/biblioteca

# Subir todos los PDFs de documentos-temario/especifico
b2 sync documentos-temario/especifico b2://<NOMBRE_BUCKET>/especifico

# Subir todos los PDFs de documentos-temario/general
b2 sync documentos-temario/general b2://<NOMBRE_BUCKET>/general

# Subir backups
b2 sync backups b2://<NOMBRE_BUCKET>/backups

# Subir audios
b2 sync public/sounds b2://<NOMBRE_BUCKET>/audios

# Subir exportaciones
b2 sync . b2://<NOMBRE_BUCKET>/exportaciones --includeRegex 'questions.*\\.json|questions.*\\.csv|questionnaires.*\\.csv'

# Reemplaza <NOMBRE_BUCKET> por el nombre real de tu bucket en Backblaze B2.
# Puedes automatizarlo en un script bash o ejecutarlo por partes según tus necesidades.
