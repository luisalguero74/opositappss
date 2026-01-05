-- 1. Agregar defaults a todos los campos id
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Account" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Session" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Topic" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Questionnaire" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Question" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Subscription" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "LegalDocument" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "AllowedPhoneNumber" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "UserAnswer" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "QuestionnaireAttempt" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- 2. Verificar números permitidos
SELECT * FROM "AllowedPhoneNumber";

-- 3. Verificar estructura de User
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'User' 
ORDER BY ordinal_position;
