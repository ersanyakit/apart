package persistence

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"otel/constants"
	"otel/internal/domain/notes"
	"strings"
	"time"
)

func (r *Repository) ListNotes(ctx context.Context, q notes.Query) (notes.Page, error) {
	out := notes.Page{Items: []notes.Note{}, Page: q.Page}
	base := r.db.WithContext(ctx).Model(&notes.Note{}).Where("hotel_id=? AND branch_id=? AND status=? AND archived=?", q.HotelID, q.BranchID, q.Status, q.Archived)
	if q.Search != "" {
		search := "%" + strings.NewReplacer("\\", "\\\\", "%", "\\%", "_", "\\_").Replace(q.Search) + "%"
		base = base.Where("title ILIKE ? OR body ILIKE ? OR created_by_name ILIKE ?", search, search, search)
	}
	if e := base.Count(&out.Total).Error; e != nil {
		return out, e
	}
	e := base.Order("CASE WHEN priority='urgent' THEN 0 ELSE 1 END, updated_at DESC, id").Limit(notes.PageSize).Offset((q.Page - 1) * notes.PageSize).Find(&out.Items).Error
	return out, e
}
func noteAudit(n notes.Note) map[string]any {
	return map[string]any{"title": n.Title, "body": n.Body, "status": n.Status, "priority": n.Priority, "archived": n.Archived, "branch_id": n.BranchID, "actor_name": n.UpdatedByName}
}
func matchesNote(n notes.Note, in notes.Input) bool {
	return n.Title == in.Title && n.Body == in.Body && n.Status == in.Status && n.Priority == in.Priority && n.Archived == in.Archived
}
func (r *Repository) SaveNote(ctx context.Context, in notes.Input, actor uuid.UUID, name string) (notes.Note, error) {
	var out notes.Note
	e := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Serialize create retries too; one branch's shared board is a single operation scope.
		if e := lockBranch(tx, in.BranchID); e != nil {
			return e
		}
		var old notes.Note
		e := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&old, "id=?", in.ID).Error
		now := time.Now().UTC()
		if errors.Is(e, gorm.ErrRecordNotFound) {
			if in.Version != 0 {
				return constants.ErrNotFound
			}
			out = notes.Note{ID: in.ID, HotelID: in.HotelID, BranchID: in.BranchID, Title: in.Title, Body: in.Body, Status: in.Status, Priority: in.Priority, Version: 1, CreatedBy: actor, CreatedByName: name, UpdatedBy: actor, UpdatedByName: name, CreatedAt: now, UpdatedAt: now}
			if e := tx.Create(&out).Error; e != nil {
				return e
			}
			return recordAudit(tx, in.HotelID, "create", "reception_notes", in.ID, map[string]any{"after": noteAudit(out)})
		}
		if e != nil {
			return e
		}
		if old.HotelID != in.HotelID || old.BranchID != in.BranchID {
			return constants.ErrNotFound
		}
		// Repeating the exact successful request is safe after a network interruption.
		if old.Version == in.Version+1 && old.UpdatedBy == actor && matchesNote(old, in) {
			out = old
			return nil
		}
		if old.Version != in.Version {
			return constants.ErrNoteChanged
		}
		out = old
		out.Title = in.Title
		out.Body = in.Body
		out.Status = in.Status
		out.Priority = in.Priority
		out.Archived = in.Archived
		out.Version++
		out.UpdatedBy = actor
		out.UpdatedByName = name
		out.UpdatedAt = now
		if e := tx.Save(&out).Error; e != nil {
			return e
		}
		action := "update"
		if !old.Archived && out.Archived {
			action = "archive"
		}
		if old.Archived && !out.Archived {
			action = "restore"
		}
		return recordAudit(tx, in.HotelID, action, "reception_notes", in.ID, map[string]any{"before": noteAudit(old), "after": noteAudit(out)})
	})
	return out, translate(e)
}
