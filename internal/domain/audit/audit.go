package audit

import (
	"context"
	"github.com/google/uuid"
	"time"
)

type Actor struct {
	UserID    uuid.UUID
	RequestID string
	Command   string
	Action    string
	Entity    string
}
type actorKey struct{}

func WithActor(ctx context.Context, a Actor) context.Context {
	return context.WithValue(ctx, actorKey{}, a)
}
func ActorFrom(ctx context.Context) Actor { a, _ := ctx.Value(actorKey{}).(Actor); return a }

// WithAction names a business operation without relabelling its side effects.
func WithAction(ctx context.Context, entity, action string) context.Context {
	a := ActorFrom(ctx)
	a.Entity, a.Action = entity, action
	return WithActor(ctx, a)
}

type Entry struct {
	ID        uuid.UUID      `json:"id"`
	HotelID   uuid.UUID      `json:"hotel_id"`
	ActorID   uuid.UUID      `json:"actor_id"`
	ActorName string         `json:"actor_name"`
	Command   string         `json:"command"`
	Action    string         `json:"action"`
	Entity    string         `json:"entity"`
	EntityID  uuid.UUID      `json:"entity_id"`
	RequestID string         `json:"request_id"`
	CreatedAt time.Time      `json:"created_at"`
	Details   map[string]any `json:"details"`
}
type Query struct {
	HotelID  uuid.UUID  `json:"hotel_id"`
	From     *time.Time `json:"from"`
	To       *time.Time `json:"to"`
	Action   string     `json:"action"`
	Page     int        `json:"page"`
	PageSize int        `json:"page_size"`
}
type Page struct {
	Items    []Entry `json:"items"`
	Total    int64   `json:"total"`
	Page     int     `json:"page"`
	PageSize int     `json:"page_size"`
}
type Repository interface {
	AuditLogs(context.Context, Query) (Page, error)
}
