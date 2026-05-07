# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).


-- 1. TÁBLÁK TÖRLÉSE (Opcionális - csak ha tiszta lapot akarsz)
-- DROP TABLE IF EXISTS prices;
-- DROP TABLE IF EXISTS price_categories;
-- DROP TABLE IF EXISTS bookings;
-- DROP TABLE IF EXISTS site_settings;

-- ==========================================
-- 2. TÁBLÁK LÉTREHOZÁSA
-- ==========================================

-- Időpontfoglalások tábla
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_booking_date UNIQUE (booking_date) -- Dupla foglalás elleni védelem
);

-- Árlista kategóriák tábla
CREATE TABLE IF NOT EXISTS price_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

-- Szolgáltatások és Árak tábla
CREATE TABLE IF NOT EXISTS prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES price_categories(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  price_value TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0
);

-- Globális beállítások tábla (JSONB struktúra)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- ==========================================
-- 3. ALAPÉRTELMEZETT ADATOK FELTÖLTÉSE (SEEDING)
-- ==========================================

-- Kategóriák beszúrása (fix ID-kkal, hogy a referenciák működjenek)
INSERT INTO price_categories (id, name, display_order) VALUES 
('c1111111-1111-1111-1111-111111111111', 'Gél Lakk', 1),
('c2222222-2222-2222-2222-222222222222', 'Műköröm Építés', 2)
ON CONFLICT (id) DO NOTHING;

-- Szolgáltatások beszúrása
INSERT INTO prices (category_id, service_name, price_value, description, display_order) VALUES 
('c1111111-1111-1111-1111-111111111111', 'Egyszínű gél lakk', '6.500', 'Erősített alap, 2 hét tartósság', 1),
('c1111111-1111-1111-1111-111111111111', 'Francia / Ombre', '7.500', 'Klasszikus vagy színátmenetes', 2),
('c2222222-2222-2222-2222-222222222222', 'Zselé építés (S)', '9.500', 'Egyszínű, sablonos technika', 1),
('c2222222-2222-2222-2222-222222222222', 'Zselé építés (M)', '10.500', 'Extrém forma vagy díszítés nélkül', 2),
('c2222222-2222-2222-2222-222222222222', 'Töltés', '8.500', '3-4 hetes lenövés esetén', 3)
ON CONFLICT DO NOTHING;

-- Oldal beállítások beszúrása (Szerkeszthető adatokkal)
INSERT INTO site_settings (key, value) VALUES 
('contact', '{
    "phone": "+36 30 433 0624",
    "email": "radvanyi.tamas910105@gmail.com",
    "zip": "6721",
    "city": "Szeged",
    "street": "Hullám utca",
    "houseNumber": "3."
}'),
('hours', '{
    "workdays": "15:00 - 20:00", 
    "weekends": "10:00 - 15:00"
}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_token UUID DEFAULT gen_random_uuid();