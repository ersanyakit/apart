package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261014_017_default_catalog", Up: func(tx *gorm.DB) error {
		// The global vocabulary is separate from tenant-owned feature definitions.
		// Existing feature APIs stay compatible; selections are projected into the
		// typed amenity and inventory tables in the same transaction.
		return tx.Exec(`
CREATE TABLE amenity_categories (
 code text PRIMARY KEY, label jsonb NOT NULL, icon_key text NOT NULL, sort_order integer NOT NULL
);
CREATE TABLE inventory_categories (
 code text PRIMARY KEY, label jsonb NOT NULL, icon_key text NOT NULL, sort_order integer NOT NULL
);
CREATE TABLE amenities (
 code text PRIMARY KEY, category_code text NOT NULL REFERENCES amenity_categories(code),
 group_code text NOT NULL, group_label jsonb NOT NULL, label jsonb NOT NULL,
 icon_key text NOT NULL, scope text NOT NULL CHECK (scope IN ('room','property')), sort_order integer NOT NULL
);
CREATE TABLE inventory_items (
 code text PRIMARY KEY, category_code text NOT NULL REFERENCES inventory_categories(code),
 group_code text NOT NULL, group_label jsonb NOT NULL, label jsonb NOT NULL,
 icon_key text NOT NULL, scope text NOT NULL CHECK (scope IN ('room','property')),
 kind text NOT NULL CHECK (kind IN ('inventory','consumable')), sort_order integer NOT NULL
);
CREATE TABLE property_amenities (
 branch_id uuid NOT NULL, hotel_id uuid NOT NULL, amenity_code text NOT NULL REFERENCES amenities(code),
 available boolean NOT NULL, PRIMARY KEY (branch_id, amenity_code),
 FOREIGN KEY (branch_id, hotel_id) REFERENCES branches(branch_id, hotel_id) ON DELETE CASCADE
);
CREATE TABLE room_amenities (
 room_id uuid NOT NULL, branch_id uuid NOT NULL, hotel_id uuid NOT NULL,
 amenity_code text NOT NULL REFERENCES amenities(code), available boolean NOT NULL,
 PRIMARY KEY (room_id, amenity_code),
 FOREIGN KEY (room_id, branch_id) REFERENCES rooms(room_id, branch_id) ON DELETE CASCADE,
 FOREIGN KEY (branch_id, hotel_id) REFERENCES branches(branch_id, hotel_id) ON DELETE CASCADE
);
CREATE TABLE inventory_assets (
 asset_id uuid PRIMARY KEY, item_code text NOT NULL REFERENCES inventory_items(code),
 hotel_id uuid NOT NULL REFERENCES hotels(hotel_id), branch_id uuid NOT NULL, room_id uuid,
 asset_tag text NOT NULL, serial_number text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','retired')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (hotel_id, asset_tag),
 FOREIGN KEY (branch_id, hotel_id) REFERENCES branches(branch_id, hotel_id),
 FOREIGN KEY (room_id, branch_id) REFERENCES rooms(room_id, branch_id)
);
CREATE TABLE inventory_movements (
 movement_id uuid PRIMARY KEY, item_code text NOT NULL REFERENCES inventory_items(code),
 hotel_id uuid NOT NULL, branch_id uuid NOT NULL, room_id uuid,
 quantity_delta bigint NOT NULL CHECK (quantity_delta <> 0),
 kind text NOT NULL CHECK (kind IN ('receipt','issue','room_assignment','adjustment')),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (branch_id, hotel_id) REFERENCES branches(branch_id, hotel_id),
 FOREIGN KEY (room_id, branch_id) REFERENCES rooms(room_id, branch_id)
);
CREATE TABLE room_inventory (
 room_id uuid NOT NULL, branch_id uuid NOT NULL, hotel_id uuid NOT NULL,
 item_code text NOT NULL REFERENCES inventory_items(code), quantity bigint NOT NULL CHECK (quantity > 0),
 PRIMARY KEY (room_id, item_code),
 FOREIGN KEY (room_id, branch_id) REFERENCES rooms(room_id, branch_id) ON DELETE CASCADE,
 FOREIGN KEY (branch_id, hotel_id) REFERENCES branches(branch_id, hotel_id) ON DELETE CASCADE
);
CREATE INDEX idx_inventory_assets_hotel ON inventory_assets(hotel_id, branch_id);
CREATE INDEX idx_inventory_movements_hotel ON inventory_movements(hotel_id, branch_id, created_at);
CREATE INDEX idx_room_inventory_hotel ON room_inventory(hotel_id, branch_id);
`).Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec(`DROP TABLE room_inventory, inventory_movements, inventory_assets, room_amenities, property_amenities, inventory_items, amenities, inventory_categories, amenity_categories`).Error
	}})
}
