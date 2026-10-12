package migrations

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Every run owns a separate PostgreSQL schema; application tables are never
// migrated or dropped by this test.
func TestPostgresMigrationLifecycle(t *testing.T) {
	dsn := os.Getenv("MIGRATION_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("MIGRATION_TEST_DATABASE_URL is required for PostgreSQL integration tests")
	}
	ctx := context.Background()
	admin, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = admin.Close(ctx) })
	schema := "migration_test_" + uuid.New().String()
	quotedSchema := pgx.Identifier{schema}.Sanitize()
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+quotedSchema); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := admin.Exec(ctx, "DROP SCHEMA "+quotedSchema+" CASCADE"); err != nil {
			t.Error(err)
		}
	})
	config, err := pgx.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	config.RuntimeParams["search_path"] = quotedSchema
	pool := stdlib.OpenDB(*config)
	t.Cleanup(func() { _ = pool.Close() })
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: pool}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}

	assertApplied := func() {
		t.Helper()
		if err := Up(db); err != nil {
			t.Fatal(err)
		}
		records, err := Status(db)
		if err != nil || len(records) != len(All) {
			t.Fatalf("migration history: records=%v err=%v", records, err)
		}
		for _, record := range records {
			if record.Batch != 1 {
				t.Fatalf("unexpected batch: %v", record)
			}
		}
		for _, table := range []string{"hotels", "branches", "rooms", "bookings", "people", "assets", "sessions", "hotel_media", "branch_media", "room_media", "feature_categories", "feature_definitions", "feature_options", "feature_media", "property_assignments", "room_assignments"} {
			if !db.Migrator().HasTable(table) {
				t.Errorf("missing table %s", table)
			}
		}
		var invalidReferences int64
		if err := db.Raw(`SELECT count(*) FROM pg_constraint c
			JOIN pg_class child ON child.oid = c.conrelid
			JOIN pg_class parent ON parent.oid = c.confrelid
			WHERE c.contype = 'f' AND child.relnamespace = current_schema()::regnamespace
			AND parent.relnamespace <> child.relnamespace`).Scan(&invalidReferences).Error; err != nil {
			t.Fatal(err)
		}
		if invalidReferences != 0 {
			t.Fatalf("%d foreign keys reference tables outside the migrated schema", invalidReferences)
		}
	}
	assertApplied()
	assertApplied() // An applied migration must not run again or create a batch.
	for _, reset := range []bool{false, true} {
		if err := Down(db, reset); err != nil {
			t.Fatal(err)
		}
		records, err := Status(db)
		if err != nil || len(records) != 0 {
			t.Fatalf("rollback history: records=%v err=%v", records, err)
		}
		var remaining []string
		if err := db.Raw("SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> 'schema_migrations'").Scan(&remaining).Error; err != nil {
			t.Fatal(err)
		}
		if len(remaining) != 0 {
			t.Fatalf("rollback left tables: %v", remaining)
		}
		assertApplied()
	}
}
