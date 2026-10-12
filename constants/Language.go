package constants

import (
	"strings"
)

type Language string

const (
	LanguageTR   Language = "TR"
	LanguageEN   Language = "EN"
	LanguageDE   Language = "DE"
	LanguageFR   Language = "FR"
	LanguageRU   Language = "RU"
	LanguageAR   Language = "AR"
	LanguageNE   Language = "NE"    // Nepali
	LanguageTH   Language = "TH"    // Thai
	LanguageZHCN Language = "ZH-CN" // Chinese (Simplified, China)
	LanguageZHTW Language = "ZH-TW" // Chinese (Traditional, Taiwan)
)

// SupportedLanguages returns a new slice so callers cannot change the supported set.
func SupportedLanguages() []Language {
	return []Language{
		LanguageTR, LanguageEN, LanguageDE, LanguageFR, LanguageRU,
		LanguageAR, LanguageNE, LanguageTH, LanguageZHCN, LanguageZHTW,
	}
}

func (l Language) IsValid() bool {
	switch l {
	case LanguageTR, LanguageEN, LanguageDE, LanguageFR, LanguageRU,
		LanguageAR, LanguageNE, LanguageTH, LanguageZHCN, LanguageZHTW:
		return true
	default:
		return false
	}
}

func ParseLanguage(value string) (Language, error) {
	language := Language(strings.ToUpper(strings.TrimSpace(value)))
	if !language.IsValid() {
		return "", ErrLanguage
	}
	return language, nil
}
