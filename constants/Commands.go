package constants

//go:generate go run ../cmd/contracts ../ui/src/lib/contracts.generated.json

import "encoding/json"

const APPLICATION_NAME = "INTERACTIVEOTEL"

type CommandEnvelope struct {
	Version string          `json:"version"`
	Code    string          `json:"code"`
	Payload json.RawMessage `json:"payload"`
}

type TCommandTypes int

const (
	//SYSTEM
	CMD_INITIAL_SYNC    = "system.initial_sync"
	CMD_PAYMENT_METHODS = "system.payment_methods"
	CMD_LINK_METADATA   = "system.link_metadata"
)

const COMMAND_VERSION = "1"
const APPLICATION_VERSION = "1.0.0"

const (
	CMD_AUTH_LOGIN       = "auth.login"
	CMD_AUTH_LOGOUT      = "auth.logout"
	CMD_HOTEL_LIST       = "hotel.list"
	CMD_HOTEL_CREATE     = "hotel.create"
	CMD_HOTEL_UPDATE     = "hotel.update"
	CMD_BRANCH_LIST      = "branch.list"
	CMD_BRANCH_CREATE    = "branch.create"
	CMD_BRANCH_UPDATE    = "branch.update"
	CMD_BRANCH_DELETE    = "branch.delete"
	CMD_ROOM_LIST        = "room.list"
	CMD_ROOM_CREATE      = "room.create"
	CMD_ROOM_UPDATE      = "room.update"
	CMD_ROOM_DELETE      = "room.delete"
	CMD_ROOM_STATE       = "room.state"
	CMD_ROOM_EXCHANGE    = "room.exchange"
	CMD_MEDIA_LIST       = "media.list"
	CMD_MEDIA_UPLOAD     = "media.upload"
	CMD_MEDIA_UPDATE     = "media.update"
	CMD_MEDIA_DELETE     = "media.delete"
	CMD_INVENTORY_UPDATE = "inventory.update"
)

// CommandMethods is the single whitelist for dispatch and HTTP method validation.
var CommandMethods = map[string]string{
	CMD_AUTH_LOGIN: "POST", CMD_AUTH_LOGOUT: "POST",
	CMD_INITIAL_SYNC: "GET", CMD_PAYMENT_METHODS: "GET", CMD_LINK_METADATA: "GET",
	CMD_HOTEL_LIST: "GET", CMD_HOTEL_CREATE: "POST", CMD_HOTEL_UPDATE: "PUT",
	CMD_BRANCH_LIST: "GET", CMD_BRANCH_CREATE: "POST", CMD_BRANCH_UPDATE: "PUT", CMD_BRANCH_DELETE: "DELETE",
	CMD_ROOM_LIST: "GET", CMD_ROOM_CREATE: "POST", CMD_ROOM_UPDATE: "PUT", CMD_ROOM_DELETE: "DELETE",
	CMD_ROOM_STATE: "PUT", CMD_ROOM_EXCHANGE: "PUT",
	CMD_MEDIA_LIST: "GET", CMD_MEDIA_UPLOAD: "POST", CMD_MEDIA_UPDATE: "PUT", CMD_MEDIA_DELETE: "DELETE",
	CMD_INVENTORY_UPDATE: "PUT",
}

const (
	CMD_FEATURE_REGISTRY = "feature.registry"
	CMD_CATEGORY_CREATE  = "feature.category.create"
	CMD_CATEGORY_UPDATE  = "feature.category.update"
	CMD_FEATURE_CREATE   = "feature.create"
	CMD_FEATURE_UPDATE   = "feature.update"
	CMD_FEATURE_DELETE   = "feature.delete"
	CMD_FEATURE_ASSIGN   = "feature.assign"
	CMD_ROOM_FILTER      = "room.filter"
)

func init() {
	for code, method := range map[string]string{CMD_FEATURE_REGISTRY: "GET", CMD_CATEGORY_CREATE: "POST", CMD_CATEGORY_UPDATE: "PUT", CMD_FEATURE_CREATE: "POST", CMD_FEATURE_UPDATE: "PUT", CMD_FEATURE_DELETE: "DELETE", CMD_FEATURE_ASSIGN: "PUT", CMD_ROOM_FILTER: "GET"} {
		CommandMethods[code] = method
	}
}

const (
	CMD_FLOOR_LIST         = "floor.list"
	CMD_FLOOR_CREATE       = "floor.create"
	CMD_FLOOR_UPDATE       = "floor.update"
	CMD_FLOOR_DELETE       = "floor.delete"
	CMD_FLOOR_PLAN         = "floor.plan"
	CMD_FLOOR_PLAN_SAVE    = "floor.plan.save"
	CMD_BOOKING_LIST       = "booking.list"
	CMD_BOOKING_CREATE     = "booking.create"
	CMD_BOOKING_UPDATE     = "booking.update"
	CMD_BOOKING_TRANSITION = "booking.transition"
	CMD_ROOM_AVAILABILITY  = "room.availability"
)

func init() {
	for code, method := range map[string]string{CMD_FLOOR_LIST: "GET", CMD_FLOOR_CREATE: "POST", CMD_FLOOR_UPDATE: "PUT", CMD_FLOOR_DELETE: "DELETE", CMD_FLOOR_PLAN: "GET", CMD_FLOOR_PLAN_SAVE: "PUT", CMD_BOOKING_LIST: "GET", CMD_BOOKING_CREATE: "POST", CMD_BOOKING_UPDATE: "PUT", CMD_BOOKING_TRANSITION: "PUT", CMD_ROOM_AVAILABILITY: "GET"} {
		CommandMethods[code] = method
	}
}

const CMD_ROOM_BULK = "room.bulk_create"

func init() { CommandMethods[CMD_ROOM_BULK] = "POST" }

const CMD_AUTH_PROPERTIES = "auth.properties"

func init() { CommandMethods[CMD_AUTH_PROPERTIES] = "GET" }

const CMD_AUTH_PEOPLE = "auth.people"

func init() { CommandMethods[CMD_AUTH_PEOPLE] = "GET" }

const (
	CMD_BED_LIST   = "bed.list"
	CMD_BED_CREATE = "bed.create"
	CMD_BED_UPDATE = "bed.update"
	CMD_BED_DELETE = "bed.delete"
)

func init() {
	CommandMethods[CMD_BED_LIST] = "GET"
	CommandMethods[CMD_BED_CREATE] = "POST"
	CommandMethods[CMD_BED_UPDATE] = "PUT"
	CommandMethods[CMD_BED_DELETE] = "DELETE"
}

const CMD_AUDIT_LIST = "audit.list"
const CMD_ROOM_DELETE_MANY = "room.delete_many"

func init() { CommandMethods[CMD_AUDIT_LIST] = "GET"; CommandMethods[CMD_ROOM_DELETE_MANY] = "DELETE" }

const (
	CMD_GUEST_SEARCH      = "guest.search"
	CMD_GUEST_STAYS       = "guest.stays"
	CMD_GUEST_EXPORT      = "guest.export"
	CMD_BOOKING_GUESTS    = "booking.guests.update"
	CMD_TEMPLATE_LIST     = "document.templates"
	CMD_TEMPLATE_SAVE     = "document.template.save"
	CMD_DOCUMENT_LIST     = "document.list"
	CMD_DOCUMENT_PREVIEW  = "document.preview"
	CMD_DOCUMENT_ISSUE    = "document.issue"
	CMD_DOCUMENT_DOWNLOAD = "document.download"
	CMD_STAFF_LIST        = "staff.list"
	CMD_STAFF_CREATE      = "staff.create"
	CMD_STAFF_UPDATE      = "staff.update"
	CMD_STAFF_DELETE      = "staff.delete"
)

func init() {
	for command, method := range map[string]string{CMD_GUEST_SEARCH: "GET", CMD_GUEST_STAYS: "GET", CMD_GUEST_EXPORT: "GET", CMD_BOOKING_GUESTS: "PUT", CMD_TEMPLATE_LIST: "GET", CMD_TEMPLATE_SAVE: "PUT", CMD_DOCUMENT_LIST: "GET", CMD_DOCUMENT_PREVIEW: "POST", CMD_DOCUMENT_ISSUE: "POST", CMD_DOCUMENT_DOWNLOAD: "GET", CMD_STAFF_LIST: "GET", CMD_STAFF_CREATE: "POST", CMD_STAFF_UPDATE: "PUT", CMD_STAFF_DELETE: "DELETE"} {
		CommandMethods[command] = method
	}
}

const CMD_TEMPLATE_DEFAULTS = "document.template.defaults"

func init() { CommandMethods[CMD_TEMPLATE_DEFAULTS] = "GET" }
