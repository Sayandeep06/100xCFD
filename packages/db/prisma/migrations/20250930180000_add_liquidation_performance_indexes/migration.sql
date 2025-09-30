-- CreateIndex
CREATE INDEX "Position_margin_ratio_idx" ON "public"."Position"("margin_ratio");

-- CreateIndex
CREATE INDEX "Position_symbol_status_margin_ratio_idx" ON "public"."Position"("symbol", "status", "margin_ratio");
