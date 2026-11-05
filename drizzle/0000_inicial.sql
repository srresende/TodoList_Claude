CREATE TABLE `atividades` (
	`id` text PRIMARY KEY NOT NULL,
	`secao_id` text NOT NULL,
	`parent_id` text,
	`texto` text NOT NULL,
	`ordem` real NOT NULL,
	`status` text NOT NULL,
	`data_planejada` text,
	`planejada_pendente` integer DEFAULT false NOT NULL,
	`fora_do_paper` integer DEFAULT false NOT NULL,
	`por_pai` integer DEFAULT false NOT NULL,
	`criada_em` text NOT NULL,
	`concluida_em` text,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`chave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tabela` text NOT NULL,
	`registro_id` text NOT NULL,
	`operacao` text NOT NULL,
	`campos` text NOT NULL,
	`criado_em` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `paper_itens` (
	`id` text PRIMARY KEY NOT NULL,
	`paper_id` text NOT NULL,
	`atividade_id` text NOT NULL,
	`secao_id` text NOT NULL,
	`parent_id` text,
	`texto_no_dia` text NOT NULL,
	`status_no_dia` text NOT NULL,
	`ordem` real NOT NULL,
	`planejado` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paper_itens_paper_atividade` ON `paper_itens` (`paper_id`,`atividade_id`);--> statement-breakpoint
CREATE TABLE `papers` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`criado_em` text NOT NULL,
	`impresso_em` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `papers_data_unique` ON `papers` (`data`);--> statement-breakpoint
CREATE TABLE `secoes` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`cor` text NOT NULL,
	`ordem` real NOT NULL,
	`arquivada` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
