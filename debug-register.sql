-- Verificar que los defaults estén aplicados
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'id';

-- Verificar tabla VerificationToken
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'VerificationToken'
ORDER BY ordinal_position;

-- Verificar números permitidos
SELECT * FROM "AllowedPhoneNumber";
