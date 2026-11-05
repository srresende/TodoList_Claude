CREATE TABLE `usuario` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`email` text,
	`provedor` text NOT NULL,
	`criado_em` text NOT NULL,
	`updated_at` text NOT NULL
);
