CREATE TABLE `bug_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`page_path` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`closed_at` integer,
	`close_note` text
);
--> statement-breakpoint
CREATE INDEX `bug_reports_status_idx` ON `bug_reports` (`status`);--> statement-breakpoint
CREATE INDEX `bug_reports_created_at_idx` ON `bug_reports` (`created_at`);