-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "questionnaireId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "temaId" TEXT;

-- CreateTable
CREATE TABLE "QuestionnaireQuestion" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_temaId_idx" ON "Question"("temaId");

-- CreateIndex
CREATE INDEX "Question_questionnaireId_idx" ON "Question"("questionnaireId");

-- CreateIndex
CREATE INDEX "QuestionnaireQuestion_questionnaireId_idx" ON "QuestionnaireQuestion"("questionnaireId");

-- CreateIndex
CREATE INDEX "QuestionnaireQuestion_questionId_idx" ON "QuestionnaireQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireQuestion_questionnaireId_questionId_key" ON "QuestionnaireQuestion"("questionnaireId", "questionId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "TemaOficial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireQuestion" ADD CONSTRAINT "QuestionnaireQuestion_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireQuestion" ADD CONSTRAINT "QuestionnaireQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
