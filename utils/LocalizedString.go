package utils

import (
	"database/sql/driver"
	"encoding/json"
	"otel/constants"
)

// LocalizedString stores translations in one JSON column, for example:
// {"TR":"Deniz manzarası","EN":"Sea view"}.
// Translations may contain any subset of the supported languages.
type LocalizedString map[constants.Language]string

// GormDataType lets GORM recognize this map as a JSON field, not an association.
func (LocalizedString) GormDataType() string {
	return "json"
}

func (s LocalizedString) Validate() error {
	for language := range s {
		if !language.IsValid() {
			return constants.ErrLanguage
		}
	}
	return nil
}

// Value implements driver.Valuer for GORM writes.
func (s LocalizedString) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}
	if err := s.Validate(); err != nil {
		return nil, err
	}
	data, err := json.Marshal(s)
	if err != nil {
		return nil, err
	}
	return string(data), nil
}

// Scan implements sql.Scanner for drivers returning JSON as bytes or strings.
func (s *LocalizedString) Scan(value any) error {
	switch value := value.(type) {
	case nil:
		*s = nil
		return nil
	case []byte:
		return json.Unmarshal(value, s)
	case string:
		return json.Unmarshal([]byte(value), s)
	default:
		return constants.ErrScan
	}
}

// UnmarshalJSON validates language codes and normalizes them to uppercase.
// Decode into a fresh map so reusing a field cannot retain old translations.
func (s *LocalizedString) UnmarshalJSON(data []byte) error {
	var values map[string]*string
	if err := json.Unmarshal(data, &values); err != nil {
		return err
	}
	if values == nil {
		*s = nil
		return nil
	}

	translations := make(LocalizedString, len(values))
	for code, value := range values {
		language, err := constants.ParseLanguage(code)
		if err != nil {
			return err
		}
		if value == nil {
			return constants.ErrTranslation
		}
		if _, exists := translations[language]; exists {
			return constants.ErrDuplicateTranslation
		}
		translations[language] = *value
	}
	*s = translations
	return nil
}
