/*
  Warnings:

  - The values [NOTE,TOPIC,SUBTOPIC,RESOURCE] on the enum `MaterialType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `boardId` on the `Material` table. All the data in the column will be lost.
  - You are about to drop the column `generatedMaterial` on the `study_boards` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `study_boards` table. All the data in the column will be lost.
  - You are about to drop the column `topic` on the `study_boards` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedFile` on the `study_boards` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[uploadedNoteId]` on the table `Material` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[generatedNoteId]` on the table `Material` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "topic_status" AS ENUM ('GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "section_status" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "note_status" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "depth_level" AS ENUM ('FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "concept_importance" AS ENUM ('CRITICAL', 'IMPORTANT', 'SUPPLEMENTARY');

-- CreateEnum
CREATE TYPE "relationship_type" AS ENUM ('PREREQUISITE', 'RELATED', 'ADVANCED_TOPIC', 'SEE_ALSO');

-- CreateEnum
CREATE TYPE "progress_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "generation_type" AS ENUM ('FULL_TOPIC', 'SECTION', 'NOTE', 'REGENERATION');

-- AlterEnum
BEGIN;
CREATE TYPE "MaterialType_new" AS ENUM ('UPLOADED_NOTE', 'GENERATED_TOPIC');
ALTER TABLE "public"."Material" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Material" ALTER COLUMN "type" TYPE "MaterialType_new" USING ("type"::text::"MaterialType_new");
ALTER TYPE "MaterialType" RENAME TO "MaterialType_old";
ALTER TYPE "MaterialType_new" RENAME TO "MaterialType";
DROP TYPE "public"."MaterialType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Material" DROP COLUMN "boardId",
ADD COLUMN     "generatedNoteId" TEXT,
ADD COLUMN     "uploadedNoteId" TEXT,
ALTER COLUMN "type" DROP DEFAULT;

-- AlterTable
ALTER TABLE "study_boards" DROP COLUMN "generatedMaterial",
DROP COLUMN "subject",
DROP COLUMN "topic",
DROP COLUMN "uploadedFile";

-- CreateTable
CREATE TABLE "UploadedNote" (
    "id" TEXT NOT NULL,
    "studyBoardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "r2Url" TEXT NOT NULL,
    "extractedText" TEXT,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "difficulty" "difficulty" NOT NULL,
    "status" "topic_status" NOT NULL DEFAULT 'GENERATING',
    "total_sections" INTEGER NOT NULL DEFAULT 0,
    "total_notes" INTEGER NOT NULL DEFAULT 0,
    "estimated_read_time" INTEGER,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order_index" INTEGER NOT NULL,
    "depth_level" "depth_level" NOT NULL,
    "total_notes" INTEGER NOT NULL DEFAULT 0,
    "estimated_read_time" INTEGER,
    "status" "section_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "order_index" INTEGER NOT NULL,
    "depth_level" "depth_level" NOT NULL,
    "word_count" INTEGER NOT NULL,
    "estimated_read_time" INTEGER NOT NULL,
    "includes_examples" BOOLEAN NOT NULL DEFAULT false,
    "includes_code" BOOLEAN NOT NULL DEFAULT false,
    "includes_diagrams" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "status" "note_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_history" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "user_id" TEXT,
    "generation_type" "generation_type" NOT NULL,
    "ai_model" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "generation_time" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concepts" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "importance" "concept_importance" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_relationships" (
    "id" TEXT NOT NULL,
    "source_note_id" TEXT NOT NULL,
    "target_note_id" TEXT NOT NULL,
    "relationship_type" "relationship_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "status" "progress_status" NOT NULL,
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "time_spent" INTEGER NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes_user" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topics_user_id_idx" ON "topics"("user_id");

-- CreateIndex
CREATE INDEX "topics_status_idx" ON "topics"("status");

-- CreateIndex
CREATE INDEX "topics_created_at_idx" ON "topics"("created_at");

-- CreateIndex
CREATE INDEX "sections_topic_id_idx" ON "sections"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "sections_topic_id_order_index_key" ON "sections"("topic_id", "order_index");

-- CreateIndex
CREATE INDEX "notes_section_id_idx" ON "notes"("section_id");

-- CreateIndex
CREATE INDEX "notes_topic_id_idx" ON "notes"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "notes_section_id_order_index_key" ON "notes"("section_id", "order_index");

-- CreateIndex
CREATE INDEX "generation_history_topic_id_idx" ON "generation_history"("topic_id");

-- CreateIndex
CREATE INDEX "generation_history_user_id_idx" ON "generation_history"("user_id");

-- CreateIndex
CREATE INDEX "generation_history_created_at_idx" ON "generation_history"("created_at");

-- CreateIndex
CREATE INDEX "concepts_note_id_idx" ON "concepts"("note_id");

-- CreateIndex
CREATE INDEX "concepts_topic_id_idx" ON "concepts"("topic_id");

-- CreateIndex
CREATE INDEX "concepts_term_idx" ON "concepts"("term");

-- CreateIndex
CREATE INDEX "note_relationships_source_note_id_idx" ON "note_relationships"("source_note_id");

-- CreateIndex
CREATE INDEX "note_relationships_target_note_id_idx" ON "note_relationships"("target_note_id");

-- CreateIndex
CREATE UNIQUE INDEX "note_relationships_source_note_id_target_note_id_relationsh_key" ON "note_relationships"("source_note_id", "target_note_id", "relationship_type");

-- CreateIndex
CREATE INDEX "user_progress_user_id_idx" ON "user_progress"("user_id");

-- CreateIndex
CREATE INDEX "user_progress_note_id_idx" ON "user_progress"("note_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_user_id_note_id_key" ON "user_progress"("user_id", "note_id");

-- CreateIndex
CREATE UNIQUE INDEX "Material_uploadedNoteId_key" ON "Material"("uploadedNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_generatedNoteId_key" ON "Material"("generatedNoteId");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_uploadedNoteId_fkey" FOREIGN KEY ("uploadedNoteId") REFERENCES "UploadedNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_generatedNoteId_fkey" FOREIGN KEY ("generatedNoteId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_history" ADD CONSTRAINT "generation_history_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_history" ADD CONSTRAINT "generation_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_relationships" ADD CONSTRAINT "note_relationships_source_note_id_fkey" FOREIGN KEY ("source_note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_relationships" ADD CONSTRAINT "note_relationships_target_note_id_fkey" FOREIGN KEY ("target_note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
