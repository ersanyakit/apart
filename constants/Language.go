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
	LanguageHI   Language = "HI"    // Hindi
	LanguageKM   Language = "KM"    // Khmer
	LanguageSI   Language = "SI"    // Sinhala
	LanguageTA   Language = "TA"    // Tamil
	LanguageYUE  Language = "YUE"   // Cantonese
	LanguageUR   Language = "UR"    // Urdu
	LanguageBN   Language = "BN"    // Bengali
	LanguageDZ   Language = "DZ"    // Dzongkha
	LanguageES   Language = "ES"    // Spanish
	LanguageIT   Language = "IT"    // Italian
	LanguagePT   Language = "PT"    // Portuguese
	LanguageNL   Language = "NL"    // Dutch
	LanguagePL   Language = "PL"    // Polish
	LanguageCS   Language = "CS"    // Czech
	LanguageHU   Language = "HU"    // Hungarian
	LanguageRO   Language = "RO"    // Romanian
	LanguageEL   Language = "EL"    // Greek
	LanguageUK   Language = "UK"    // Ukrainian
	LanguageBG   Language = "BG"    // Bulgarian
	LanguageSR   Language = "SR"    // Serbian
	LanguageHR   Language = "HR"    // Croatian
	LanguageSK   Language = "SK"    // Slovak
	LanguageSL   Language = "SL"    // Slovenian
	LanguageFI   Language = "FI"    // Finnish
	LanguageSV   Language = "SV"    // Swedish
	LanguageDA   Language = "DA"    // Danish
	LanguageNO   Language = "NO"    // Norwegian
	LanguageMS   Language = "MS"    // Malay
	LanguageID   Language = "ID"    // Indonesian
	LanguageVI   Language = "VI"    // Vietnamese
	LanguageJA   Language = "JA"    // Japanese
	LanguageKO   Language = "KO"    // Korean
	LanguageFA   Language = "FA"    // Persian
	LanguageHE   Language = "HE"    // Hebrew
	LanguageSW   Language = "SW"    // Swahili
	LanguageAM   Language = "AM"    // Amharic
	LanguageMR   Language = "MR"    // Marathi
	LanguagePA   Language = "PA"    // Punjabi
	LanguageTE   Language = "TE"    // Telugu
	LanguageMY   Language = "MY"    // Burmese
	LanguageLO   Language = "LO"    // Lao
	LanguageKA   Language = "KA"    // Georgian
	LanguageHY   Language = "HY"    // Armenian
	LanguageAZ   Language = "AZ"    // Azerbaijani
	LanguageKK   Language = "KK"    // Kazakh
	LanguageUZ   Language = "UZ"    // Uzbek
	LanguageKY   Language = "KY"    // Kyrgyz
	LanguageMN   Language = "MN"    // Mongolian
	LanguagePS   Language = "PS"    // Pashto
	LanguageKU   Language = "KU"    // Kurdish
)

// SupportedLanguages returns a new slice so callers cannot change the supported set.
func SupportedLanguages() []Language {
	return []Language{
		LanguageTR, LanguageEN, LanguageDE, LanguageFR, LanguageRU,
		LanguageAR, LanguageNE, LanguageTH, LanguageZHCN, LanguageZHTW,
		LanguageHI, LanguageKM, LanguageSI, LanguageTA, LanguageYUE,
		LanguageUR, LanguageBN, LanguageDZ, LanguageES, LanguageIT,
		LanguagePT, LanguageNL, LanguagePL, LanguageCS, LanguageHU,
		LanguageRO, LanguageEL, LanguageUK, LanguageBG, LanguageSR,
		LanguageHR, LanguageSK, LanguageSL, LanguageFI, LanguageSV,
		LanguageDA, LanguageNO, LanguageMS, LanguageID, LanguageVI,
		LanguageJA, LanguageKO, LanguageFA, LanguageHE, LanguageSW,
		LanguageAM, LanguageMR, LanguagePA, LanguageTE, LanguageMY,
		LanguageLO, LanguageKA, LanguageHY, LanguageAZ, LanguageKK,
		LanguageUZ, LanguageKY, LanguageMN, LanguagePS, LanguageKU,
	}
}

func (l Language) IsValid() bool {
	switch l {
	case LanguageTR, LanguageEN, LanguageDE, LanguageFR, LanguageRU,
		LanguageAR, LanguageNE, LanguageTH, LanguageZHCN, LanguageZHTW,
		LanguageHI, LanguageKM, LanguageSI, LanguageTA, LanguageYUE,
		LanguageUR, LanguageBN, LanguageDZ, LanguageES, LanguageIT,
		LanguagePT, LanguageNL, LanguagePL, LanguageCS, LanguageHU,
		LanguageRO, LanguageEL, LanguageUK, LanguageBG, LanguageSR,
		LanguageHR, LanguageSK, LanguageSL, LanguageFI, LanguageSV,
		LanguageDA, LanguageNO, LanguageMS, LanguageID, LanguageVI,
		LanguageJA, LanguageKO, LanguageFA, LanguageHE, LanguageSW,
		LanguageAM, LanguageMR, LanguagePA, LanguageTE, LanguageMY,
		LanguageLO, LanguageKA, LanguageHY, LanguageAZ, LanguageKK,
		LanguageUZ, LanguageKY, LanguageMN, LanguagePS, LanguageKU:
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
