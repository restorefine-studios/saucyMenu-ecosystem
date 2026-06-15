ALTER TABLE "menu_items" DROP CONSTRAINT "menu_items_section_id_menu_sections_id_fk";
--> statement-breakpoint
ALTER TABLE "menu_sections" DROP CONSTRAINT "menu_sections_menu_id_menu_id_fk";
--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_section_id_menu_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."menu_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_sections" ADD CONSTRAINT "menu_sections_menu_id_menu_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON DELETE cascade ON UPDATE no action;