package shared

import (
	"otel/constants"
)

type LocalizedString map[constants.Language]string

var (
	ErrNotFound     = constants.ErrNotFound
	ErrForbidden    = constants.ErrForbidden
	ErrUnauthorized = constants.ErrUnauthorized
	ErrConflict     = constants.ErrConflict
)

func (text LocalizedString) Validate() error {
	for language, value := range text {
		if !language.IsValid() {
			return constants.ErrLanguage
		}
		if len(value) > 16000 {
			return constants.ErrTranslationLength
		}
	}
	return nil
}
