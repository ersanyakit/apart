package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"otel/internal/domain/audit"
	"otel/internal/infrastructure/persistence/models"
	"reflect"
	"sync"
	"time"
)

var auditInstall sync.Mutex
var audited = map[string]string{"hotels": "hotel_id", "branches": "branch_id", "rooms": "room_id", "floors": "floor_id", "beds": "bed_id", "bookings": "booking_id", "assets": "media_id", "feature_categories": "category_id", "feature_definitions": "feature_id", "users": "user_id", "document_templates": "template_id", "documents": "document_id", "guest_profiles": "guest_id"}

type auditPlugin struct{}

func (auditPlugin) Name() string { return "hotel_audit" }
func InstallAudit(db *gorm.DB) {
	auditInstall.Lock()
	defer auditInstall.Unlock()
	if _, ok := db.Config.Plugins["hotel_audit"]; !ok {
		_ = db.Use(auditPlugin{})
	}
}
func (auditPlugin) Initialize(db *gorm.DB) error {
	before := func(tx *gorm.DB) {
		table := tx.Statement.Table
		pk, ok := audited[table]
		if !ok || tx.Error != nil {
			return
		}
		q := tx.Session(&gorm.Session{NewDB: true}).Table(table)
		where, has := tx.Statement.Clauses["WHERE"]
		if has {
			q = q.Where(where.Expression)
		}
		if tx.Statement.Schema != nil {
			if f := tx.Statement.Schema.LookUpField(pk); f != nil {
				rv := tx.Statement.ReflectValue
				if rv.IsValid() && rv.Kind() == reflect.Struct {
					if v, zero := f.ValueOf(tx.Statement.Context, rv); !zero {
						q = q.Where(clause.Eq{Column: pk, Value: v})
						has = true
					}
				}
			}
		}
		if !has {
			return
		}
		var rows []map[string]any
		if err := q.Select(auditColumns(tx, pk)).Find(&rows).Error; err != nil {
			tx.AddError(err)
			return
		}
		tx.InstanceSet("audit_rows", rows)
	}
	after := func(action string) func(*gorm.DB) {
		return func(tx *gorm.DB) {
			table := tx.Statement.Table
			pk, ok := audited[table]
			if !ok || tx.Error != nil || tx.RowsAffected == 0 {
				return
			}
			var rows []map[string]any
			if value, ok := tx.InstanceGet("audit_rows"); ok {
				rows, _ = value.([]map[string]any)
			}
			if action == "create" {
				var collect func(reflect.Value)
				collect = func(v reflect.Value) {
					for v.IsValid() && v.Kind() == reflect.Pointer {
						v = v.Elem()
					}
					if !v.IsValid() {
						return
					}
					if v.Kind() == reflect.Slice {
						for i := 0; i < v.Len(); i++ {
							collect(v.Index(i))
						}
						return
					}
					if v.Kind() != reflect.Struct {
						return
					}
					row := map[string]any{}
					for _, column := range []string{pk, "hotel_id", "branch_id"} {
						if f := tx.Statement.Schema.LookUpField(column); f != nil {
							value, _ := f.ValueOf(tx.Statement.Context, v)
							row[column] = value
						}
					}
					rows = append(rows, row)
				}
				collect(tx.Statement.ReflectValue)
			}
			actor := audit.ActorFrom(tx.Statement.Context)
			for _, row := range rows {
				id := auditUUID(row[pk])
				hotelID := auditUUID(row["hotel_id"])
				if table == "hotels" {
					hotelID = id
				}
				if hotelID == uuid.Nil {
					var branch models.Branch
					if err := tx.Session(&gorm.Session{NewDB: true}).Unscoped().Select("hotel_id").First(&branch, "branch_id = ?", auditUUID(row["branch_id"])).Error; err != nil {
						tx.AddError(err)
						return
					}
					hotelID = branch.HotelID
				}
				details := map[string]any{}
				if action != "create" {
					details["before"] = row
				}
				if action != "delete" {
					var current map[string]any
					if err := tx.Session(&gorm.Session{NewDB: true}).Table(table).Select(auditColumns(tx, pk)).Where(clause.Eq{Column: pk, Value: id}).Take(&current).Error; err != nil {
						tx.AddError(err)
						return
					}
					details["after"] = current
				}
				eventAction := action
				if actor.Entity == table && actor.Action != "" {
					eventAction = actor.Action
				}
				if err := recordAudit(tx, hotelID, eventAction, table, id, details); err != nil {
					tx.AddError(err)
					return
				}
			}
		}
	}
	if err := db.Callback().Create().After("gorm:create").Before("gorm:commit_or_rollback_transaction").Register("hotel_audit:create", after("create")); err != nil {
		return err
	}
	if err := db.Callback().Update().Before("gorm:update").Register("hotel_audit:capture_update", before); err != nil {
		return err
	}
	if err := db.Callback().Update().After("gorm:update").Before("gorm:commit_or_rollback_transaction").Register("hotel_audit:update", after("update")); err != nil {
		return err
	}
	if err := db.Callback().Delete().Before("gorm:delete").Register("hotel_audit:capture_delete", before); err != nil {
		return err
	}
	return db.Callback().Delete().After("gorm:delete").Before("gorm:commit_or_rollback_transaction").Register("hotel_audit:delete", after("delete"))
}

// An allow-list keeps passwords, tokens, identity numbers and contact data out
// of the audit trail while retaining the operational before/after context.
func auditColumns(tx *gorm.DB, pk string) []string {
	columns := []string{pk}
	if tx.Statement.Schema == nil {
		return columns
	}
	for _, column := range []string{"hotel_id", "branch_id", "room_id", "kind", "name", "code", "display_name", "status", "guest_name", "guest_count", "daily_price_minor", "check_in", "check_out", "actual_check_in", "actual_check_out", "cancellation_reason", "cancelled_at", "status_reason", "deposit_minor", "deposit_channel", "capacity", "rentable", "inactive", "role", "user_role", "title", "format"} {
		if column != pk && tx.Statement.Schema.LookUpField(column) != nil {
			columns = append(columns, column)
		}
	}
	return columns
}

// Use the caller's transaction: an operation must not commit without its log.
func recordAudit(tx *gorm.DB, hotelID uuid.UUID, action, entity string, id uuid.UUID, details map[string]any) error {
	actor := audit.ActorFrom(tx.Statement.Context)
	entry := models.AuditLog{ID: uuid.New(), HotelID: hotelID, ActorID: actor.UserID, Command: actor.Command, Action: action, Entity: entity, EntityID: id, RequestID: actor.RequestID, CreatedAt: time.Now().UTC(), Details: details}
	entries := []models.AuditLog{entry}
	if err := enrichAuditLocations(tx.Session(&gorm.Session{NewDB: true}), hotelID, entries, true); err != nil {
		return err
	}
	entry = entries[0]
	return tx.Session(&gorm.Session{NewDB: true}).Create(&entry).Error
}
func auditUUID(value any) uuid.UUID {
	switch v := value.(type) {
	case uuid.UUID:
		return v
	case string:
		id, _ := uuid.Parse(v)
		return id
	case []byte:
		id, _ := uuid.Parse(string(v))
		return id
	}
	return uuid.Nil
}
func (r *Repository) AuditLogs(ctx context.Context, q audit.Query) (audit.Page, error) {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize != 25 && q.PageSize != 50 && q.PageSize != 100 {
		q.PageSize = 100
	}
	query := r.db.WithContext(ctx).Model(&models.AuditLog{}).Where("hotel_id = ?", q.HotelID)
	if q.From != nil {
		query = query.Where("created_at >= ?", q.From)
	}
	if q.To != nil {
		query = query.Where("created_at < ?", q.To)
	}
	if q.Action != "" {
		query = query.Where("action = ?", q.Action)
	}
	out := audit.Page{Items: []audit.Entry{}, Page: q.Page, PageSize: q.PageSize}
	if err := query.Count(&out.Total).Error; err != nil {
		return out, err
	}
	lastPage := max(1, int((out.Total+int64(q.PageSize)-1)/int64(q.PageSize)))
	if out.Page > lastPage {
		out.Page = lastPage
	}
	var rows []models.AuditLog
	if err := query.Order("created_at DESC,id DESC").Limit(q.PageSize).Offset((out.Page - 1) * q.PageSize).Find(&rows).Error; err != nil {
		return out, err
	}
	// Older entries remain immutable; missing labels are resolved for this response.
	if err := enrichAuditLocations(r.db.WithContext(ctx), q.HotelID, rows, false); err != nil {
		return out, err
	}
	names := map[uuid.UUID]string{}
	var users []models.User
	if err := r.db.WithContext(ctx).Unscoped().Select("user_id,display_name").Where("hotel_id = ?", q.HotelID).Find(&users).Error; err != nil {
		return out, err
	}
	for _, u := range users {
		names[u.UserID] = u.DisplayName
	}
	for _, e := range rows {
		name := names[e.ActorID]
		if name == "" {
			name = "Sistem"
			if e.ActorID != uuid.Nil {
				name = "Yetkili kullanıcı"
			}
		}
		out.Items = append(out.Items, audit.Entry{ID: e.ID, HotelID: e.HotelID, ActorID: e.ActorID, ActorName: name, Command: e.Command, Action: e.Action, Entity: e.Entity, EntityID: e.EntityID, RequestID: e.RequestID, CreatedAt: e.CreatedAt, Details: e.Details})
	}
	return out, nil
}
