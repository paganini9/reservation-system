-- AlterTable
ALTER TABLE "email_verification_tokens" ADD COLUMN     "invalidated_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "unavailable_dates" ADD COLUMN     "updated_at" TIMESTAMPTZ,
ADD COLUMN     "updated_by" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_temp_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspended_at" TIMESTAMPTZ;

-- AddForeignKey
ALTER TABLE "unavailable_dates" ADD CONSTRAINT "unavailable_dates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unavailable_dates" ADD CONSTRAINT "unavailable_dates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
