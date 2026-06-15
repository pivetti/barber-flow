-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "businessName" TEXT NOT NULL DEFAULT 'Barbearia do Jesi',
    "businessDescription" TEXT NOT NULL DEFAULT 'Agendamentos online para uma experiencia simples, organizada e premium.',
    "logoUrl" TEXT NOT NULL DEFAULT '/logo-jesi.png',
    "bannerUrl" TEXT NOT NULL DEFAULT '/banner-jesi.png',
    "primaryColor" TEXT NOT NULL DEFAULT '#111184',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1b1ba3',
    "businessEmail" TEXT NOT NULL DEFAULT 'contato@barbeariadojesi.com.br',
    "businessPhone" TEXT NOT NULL DEFAULT '(00) 00000-0000',
    "whatsappPhone" TEXT NOT NULL DEFAULT '',
    "privacyEmail" TEXT NOT NULL DEFAULT 'privacidade@barbeariadojesi.com.br',
    "privacyPhone" TEXT NOT NULL DEFAULT '(00) 00000-0000',
    "privacyResponsible" TEXT NOT NULL DEFAULT 'Barbearia do Jesi',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
